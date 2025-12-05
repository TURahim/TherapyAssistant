'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/hooks/useSessions';
import { useGeneration } from '@/lib/hooks/useGeneration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { SessionUploader } from '@/components/therapist/SessionUploader';
import { TranscriptPreview } from '@/components/therapist/TranscriptPreview';
import { GenerationProgress } from '@/components/therapist/GenerationProgress';
import { CrisisModal } from '@/components/therapist/CrisisModal';
import { SessionSummaryCard } from '@/components/therapist/SessionSummaryCard';
import { SessionSummaryEditor } from '@/components/therapist/SessionSummaryEditor';
import { formatDate, formatTime, formatDuration } from '@/lib/utils/dates';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Play,
  CheckCircle,
  X,
  AlertTriangle,
  FileText,
  MessageSquare,
  Sparkles,
  Edit,
  Wand2,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

const statusConfig = {
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
};

const crisisConfig = {
  NONE: null,
  LOW: { label: 'Low Risk', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  MEDIUM: { label: 'Medium Risk', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  HIGH: { label: 'High Risk', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CRITICAL: { label: 'Critical', className: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
};

export default function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
  const [summaryEditorOpen, setSummaryEditorOpen] = useState(false);
  const [summaryEditorType, setSummaryEditorType] = useState<'therapist' | 'client'>('therapist');
  
  const {
    session,
    isLoading,
    error,
    refresh,
    startSession,
    completeSession,
    cancelSession,
  } = useSession(sessionId);

  const {
    isGenerating,
    progress,
    result,
    crisisInfo,
    generate,
    reset: resetGeneration,
    abort: abortGeneration,
  } = useGeneration({
    onComplete: (result) => {
      toast({
        title: 'Plan Generated',
        description: `Treatment plan v${result.versionNumber} has been created successfully.`,
      });
      refresh();
      if (result.planId) {
        // Navigate to plan after a short delay
        setTimeout(() => {
          router.push(`/plans/${result.planId}`);
        }, 1500);
      }
    },
    onCrisisDetected: () => {
      setShowCrisisModal(true);
    },
    onError: (error) => {
      toast({
        title: 'Generation Failed',
        description: error,
        variant: 'destructive',
      });
    },
  });

  const handleStart = async () => {
    const success = await startSession();
    if (success) {
      toast({ title: 'Session started', description: 'The session is now in progress.' });
    }
  };

  const handleComplete = async () => {
    const success = await completeSession();
    if (success) {
      toast({ title: 'Session completed', description: 'The session has been marked as complete.' });
    }
  };

  const handleCancel = async () => {
    const success = await cancelSession();
    if (success) {
      toast({ title: 'Session cancelled', description: 'The session has been cancelled.' });
    }
  };

  const handleGeneratePlan = async () => {
    if (!session?.transcript) {
      toast({
        title: 'No transcript',
        description: 'Please add a transcript before generating a treatment plan.',
        variant: 'destructive',
      });
      return;
    }

    await generate(sessionId, session.transcript, session.latestPlanId || undefined);
  };

  const handleCrisisAcknowledged = () => {
    setShowCrisisModal(false);
    refresh();
  };

  // Summary handlers
  const handleRegenerateSummary = useCallback(async (type: 'therapist' | 'client' | 'both') => {
    setIsRegeneratingSummary(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      toast({
        title: 'Summary Generated',
        description: type === 'both' 
          ? 'Both summaries have been generated.' 
          : `${type === 'therapist' ? 'Therapist' : 'Client'} summary has been regenerated.`,
      });
      refresh();
    } catch (err) {
      toast({
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Failed to generate summary',
        variant: 'destructive',
      });
    } finally {
      setIsRegeneratingSummary(false);
    }
  }, [sessionId, toast, refresh]);

  const handleEditSummary = useCallback((type: 'therapist' | 'client') => {
    setSummaryEditorType(type);
    setSummaryEditorOpen(true);
  }, []);

  const handleSaveSummary = useCallback(async (summary: string, keyTopics?: string[]) => {
    const response = await fetch(`/api/sessions/${sessionId}/summary`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: summaryEditorType,
        summary,
        keyTopics,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save summary');
    }

    toast({
      title: 'Summary Saved',
      description: `${summaryEditorType === 'therapist' ? 'Therapist' : 'Client'} summary has been updated.`,
    });
    refresh();
  }, [sessionId, summaryEditorType, toast, refresh]);

  if (isLoading) {
    return <FullPageSpinner label="Loading session..." />;
  }

  if (error || !session) {
    return (
      <ErrorFallback
        error={new Error(error || 'Session not found')}
        onReset={refresh}
        title="Failed to load session"
      />
    );
  }

  const status = statusConfig[session.status as keyof typeof statusConfig];
  const crisis = crisisConfig[session.crisisSeverity as keyof typeof crisisConfig];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/clients/${session.clientId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {session.clientName}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Session #{session.sessionNumber}
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            {crisis && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${crisis.className}`}>
                <AlertTriangle className="h-3 w-3" />
                {crisis.label}
              </span>
            )}
          </div>
          <Link
            href={`/clients/${session.clientId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {session.clientName}
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {session.status === 'SCHEDULED' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleStart}>
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </>
          )}
          {session.status === 'IN_PROGRESS' && (
            <Button onClick={handleComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Session
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Scheduled</span>
            </div>
            <p className="font-medium mt-1">{formatDate(session.scheduledAt)}</p>
            <p className="text-sm text-muted-foreground">{formatTime(session.scheduledAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Duration</span>
            </div>
            <p className="font-medium mt-1">
              {session.durationMinutes ? formatDuration(session.durationMinutes * 60) : 'Not set'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Transcript</span>
            </div>
            <p className="font-medium mt-1">
              {session.transcript ? 'Available' : 'Not added'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Treatment Plan</span>
            </div>
            <p className="font-medium mt-1">
              {session.hasGeneratedPlan ? (
                <Link href={`/plans/${session.latestPlanId}`} className="text-primary hover:underline">
                  View Plan
                </Link>
              ) : (
                'Not generated'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Generation Progress */}
      {(isGenerating || progress.stage !== 'idle') && (
        <GenerationProgress
          progress={progress}
          onCancel={abortGeneration}
        />
      )}

      {/* Generate Plan Button */}
      {session.transcript && !isGenerating && progress.stage === 'idle' && !session.hasGeneratedPlan && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Ready to Generate Treatment Plan</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI will analyze the transcript and generate a comprehensive treatment plan.
                </p>
              </div>
              <Button onClick={handleGeneratePlan} size="lg">
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue={session.transcript ? 'transcript' : 'upload'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">
            <Sparkles className="h-4 w-4 mr-2" />
            Add/Edit Transcript
          </TabsTrigger>
          {session.transcript && (
            <TabsTrigger value="transcript">
              <MessageSquare className="h-4 w-4 mr-2" />
              View Transcript
            </TabsTrigger>
          )}
          {session.transcript && (
            <TabsTrigger value="summary">
              <FileText className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          )}
          <TabsTrigger value="notes">
            <Edit className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <SessionUploader
            sessionId={sessionId}
            existingTranscript={session.transcript}
            onTranscriptSaved={refresh}
            onGeneratePlan={session.transcript && !isGenerating ? handleGeneratePlan : undefined}
            disabled={session.status === 'CANCELLED' || isGenerating}
          />
        </TabsContent>

        {/* Transcript View Tab */}
        {session.transcript && (
          <TabsContent value="transcript">
            <TranscriptPreview transcript={session.transcript} />
          </TabsContent>
        )}

        {/* Summary Tab */}
        <TabsContent value="summary">
          <SessionSummaryCard
            sessionId={sessionId}
            sessionNumber={session.sessionNumber}
            therapistSummary={session.summary?.therapistSummary || null}
            clientSummary={session.summary?.clientSummary || null}
            keyTopics={session.summary?.keyTopics || []}
            isEdited={session.summary?.isEdited || false}
            editedAt={session.summary?.editedAt ? new Date(session.summary.editedAt) : null}
            generatedAt={session.summary?.generatedAt ? new Date(session.summary.generatedAt) : null}
            onRegenerate={handleRegenerateSummary}
            onEdit={handleEditSummary}
            isRegenerating={isRegeneratingSummary}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Session Notes</CardTitle>
              <CardDescription>Private notes visible only to you</CardDescription>
            </CardHeader>
            <CardContent>
              {session.notes ? (
                <p className="whitespace-pre-wrap">{session.notes}</p>
              ) : (
                <p className="text-muted-foreground">No notes added yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Crisis Modal */}
      {crisisInfo && (
        <CrisisModal
          isOpen={showCrisisModal}
          onClose={() => setShowCrisisModal(false)}
          severity={crisisInfo.severity}
          indicators={crisisInfo.indicators || []}
          recommendedActions={crisisInfo.recommendedActions}
          onAcknowledge={(notes) => {
            console.log('Crisis acknowledged with notes:', notes);
            handleCrisisAcknowledged();
          }}
          clientName={session.clientName}
        />
      )}

      {/* Summary Editor Modal */}
      {session.summary && (
        <SessionSummaryEditor
          isOpen={summaryEditorOpen}
          onClose={() => setSummaryEditorOpen(false)}
          type={summaryEditorType}
          sessionNumber={session.sessionNumber}
          initialSummary={
            summaryEditorType === 'therapist'
              ? session.summary.therapistSummary
              : session.summary.clientSummary
          }
          initialKeyTopics={session.summary.keyTopics}
          onSave={handleSaveSummary}
          onRegenerate={async () => {
            await handleRegenerateSummary(summaryEditorType);
            // Return the new summary text
            const response = await fetch(`/api/sessions/${sessionId}/summary`);
            if (response.ok) {
              const data = await response.json();
              return summaryEditorType === 'therapist'
                ? data.summary?.therapistSummary || ''
                : data.summary?.clientSummary || '';
            }
            return '';
          }}
        />
      )}
    </div>
  );
}

