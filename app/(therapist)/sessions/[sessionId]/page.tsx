'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { SessionUploader } from '@/components/therapist/SessionUploader';
import { TranscriptPreview } from '@/components/therapist/TranscriptPreview';
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
  const {
    session,
    isLoading,
    error,
    refresh,
    startSession,
    completeSession,
    cancelSession,
  } = useSession(sessionId);

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

  const handleGeneratePlan = () => {
    // Will be implemented in PR #11
    toast({
      title: 'Coming soon',
      description: 'Treatment plan generation will be available in a future update.',
    });
  };

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
          {session.summary && (
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
            onGeneratePlan={session.transcript ? handleGeneratePlan : undefined}
            disabled={session.status === 'CANCELLED'}
          />
        </TabsContent>

        {/* Transcript View Tab */}
        {session.transcript && (
          <TabsContent value="transcript">
            <TranscriptPreview transcript={session.transcript} />
          </TabsContent>
        )}

        {/* Summary Tab */}
        {session.summary && (
          <TabsContent value="summary">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Therapist Summary</CardTitle>
                  <CardDescription>Clinical summary for your records</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{session.summary.therapistSummary}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Summary</CardTitle>
                  <CardDescription>Friendly summary shared with client</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{session.summary.clientSummary}</p>
                </CardContent>
              </Card>

              {session.summary.keyTopics && session.summary.keyTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {session.summary.keyTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

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
    </div>
  );
}

