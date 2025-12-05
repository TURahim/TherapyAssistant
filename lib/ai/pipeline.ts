import OpenAI from 'openai';
import { CrisisSeverity } from '@prisma/client';
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
} from './types';
import { getModelConfig, isAIEnabled, calculateCost, LIMITS } from './config';
import { AIError } from '@/lib/utils/errors';
import type { CrisisCheckResult } from './schemas';

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

  constructor(context: PipelineContext, onProgress?: (progress: PipelineProgress) => void) {
    this.context = context;
    this.onProgress = onProgress;
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
      const preprocessed = await this.runPreprocessing();
      if (!preprocessed.success) {
        return this.createErrorResult(`Preprocessing failed: ${preprocessed.error}`);
      }
      this.reportProgress('preprocessing', 100, 'Transcript prepared');

      // Stage 2: Crisis Check
      this.reportProgress('crisis_check', 0, 'Checking for safety concerns...');
      const crisisResult = await this.runCrisisCheck(preprocessed.data!);
      if (!crisisResult.success) {
        return this.createErrorResult(`Crisis check failed: ${crisisResult.error}`);
      }
      this.reportProgress('crisis_check', 100, 'Safety check complete');

      // Handle crisis detection
      if (crisisResult.data?.shouldHalt) {
        return this.createCrisisResult(crisisResult.data);
      }

      // Stage 3: Canonical Extraction
      this.reportProgress('extraction', 0, 'Extracting clinical information...');
      const extraction = await this.runExtraction(preprocessed.data!);
      if (!extraction.success) {
        return this.createErrorResult(`Extraction failed: ${extraction.error}`);
      }
      this.reportProgress('extraction', 100, 'Information extracted');

      // Stage 4: Build/Update Canonical Plan
      const canonicalPlan = this.buildCanonicalPlan(extraction.data!);

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
        crisisResult.data!
      );
      this.reportProgress('saving', 100, 'Plan saved');

      this.reportProgress('complete', 100, 'Pipeline complete');

      return {
        success: true,
        planId: saveResult.planId,
        versionNumber: saveResult.versionNumber,
        crisisDetected: crisisResult.data!.isCrisis,
        crisisSeverity: crisisResult.data!.severity,
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
  // STAGE IMPLEMENTATIONS (Skeletons - to be implemented in later PRs)
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

  private async runPreprocessing(): Promise<StageResult<string>> {
    // Skeleton - will be implemented in PR #8
    const startTime = Date.now();
    
    // For now, just return the transcript as-is
    return {
      success: true,
      data: this.context.transcript,
      durationMs: Date.now() - startTime,
    };
  }

  private async runCrisisCheck(_processedTranscript: string): Promise<StageResult<CrisisCheckResult>> {
    // Skeleton - will be implemented in PR #8
    const startTime = Date.now();
    
    // Default to no crisis for skeleton
    return {
      success: true,
      data: {
        isCrisis: false,
        severity: CrisisSeverity.NONE,
        shouldHalt: false,
        assessment: {
          overallSeverity: CrisisSeverity.NONE,
          confidence: 1,
          indicators: [],
          immediateRisk: false,
          recommendedActions: [],
          reasoning: 'Skeleton implementation - no crisis check performed',
        },
      },
      durationMs: Date.now() - startTime,
    };
  }

  private async runExtraction(_processedTranscript: string): Promise<StageResult<unknown>> {
    // Skeleton - will be implemented in PR #9
    const startTime = Date.now();
    
    return {
      success: true,
      data: {
        concerns: [],
        impressions: [],
        suggestedDiagnoses: [],
        goals: [],
        interventions: [],
        strengths: [],
        risks: [],
        homework: [],
      },
      durationMs: Date.now() - startTime,
    };
  }

  private buildCanonicalPlan(_extractionData: unknown): CanonicalPlan {
    // Skeleton - will be implemented in PR #9
    const now = new Date().toISOString();
    
    // If there's an existing plan, use it as base
    if (this.context.existingPlan) {
      return {
        ...this.context.existingPlan,
        updatedAt: now,
        version: this.context.existingPlan.version + 1,
      };
    }
    
    // Create new skeleton plan
    return {
      clientId: this.context.clientId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      presentingConcerns: [],
      clinicalImpressions: [],
      diagnoses: [],
      goals: [],
      interventions: [],
      strengths: [],
      riskFactors: [],
      homework: [],
      crisisAssessment: {
        severity: CrisisSeverity.NONE,
        lastAssessed: now,
        safetyPlanInPlace: false,
      },
      sessionReferences: [{
        sessionId: this.context.sessionId,
        sessionNumber: 1,
        date: now,
        keyContributions: [],
      }],
    };
  }

  private async runTherapistViewGeneration(_canonicalPlan: CanonicalPlan): Promise<StageResult<TherapistView>> {
    // Skeleton - will be implemented in PR #10
    const startTime = Date.now();
    
    return {
      success: true,
      data: {
        header: {
          clientName: 'Client',
          planStatus: 'Draft',
          lastUpdated: new Date().toISOString(),
          version: 1,
        },
        clinicalSummary: {
          presentingProblems: 'To be generated',
          diagnosticFormulation: 'To be generated',
          treatmentRationale: 'To be generated',
        },
        diagnoses: {
          secondary: [],
        },
        treatmentGoals: {
          shortTerm: [],
          longTerm: [],
        },
        interventionPlan: [],
        riskAssessment: {
          currentLevel: 'None',
          factors: [],
        },
        progressNotes: {
          summary: 'To be generated',
          recentChanges: [],
          nextSteps: [],
        },
        homework: [],
        sessionHistory: [],
      },
      durationMs: Date.now() - startTime,
    };
  }

  private async runClientViewGeneration(_canonicalPlan: CanonicalPlan): Promise<StageResult<ClientView>> {
    // Skeleton - will be implemented in PR #10
    const startTime = Date.now();
    
    return {
      success: true,
      data: {
        header: {
          greeting: 'Welcome!',
          lastUpdated: new Date().toISOString(),
        },
        overview: {
          whatWeAreWorkingOn: 'Your treatment plan is being prepared.',
          whyThisMatters: 'This will help guide our work together.',
          yourStrengths: ['You are taking steps to improve your wellbeing'],
        },
        goals: [],
        nextSteps: [{
          step: 'Continue with therapy sessions',
          why: 'Consistent engagement supports progress',
        }],
        homework: [],
        encouragement: {
          progressMessage: 'Thank you for your commitment to this process.',
        },
      },
      durationMs: Date.now() - startTime,
    };
  }

  private async runSummaryGeneration(): Promise<StageResult<SessionSummaryOutput>> {
    // Skeleton - will be implemented in PR #11
    const startTime = Date.now();
    
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

  private async savePlanToDatabase(
    _canonicalPlan: CanonicalPlan,
    _therapistView: TherapistView | undefined,
    _clientView: ClientView | undefined,
    _summary: SessionSummaryOutput | undefined,
    _crisisResult: CrisisCheckResult
  ): Promise<{ planId: string; versionNumber: number }> {
    // Skeleton - will be implemented in PR #12
    // For now, return dummy values
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

