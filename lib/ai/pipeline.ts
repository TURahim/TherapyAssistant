import OpenAI from 'openai';
import type {
  PipelineContext,
  PipelineResult,
  PipelineProgress,
  PipelineStage,
  StageResult,
  TokenUsage,
  CanonicalPlan,
  TherapistView,
  ClientView,
  SessionSummaryOutput,
  PreprocessedTranscript,
  ExtractionOutput,
} from './types';
import { getModelConfig, isAIEnabled, calculateCost, LIMITS } from './config';
import { AIError } from '@/lib/utils/errors';
import type { CrisisCheckResult } from './schemas';

// Import stage implementations
import { preprocessTranscript } from './stages/preprocessing';
import { classifyCrisis } from './stages/crisisClassifier';
import { extractCanonicalPlan, createNewPlanFromExtraction } from './stages/canonicalExtraction';
import { generateTherapistView } from './stages/therapistViewGen';
import { generateClientView } from './stages/clientViewGen';

// =============================================================================
// OPENAI CLIENT
// =============================================================================

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new AIError('OpenAI API key not configured');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// =============================================================================
// PIPELINE ORCHESTRATOR
// =============================================================================

export class TreatmentPlanPipeline {
  private context: PipelineContext;
  private tokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };
  private warnings: string[] = [];
  private errors: string[] = [];
  private onProgress?: (progress: PipelineProgress) => void;
  private aborted = false;
  private openai: OpenAI;

  constructor(context: PipelineContext, onProgress?: (progress: PipelineProgress) => void) {
    this.context = context;
    this.onProgress = onProgress;
    this.openai = getOpenAIClient();
  }

  /**
   * Execute the full pipeline
   */
  async execute(): Promise<PipelineResult> {
    const startTime = Date.now();

    // Validate AI is enabled
    if (!isAIEnabled()) {
      return this.createErrorResult('AI features are not enabled. Configure OPENAI_API_KEY.');
    }

    // Validate transcript
    if (!this.validateTranscript()) {
      return this.createErrorResult('Transcript validation failed');
    }

    try {
      // Stage 1: Preprocessing
      this.reportProgress('preprocessing', 0, 'Preparing transcript...');
      const preprocessResult = await this.runPreprocessing();
      if (!preprocessResult.success || !preprocessResult.data) {
        return this.createErrorResult(`Preprocessing failed: ${preprocessResult.error}`);
      }
      this.reportProgress('preprocessing', 100, 'Transcript prepared');

      // Stage 2: Crisis Check
      this.reportProgress('crisis_check', 0, 'Checking for safety concerns...');
      const crisisResult = await this.runCrisisCheck(preprocessResult.data);
      if (!crisisResult.success || !crisisResult.data) {
        return this.createErrorResult(`Crisis check failed: ${crisisResult.error}`);
      }
      if (crisisResult.tokenUsage) {
        this.addTokenUsageInternal(crisisResult.tokenUsage);
      }
      this.reportProgress('crisis_check', 100, 'Safety check complete');

      // Handle crisis detection - halt pipeline if necessary
      if (crisisResult.data.shouldHalt) {
        return this.createCrisisResult(crisisResult.data);
      }

      // Stage 3: Canonical Extraction
      this.reportProgress('extraction', 0, 'Extracting clinical information...');
      const extractionResult = await this.runExtraction(preprocessResult.data);
      if (!extractionResult.success || !extractionResult.data) {
        return this.createErrorResult(`Extraction failed: ${extractionResult.error}`);
      }
      if (extractionResult.tokenUsage) {
        this.addTokenUsageInternal(extractionResult.tokenUsage);
      }
      // Add validation warnings
      if (extractionResult.data.validationWarnings) {
        this.warnings.push(...extractionResult.data.validationWarnings);
      }
      this.reportProgress('extraction', 100, 'Information extracted');

      // Stage 4: Build/Update Canonical Plan
      const canonicalPlan = this.buildCanonicalPlan(
        extractionResult.data.extraction,
        extractionResult.data.mergedPlan
      );

      // Stage 5: Generate Therapist View
      this.reportProgress('therapist_view', 0, 'Generating therapist view...');
      const therapistView = await this.runTherapistViewGeneration(canonicalPlan);
      if (!therapistView.success) {
        this.warnings.push(`Therapist view generation failed: ${therapistView.error}`);
      }
      this.reportProgress('therapist_view', 100, 'Therapist view ready');

      // Stage 6: Generate Client View
      this.reportProgress('client_view', 0, 'Generating client view...');
      const clientView = await this.runClientViewGeneration(canonicalPlan);
      if (!clientView.success) {
        this.warnings.push(`Client view generation failed: ${clientView.error}`);
      }
      this.reportProgress('client_view', 100, 'Client view ready');

      // Stage 7: Generate Summary
      this.reportProgress('summary', 0, 'Generating session summary...');
      const summary = await this.runSummaryGeneration();
      if (!summary.success) {
        this.warnings.push(`Summary generation failed: ${summary.error}`);
      }
      this.reportProgress('summary', 100, 'Summary complete');

      // Stage 8: Save Results
      this.reportProgress('saving', 0, 'Saving treatment plan...');
      const saveResult = await this.savePlanToDatabase(
        canonicalPlan,
        therapistView.data,
        clientView.data,
        summary.data,
        crisisResult.data
      );
      this.reportProgress('saving', 100, 'Plan saved');

      this.reportProgress('complete', 100, 'Pipeline complete');

      return {
        success: true,
        planId: saveResult.planId,
        versionNumber: saveResult.versionNumber,
        crisisDetected: crisisResult.data.isCrisis,
        crisisSeverity: crisisResult.data.severity,
        warnings: this.warnings,
        errors: this.errors,
        processingTime: Date.now() - startTime,
        tokenUsage: this.tokenUsage,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(message);
    }
  }

  /**
   * Abort the pipeline execution
   */
  abort(): void {
    this.aborted = true;
  }

  // ===========================================================================
  // STAGE IMPLEMENTATIONS
  // ===========================================================================

  private validateTranscript(): boolean {
    const { transcript } = this.context;
    
    if (!transcript || transcript.length < LIMITS.minTranscriptLength) {
      this.errors.push('Transcript is too short');
      return false;
    }
    
    if (transcript.length > LIMITS.maxTranscriptLength) {
      this.errors.push('Transcript exceeds maximum length');
      return false;
    }
    
    return true;
  }

  /**
   * Stage 1: Preprocessing - Clean and structure transcript
   */
  private async runPreprocessing(): Promise<StageResult<PreprocessedTranscript>> {
    return preprocessTranscript(this.context.transcript);
  }

  /**
   * Stage 2: Crisis Check - Detect safety concerns
   */
  private async runCrisisCheck(preprocessed: PreprocessedTranscript): Promise<StageResult<CrisisCheckResult>> {
    // Use the cleaned/chunked transcript for crisis analysis
    const transcriptText = preprocessed.chunks.map(c => c.text).join('\n\n');
    return classifyCrisis(transcriptText, this.openai);
  }

  /**
   * Stage 3: Extraction - Extract clinical information
   */
  private async runExtraction(preprocessed: PreprocessedTranscript): Promise<StageResult<{
    extraction: ExtractionOutput;
    mergedPlan?: CanonicalPlan;
    isNewPlan: boolean;
    validationWarnings: string[];
  }>> {
    const transcriptText = preprocessed.chunks.map(c => c.text).join('\n\n');
    
    return extractCanonicalPlan({
      transcript: transcriptText,
      sessionId: this.context.sessionId,
      sessionNumber: this.getSessionNumber(),
      existingPlan: this.context.existingPlan,
      preferences: this.context.preferences,
    }, this.openai);
  }

  /**
   * Build or use merged canonical plan
   */
  private buildCanonicalPlan(
    extraction: ExtractionOutput,
    mergedPlan?: CanonicalPlan
  ): CanonicalPlan {
    // If we have a merged plan from extraction, use it
    if (mergedPlan) {
      return mergedPlan;
    }

    // If there's an existing plan but no merge was done, create simple merge
    if (this.context.existingPlan) {
      const now = new Date().toISOString();
      return {
        ...this.context.existingPlan,
        updatedAt: now,
        version: this.context.existingPlan.version + 1,
        sessionReferences: [
          ...this.context.existingPlan.sessionReferences,
          {
            sessionId: this.context.sessionId,
            sessionNumber: this.getSessionNumber(),
            date: now,
            keyContributions: ['Session processed'],
          },
        ],
      };
    }

    // Create new plan from extraction
    return createNewPlanFromExtraction(
      this.context.clientId,
      this.context.sessionId,
      extraction
    );
  }

  /**
   * Get session number (from existing plan or default to 1)
   */
  private getSessionNumber(): number {
    if (this.context.existingPlan) {
      return this.context.existingPlan.sessionReferences.length + 1;
    }
    return 1;
  }

  /**
   * Stage 5: Therapist View Generation
   */
  private async runTherapistViewGeneration(canonicalPlan: CanonicalPlan): Promise<StageResult<TherapistView>> {
    const result = await generateTherapistView(
      {
        canonicalPlan,
        clientName: this.context.clientName || 'Client',
        includeIcdCodes: this.context.preferences?.includeIcdCodes ?? true,
        languageLevel: this.context.preferences?.languageLevel ?? 'professional',
        preferences: this.context.preferences,
      },
      this.openai
    );

    if (result.success && result.data) {
      if (result.tokenUsage) {
        this.addTokenUsageInternal(result.tokenUsage);
      }
      return {
        success: true,
        data: result.data.view,
        durationMs: result.durationMs,
        tokenUsage: result.tokenUsage,
      };
    }

    return {
      success: false,
      error: result.error || 'Therapist view generation failed',
      durationMs: result.durationMs,
      tokenUsage: result.tokenUsage,
    };
  }

  /**
   * Stage 6: Client View Generation
   */
  private async runClientViewGeneration(canonicalPlan: CanonicalPlan): Promise<StageResult<ClientView>> {
    const result = await generateClientView(
      {
        canonicalPlan,
        clientFirstName: this.context.clientFirstName || 'there',
        targetReadingLevel: 6,
        tone: 'warm',
      },
      this.openai
    );

    if (result.success && result.data) {
      if (result.tokenUsage) {
        this.addTokenUsageInternal(result.tokenUsage);
      }
      
      // Log reading level validation in development
      if (process.env.NODE_ENV === 'development' && result.data.readingLevelValidation) {
        const validation = result.data.readingLevelValidation;
        console.log(`[Pipeline] Client view reading level: ${validation.gradeLevel} (valid: ${validation.isValid})`);
        if (!validation.isValid) {
          console.warn('[Pipeline] Reading level issues:', validation.issues);
        }
      }
      
      return {
        success: true,
        data: result.data.view,
        durationMs: result.durationMs,
        tokenUsage: result.tokenUsage,
      };
    }

    return {
      success: false,
      error: result.error || 'Client view generation failed',
      durationMs: result.durationMs,
      tokenUsage: result.tokenUsage,
    };
  }

  /**
   * Stage 7: Summary Generation (Skeleton - PR #11)
   */
  private async runSummaryGeneration(): Promise<StageResult<SessionSummaryOutput>> {
    const startTime = Date.now();
    
    // Skeleton - full implementation in PR #11
    return {
      success: true,
      data: {
        therapistSummary: 'Session summary to be generated.',
        clientSummary: 'Session summary will appear here.',
        keyTopics: ['Session processing'],
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Stage 8: Save to Database (Skeleton - PR #12)
   */
  private async savePlanToDatabase(
    _canonicalPlan: CanonicalPlan,
    _therapistView: TherapistView | undefined,
    _clientView: ClientView | undefined,
    _summary: SessionSummaryOutput | undefined,
    _crisisResult: CrisisCheckResult
  ): Promise<{ planId: string; versionNumber: number }> {
    // Skeleton - full implementation in PR #12
    return {
      planId: `plan_${Date.now()}`,
      versionNumber: 1,
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private reportProgress(stage: PipelineStage, progress: number, message: string): void {
    if (this.onProgress && !this.aborted) {
      this.onProgress({ stage, progress, message });
    }
  }

  private createErrorResult(error: string): PipelineResult {
    this.errors.push(error);
    return {
      success: false,
      crisisDetected: false,
      warnings: this.warnings,
      errors: this.errors,
      processingTime: Date.now() - this.context.startTime,
      tokenUsage: this.tokenUsage,
    };
  }

  private createCrisisResult(crisisResult: CrisisCheckResult): PipelineResult {
    return {
      success: false,
      crisisDetected: true,
      crisisSeverity: crisisResult.severity,
      warnings: [
        'Pipeline halted due to crisis detection. Please review immediately.',
        ...this.warnings,
      ],
      errors: this.errors,
      processingTime: Date.now() - this.context.startTime,
      tokenUsage: this.tokenUsage,
    };
  }

  private addTokenUsageInternal(usage: TokenUsage): void {
    this.tokenUsage.promptTokens += usage.promptTokens;
    this.tokenUsage.completionTokens += usage.completionTokens;
    this.tokenUsage.totalTokens = this.tokenUsage.promptTokens + this.tokenUsage.completionTokens;
    this.tokenUsage.estimatedCost += usage.estimatedCost;
  }

  protected addTokenUsage(usage: { promptTokens: number; completionTokens: number }, model: string): void {
    this.tokenUsage.promptTokens += usage.promptTokens;
    this.tokenUsage.completionTokens += usage.completionTokens;
    this.tokenUsage.totalTokens = this.tokenUsage.promptTokens + this.tokenUsage.completionTokens;
    this.tokenUsage.estimatedCost = calculateCost(
      model as Parameters<typeof calculateCost>[0],
      this.tokenUsage.promptTokens,
      this.tokenUsage.completionTokens
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a new pipeline context
 */
export function createPipelineContext(params: {
  sessionId: string;
  clientId: string;
  therapistId: string;
  userId: string;
  transcript: string;
  existingPlan?: CanonicalPlan | null;
}): PipelineContext {
  return {
    ...params,
    startTime: Date.now(),
  };
}

/**
 * Run the pipeline with default options
 */
export async function runPipeline(
  params: Parameters<typeof createPipelineContext>[0],
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineResult> {
  const context = createPipelineContext(params);
  const pipeline = new TreatmentPlanPipeline(context, onProgress);
  return pipeline.execute();
}

// =============================================================================
// EXPORTS
// =============================================================================

export { getModelConfig, isAIEnabled };
