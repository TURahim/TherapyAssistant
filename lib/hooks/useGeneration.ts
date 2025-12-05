'use client';

import { useState, useCallback, useRef } from 'react';
import type { CrisisSeverity } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export type PipelineStage =
  | 'idle'
  | 'preprocessing'
  | 'crisis_check'
  | 'extraction'
  | 'therapist_view'
  | 'client_view'
  | 'summary'
  | 'saving'
  | 'complete'
  | 'error'
  | 'crisis_halt';

export interface GenerationProgress {
  stage: PipelineStage;
  progress: number; // 0-100 for current stage
  overallProgress: number; // 0-100 for entire pipeline
  message: string;
  estimatedTimeRemaining?: number;
}

export interface GenerationResult {
  success: boolean;
  planId?: string;
  versionNumber?: number;
  crisisDetected: boolean;
  crisisSeverity?: CrisisSeverity;
  warnings: string[];
  errors: string[];
  processingTime: number;
}

export interface CrisisInfo {
  severity: CrisisSeverity;
  message: string;
  indicators?: Array<{
    type: string;
    quote: string;
    severity: CrisisSeverity;
  }>;
  recommendedActions: string[];
}

// =============================================================================
// STAGE CONFIG
// =============================================================================

const STAGE_CONFIG: Record<PipelineStage, { weight: number; label: string }> = {
  idle: { weight: 0, label: 'Ready' },
  preprocessing: { weight: 10, label: 'Preparing transcript...' },
  crisis_check: { weight: 15, label: 'Checking for safety concerns...' },
  extraction: { weight: 30, label: 'Extracting clinical information...' },
  therapist_view: { weight: 20, label: 'Generating therapist view...' },
  client_view: { weight: 15, label: 'Generating client view...' },
  summary: { weight: 5, label: 'Creating summary...' },
  saving: { weight: 5, label: 'Saving plan...' },
  complete: { weight: 0, label: 'Complete!' },
  error: { weight: 0, label: 'Error occurred' },
  crisis_halt: { weight: 0, label: 'Crisis detected - Review required' },
};

const STAGE_ORDER: PipelineStage[] = [
  'preprocessing',
  'crisis_check',
  'extraction',
  'therapist_view',
  'client_view',
  'summary',
  'saving',
  'complete',
];

function calculateOverallProgress(stage: PipelineStage, stageProgress: number): number {
  const stageIndex = STAGE_ORDER.indexOf(stage);
  if (stageIndex === -1) return 0;

  // Calculate progress up to current stage
  let completedProgress = 0;
  for (let i = 0; i < stageIndex; i++) {
    completedProgress += STAGE_CONFIG[STAGE_ORDER[i]].weight;
  }

  // Add current stage progress
  const currentStageWeight = STAGE_CONFIG[stage].weight;
  const currentStageProgress = (stageProgress / 100) * currentStageWeight;

  return Math.round(completedProgress + currentStageProgress);
}

// =============================================================================
// HOOK
// =============================================================================

interface UseGenerationOptions {
  onComplete?: (result: GenerationResult) => void;
  onCrisisDetected?: (crisis: CrisisInfo) => void;
  onError?: (error: string) => void;
}

interface UseGenerationReturn {
  isGenerating: boolean;
  progress: GenerationProgress;
  result: GenerationResult | null;
  crisisInfo: CrisisInfo | null;
  generate: (sessionId: string, transcript: string, planId?: string) => Promise<GenerationResult | null>;
  reset: () => void;
  abort: () => void;
}

export function useGeneration(options: UseGenerationOptions = {}): UseGenerationReturn {
  const { onComplete, onCrisisDetected, onError } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    progress: 0,
    overallProgress: 0,
    message: 'Ready to generate',
  });
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [crisisInfo, setCrisisInfo] = useState<CrisisInfo | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateProgress = useCallback((stage: PipelineStage, stageProgress: number = 0, message?: string) => {
    setProgress({
      stage,
      progress: stageProgress,
      overallProgress: calculateOverallProgress(stage, stageProgress),
      message: message || STAGE_CONFIG[stage].label,
    });
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress({
      stage: 'idle',
      progress: 0,
      overallProgress: 0,
      message: 'Ready to generate',
    });
    setResult(null);
    setCrisisInfo(null);
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsGenerating(false);
    updateProgress('idle', 0, 'Generation cancelled');
  }, [updateProgress]);

  const generate = useCallback(async (
    sessionId: string,
    transcript: string,
    planId?: string
  ): Promise<GenerationResult | null> => {
    // Reset state
    setIsGenerating(true);
    setResult(null);
    setCrisisInfo(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Start progress simulation while waiting for response
      updateProgress('preprocessing', 0);
      
      let currentStage = 0;
      pollIntervalRef.current = setInterval(() => {
        const stages = STAGE_ORDER.slice(0, -1); // Exclude 'complete'
        if (currentStage < stages.length) {
          const stage = stages[currentStage];
          const stageProgress = Math.min(100, (Date.now() % 2000) / 20); // Simulate progress
          updateProgress(stage, stageProgress);
          
          // Move to next stage every few seconds (simulation)
          if (stageProgress > 80 && Math.random() > 0.7) {
            currentStage++;
          }
        }
      }, 500);

      // Make the API request
      const response = await fetch(`/api/plans/${planId || 'new'}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, transcript }),
        signal: abortControllerRef.current.signal,
      });

      // Clear simulation
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      const data = await response.json();

      if (!response.ok && !data.crisisDetected) {
        throw new Error(data.error || 'Generation failed');
      }

      // Handle crisis detection
      if (data.crisisDetected) {
        const crisis: CrisisInfo = {
          severity: data.crisisSeverity,
          message: data.message || 'Crisis indicators detected in transcript',
          indicators: data.crisisIndicators,
          recommendedActions: data.recommendedActions || [
            'Review the transcript immediately',
            'Contact client if appropriate',
            'Document crisis response',
          ],
        };
        
        setCrisisInfo(crisis);
        updateProgress('crisis_halt', 100, 'Crisis detected - Review required');
        
        if (onCrisisDetected) {
          onCrisisDetected(crisis);
        }

        const crisisResult: GenerationResult = {
          success: false,
          planId: data.planId,
          crisisDetected: true,
          crisisSeverity: data.crisisSeverity,
          warnings: data.warnings || [],
          errors: data.errors || ['Pipeline halted due to crisis detection'],
          processingTime: data.processingTime || 0,
        };
        
        setResult(crisisResult);
        setIsGenerating(false);
        return crisisResult;
      }

      // Success
      updateProgress('complete', 100, 'Plan generated successfully!');

      const successResult: GenerationResult = {
        success: true,
        planId: data.planId,
        versionNumber: data.versionNumber,
        crisisDetected: false,
        warnings: data.warnings || [],
        errors: data.errors || [],
        processingTime: data.processingTime || 0,
      };

      setResult(successResult);
      setIsGenerating(false);

      if (onComplete) {
        onComplete(successResult);
      }

      return successResult;
    } catch (error) {
      // Clear simulation
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted - don't treat as error
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateProgress('error', 0, errorMessage);

      const errorResult: GenerationResult = {
        success: false,
        crisisDetected: false,
        warnings: [],
        errors: [errorMessage],
        processingTime: 0,
      };

      setResult(errorResult);
      setIsGenerating(false);

      if (onError) {
        onError(errorMessage);
      }

      return errorResult;
    }
  }, [updateProgress, onComplete, onCrisisDetected, onError]);

  return {
    isGenerating,
    progress,
    result,
    crisisInfo,
    generate,
    reset,
    abort,
  };
}

// =============================================================================
// HELPER EXPORTS
// =============================================================================

export { STAGE_CONFIG, STAGE_ORDER, calculateOverallProgress };

