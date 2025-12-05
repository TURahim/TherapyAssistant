'use client';

import { useState } from 'react';
import { TranscriptInput } from './TranscriptInput';
import { TranscriptPreview } from './TranscriptPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIDisclaimer } from '@/components/shared/Disclaimer';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Save,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface SessionUploaderProps {
  sessionId: string;
  existingTranscript?: string | null;
  onTranscriptSaved?: (transcript: string) => void;
  onGeneratePlan?: () => void;
  disabled?: boolean;
}

export function SessionUploader({
  sessionId,
  existingTranscript,
  onTranscriptSaved,
  onGeneratePlan,
  disabled = false,
}: SessionUploaderProps) {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState(existingTranscript || '');
  const [source, setSource] = useState<'paste' | 'upload'>('paste');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleTranscriptChange = (newTranscript: string, newSource: 'paste' | 'upload') => {
    setTranscript(newTranscript);
    setSource(newSource);
    setHasUnsavedChanges(newTranscript !== existingTranscript);
  };

  const handleSave = async () => {
    if (!transcript.trim()) {
      toast({
        title: 'No transcript',
        description: 'Please enter or upload a transcript first.',
        variant: 'destructive',
      });
      return;
    }

    if (transcript.trim().length < 100) {
      toast({
        title: 'Transcript too short',
        description: 'Please provide a more complete transcript (at least 100 characters).',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addTranscript',
          transcript,
          source,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transcript');
      }

      toast({
        title: 'Transcript saved',
        description: 'The transcript has been saved successfully.',
      });

      setHasUnsavedChanges(false);
      onTranscriptSaved?.(transcript);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save transcript',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isValidTranscript = transcript.trim().length >= 100;

  return (
    <div className="space-y-6">
      {/* AI Disclaimer */}
      <AIDisclaimer />

      {/* Transcript Input */}
      <Card>
        <CardHeader>
          <CardTitle>Session Transcript</CardTitle>
          <CardDescription>
            Enter or upload the session transcript for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TranscriptInput
            onTranscriptChange={handleTranscriptChange}
            disabled={disabled || isSaving}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      {transcript && (
        <TranscriptPreview transcript={transcript} />
      )}

      {/* Validation Warning */}
      {transcript && !isValidTranscript && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            Transcript is too short. Please provide a more complete transcript for accurate AI analysis.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={disabled || isSaving || !transcript.trim()}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {hasUnsavedChanges ? 'Save Changes' : 'Save Transcript'}
        </Button>

        {onGeneratePlan && (
          <Button
            onClick={onGeneratePlan}
            disabled={disabled || !isValidTranscript || hasUnsavedChanges}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Treatment Plan
          </Button>
        )}
      </div>

      {/* Help text */}
      {!existingTranscript && !transcript && (
        <p className="text-sm text-muted-foreground text-center">
          Paste your session notes or upload a transcript file to begin AI-assisted treatment planning.
        </p>
      )}
    </div>
  );
}

