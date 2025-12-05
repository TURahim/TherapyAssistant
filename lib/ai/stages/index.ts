/**
 * AI Pipeline Stages Index
 * 
 * This module exports all pipeline stage implementations.
 * Each stage is responsible for a specific part of the AI processing pipeline.
 * 
 * Pipeline Flow:
 * 1. Preprocessing - Clean and chunk transcript
 * 2. Crisis Check - Detect safety concerns
 * 3. Extraction - Extract clinical information
 * 4. Therapist View - Generate therapist-facing content
 * 5. Client View - Generate client-facing content
 * 6. Summary - Generate session summaries
 * 
 * Each stage module exports:
 * - A main processing function
 * - Any helper utilities specific to that stage
 * - Type definitions for stage inputs/outputs
 */

// =============================================================================
// STAGE EXPORTS
// =============================================================================

// Stage 1: Preprocessing
export {
  preprocessTranscript,
  cleanTranscript,
  identifySpeakers,
  chunkTranscript,
  extractMetadata,
  parseSpeakerTurns,
  getPreprocessingSummary,
} from './preprocessing';

// Stage 2: Crisis Classification
export {
  classifyCrisis,
  quickCrisisCheck,
  getSeverityLabel,
  getSeverityColor,
} from './crisisClassifier';

// Stage 3: Canonical Extraction
export {
  extractCanonicalPlan,
  createNewPlanFromExtraction,
  getExtractionSummary,
  type ExtractionInput,
  type ExtractionResult,
} from './canonicalExtraction';

// Stage 4A: Therapist View Generation
export {
  generateTherapistView,
  formatRiskLevel,
  formatGoalStatus,
  formatDiagnosisStatus,
  determinePlanStatus,
  generateProgressSummary,
  type TherapistViewInput,
  type TherapistViewResult,
} from './therapistViewGen';

// Stage 4B: Client View Generation
export {
  generateClientView,
  validateClientViewReadingLevel,
  simplifyClientView,
  generateGreeting,
  getCelebrationMessage,
  type ClientViewInput,
  type ClientViewResult,
} from './clientViewGen';

// =============================================================================
// STAGE TYPES
// =============================================================================

import type { StageResult } from '../types';

/**
 * Base interface for all pipeline stages
 */
export interface PipelineStageHandler<TInput, TOutput> {
  name: string;
  execute(input: TInput): Promise<StageResult<TOutput>>;
}

/**
 * Stage configuration options
 */
export interface StageConfig {
  maxRetries: number;
  timeout: number;
  debug: boolean;
}

/**
 * Default stage configuration
 */
export const DEFAULT_STAGE_CONFIG: StageConfig = {
  maxRetries: 3,
  timeout: 60000,
  debug: process.env.NODE_ENV === 'development',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a stage handler with standard error handling
 */
export function createStageHandler<TInput, TOutput>(
  name: string,
  handler: (input: TInput) => Promise<TOutput>,
  config: StageConfig = DEFAULT_STAGE_CONFIG
): PipelineStageHandler<TInput, TOutput> {
  return {
    name,
    async execute(input: TInput): Promise<StageResult<TOutput>> {
      const startTime = Date.now();
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        try {
          const result = await Promise.race([
            handler(input),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Stage timeout')), config.timeout)
            ),
          ]);
          
          return {
            success: true,
            data: result,
            durationMs: Date.now() - startTime,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (config.debug) {
            console.error(`[${name}] Attempt ${attempt} failed:`, lastError.message);
          }
          
          if (attempt < config.maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
      
      return {
        success: false,
        error: lastError?.message || 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    },
  };
}

/**
 * Log stage execution (for debugging)
 */
export function logStageExecution<T>(
  stageName: string,
  result: StageResult<T>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Pipeline] ${stageName}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.durationMs}ms)`);
    if (!result.success && result.error) {
      console.error(`[Pipeline] ${stageName} Error:`, result.error);
    }
  }
}
