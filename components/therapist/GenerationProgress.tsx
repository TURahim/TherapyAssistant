'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PipelineStageIndicator } from './PipelineStageIndicator';
import type { GenerationProgress as GenerationProgressType, PipelineStage } from '@/lib/hooks/useGeneration';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  X 
} from 'lucide-react';

interface GenerationProgressProps {
  progress: GenerationProgressType;
  onCancel?: () => void;
  showStages?: boolean;
  compact?: boolean;
}

export function GenerationProgress({
  progress,
  onCancel,
  showStages = true,
  compact = false,
}: GenerationProgressProps) {
  const { stage, progress: stageProgress, overallProgress, message } = progress;

  const isComplete = stage === 'complete';
  const isError = stage === 'error';
  const isCrisis = stage === 'crisis_halt';
  const isIdle = stage === 'idle';
  const isGenerating = !isComplete && !isError && !isCrisis && !isIdle;

  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (isError) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    if (isCrisis) {
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
    if (isGenerating) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
    return null;
  };

  const getStatusColor = () => {
    if (isComplete) return 'text-green-600';
    if (isError) return 'text-red-600';
    if (isCrisis) return 'text-amber-600';
    if (isGenerating) return 'text-blue-600';
    return 'text-gray-500';
  };

  const getProgressColor = () => {
    if (isComplete) return 'bg-green-600';
    if (isError) return 'bg-red-600';
    if (isCrisis) return 'bg-amber-600';
    return 'bg-blue-600';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {message}
            </span>
            {isGenerating && (
              <span className="text-xs text-gray-500">
                {overallProgress}%
              </span>
            )}
          </div>
          {isGenerating && (
            <Progress 
              value={overallProgress} 
              className="h-1.5"
            />
          )}
        </div>
        {isGenerating && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">
              {isIdle ? 'Generate Treatment Plan' : 'Generating Treatment Plan'}
            </CardTitle>
          </div>
          {isGenerating && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {message}
            </span>
            {isGenerating && (
              <span className="text-sm text-gray-500">
                {overallProgress}%
              </span>
            )}
          </div>
          <Progress 
            value={overallProgress} 
            className={`h-2 ${getProgressColor()}`}
          />
        </div>

        {/* Stage Indicators */}
        {showStages && !isIdle && (
          <PipelineStageIndicator 
            currentStage={stage}
            stageProgress={stageProgress}
          />
        )}

        {/* Status Messages */}
        {isComplete && (
          <div className="rounded-md bg-green-50 p-3 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                Treatment plan generated successfully!
              </p>
            </div>
          </div>
        )}

        {isError && (
          <div className="rounded-md bg-red-50 p-3 border border-red-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                {message}
              </p>
            </div>
          </div>
        )}

        {isCrisis && (
          <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Crisis indicators detected
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Plan generation has been paused. Please review the transcript immediately.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GenerationProgress;

