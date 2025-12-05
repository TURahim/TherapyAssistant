'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Save,
  Loader2,
  Stethoscope,
  User,
  RotateCcw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface SessionSummaryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'therapist' | 'client';
  sessionNumber: number;
  initialSummary: string;
  initialKeyTopics?: string[];
  onSave: (summary: string, keyTopics?: string[]) => Promise<void>;
  onRegenerate?: () => Promise<string>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SessionSummaryEditor({
  isOpen,
  onClose,
  type,
  sessionNumber,
  initialSummary,
  initialKeyTopics = [],
  onSave,
  onRegenerate,
}: SessionSummaryEditorProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [keyTopics, setKeyTopics] = useState<string[]>(initialKeyTopics);
  const [newTopic, setNewTopic] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSummary(initialSummary);
      setKeyTopics(initialKeyTopics);
      setNewTopic('');
      setError(null);
      setHasChanges(false);
    }
  }, [isOpen, initialSummary, initialKeyTopics]);

  // Track changes
  useEffect(() => {
    const summaryChanged = summary !== initialSummary;
    const topicsChanged = JSON.stringify(keyTopics) !== JSON.stringify(initialKeyTopics);
    setHasChanges(summaryChanged || topicsChanged);
  }, [summary, keyTopics, initialSummary, initialKeyTopics]);

  const handleSave = async () => {
    if (!summary.trim()) {
      setError('Summary cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(summary, type === 'therapist' ? keyTopics : undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const newSummary = await onRegenerate();
      setSummary(newSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAddTopic = () => {
    if (newTopic.trim() && !keyTopics.includes(newTopic.trim())) {
      setKeyTopics([...keyTopics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setKeyTopics(keyTopics.filter(t => t !== topic));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTopic();
    }
  };

  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const isTherapist = type === 'therapist';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTherapist ? (
              <Stethoscope className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            Edit {isTherapist ? 'Therapist' : 'Client'} Summary
          </DialogTitle>
          <DialogDescription>
            Session {sessionNumber} • {isTherapist ? 'Clinical documentation' : 'Client-friendly recap'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Key Topics (Therapist only) */}
          {isTherapist && (
            <div className="space-y-2">
              <Label>Key Topics</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {keyTopics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="pr-1">
                    {topic}
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add topic..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTopic}
                  disabled={!newTopic.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Summary Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Summary</Label>
              <span className={cn(
                "text-xs",
                wordCount < 50 && "text-amber-500",
                wordCount >= 50 && wordCount <= 500 && "text-muted-foreground",
                wordCount > 500 && "text-amber-500"
              )}>
                {wordCount} words
              </span>
            </div>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={isTherapist
                ? "Enter clinical session summary..."
                : "Enter client-friendly summary..."
              }
              className={cn(
                "min-h-[300px] font-mono text-sm",
                isTherapist ? "bg-muted/30" : "bg-primary/5"
              )}
            />
            <p className="text-xs text-muted-foreground">
              {isTherapist
                ? "Use markdown formatting: ## for headers, **bold**, - for bullet points"
                : "Keep it warm and encouraging. Use simple language and bullet points."
              }
            </p>
          </div>

          {/* Guidelines */}
          <div className={cn(
            "p-3 rounded-lg text-sm",
            isTherapist ? "bg-blue-50 dark:bg-blue-950/30" : "bg-green-50 dark:bg-green-950/30"
          )}>
            <p className="font-medium mb-1">
              {isTherapist ? "Clinical Summary Guidelines:" : "Client Summary Guidelines:"}
            </p>
            {isTherapist ? (
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Include client presentation and emotional state</li>
                <li>• Document topics discussed and interventions used</li>
                <li>• Note progress toward treatment goals</li>
                <li>• List homework assigned and plans for next session</li>
              </ul>
            ) : (
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Use warm, encouraging language</li>
                <li>• Avoid clinical jargon and diagnostic terms</li>
                <li>• Highlight progress and positive insights</li>
                <li>• Include clear action items with checkboxes</li>
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex items-center gap-2 mr-auto">
            {hasChanges && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </span>
            )}
          </div>
          {onRegenerate && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerate}
              disabled={isRegenerating || isSaving}
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SessionSummaryEditor;

