'use client';

import { useRef, useState } from 'react';
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
  FileAudio,
  UploadCloud,
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
  const [source, setSource] = useState<'paste' | 'upload' | 'transcription'>('paste');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleTranscriptChange = (
    newTranscript: string,
    newSource: 'paste' | 'upload' | 'transcription'
  ) => {
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

  const handleAudioUpload = async (file: File) => {
    setAudioError(null);
    setAudioStatus(null);

    const allowedAudioTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/m4a',
    ];

    if (!allowedAudioTypes.includes(file.type)) {
      setAudioError('Unsupported audio format. Please upload MP3, WAV, WebM, OGG, or M4A.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setAudioError('File too large. Maximum size is 50MB.');
      return;
    }

    setIsUploadingAudio(true);
    setAudioStatus('Uploading audio...');
    setUploadedAudioName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || 'Upload failed');
      }

      setAudioStatus('Transcribing audio...');
      setIsTranscribing(true);

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: uploadJson.id }),
      });

      const transcribeJson = await transcribeRes.json();
      if (!transcribeRes.ok) {
        throw new Error(transcribeJson.error || 'Transcription failed');
      }

      const newTranscript = transcribeJson.transcript as string;
      setTranscript(newTranscript);
      setSource('transcription');
      setHasUnsavedChanges(true);
      setAudioStatus('Transcription complete. Review then save the transcript.');

      toast({
        title: 'Transcription ready',
        description: 'Audio was transcribed. Review and save before generating a plan.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audio upload/transcription failed';
      setAudioError(message);
      toast({
        title: 'Transcription failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAudio(false);
      setIsTranscribing(false);
    }
  };

  const handleAudioInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleAudioUpload(file);
    }
  };

  const isValidTranscript = transcript.trim().length >= 100;

  return (
    <div className="space-y-6">
      {/* AI Disclaimer */}
      <AIDisclaimer />

      {/* Audio Upload & Transcription */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Upload (Auto-Transcribe)</CardTitle>
          <CardDescription>
            Upload an audio recording to generate a transcript automatically. Files auto-delete after 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-dashed p-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <FileAudio className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Upload audio file</p>
                <p className="text-sm text-muted-foreground">
                  Accepted: MP3, WAV, WebM, OGG, M4A (max 50MB)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioInputChange}
                disabled={disabled || isUploadingAudio || isTranscribing}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => audioInputRef.current?.click()}
                disabled={disabled || isUploadingAudio || isTranscribing}
              >
                {isUploadingAudio || isTranscribing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4 mr-2" />
                )}
                {isTranscribing ? 'Transcribing...' : 'Select audio'}
              </Button>
            </div>
          </div>

          {uploadedAudioName && (
            <div className="text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{uploadedAudioName}</span>
            </div>
          )}

          {audioStatus && (
            <div className="text-sm text-foreground">{audioStatus}</div>
          )}

          {audioError && (
            <div className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {audioError}
            </div>
          )}
        </CardContent>
      </Card>

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
            disabled={disabled || isSaving || isTranscribing || isUploadingAudio}
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
          disabled={disabled || isSaving || isUploadingAudio || isTranscribing || !transcript.trim()}
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
            disabled={
              disabled ||
              isSaving ||
              isUploadingAudio ||
              isTranscribing ||
              !isValidTranscript ||
              hasUnsavedChanges
            }
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

