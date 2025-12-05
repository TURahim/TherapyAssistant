import OpenAI from 'openai';
import { CrisisSeverity } from '@prisma/client';
import type {
  StageResult,
  TokenUsage,
  CanonicalPlan,
  ExtractionOutput,
  TherapistPreferencesInput,
  PresentingConcern,
  ClinicalImpression,
  Diagnosis,
  Goal,
  Intervention,
  Strength,
  RiskFactor,
  HomeworkItem,
} from '../types';
import { extractionOutputSchema } from '../schemas';
import { getModelConfig, calculateCost, LIMITS } from '../config';
import {
  EXTRACTION_SYSTEM_PROMPT,
  getExtractionPrompt,
  getMergePlanPrompt,
  generateItemId,
  formatExtractionSummary,
} from '../prompts/extraction';

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractionInput {
  transcript: string;
  sessionId: string;
  sessionNumber: number;
  existingPlan?: CanonicalPlan | null;
  preferences?: TherapistPreferencesInput;
  clientContext?: string;
}

export interface ExtractionResult {
  extraction: ExtractionOutput;
  mergedPlan?: CanonicalPlan;
  isNewPlan: boolean;
  validationWarnings: string[];
}

// =============================================================================
// CANONICAL EXTRACTION STAGE
// =============================================================================

/**
 * Extract clinical information from transcript and build/update canonical plan
 */
export async function extractCanonicalPlan(
  input: ExtractionInput,
  openaiClient: OpenAI
): Promise<StageResult<ExtractionResult>> {
  const startTime = Date.now();
  let totalTokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };

  try {
    // Step 1: Extract clinical information from transcript
    const extractionResult = await performExtraction(input, openaiClient);
    
    if (!extractionResult.success) {
      return {
        success: false,
        error: extractionResult.error,
        durationMs: Date.now() - startTime,
        tokenUsage: extractionResult.tokenUsage,
      };
    }

    totalTokenUsage = addTokenUsage(totalTokenUsage, extractionResult.tokenUsage);

    // Step 2: Validate and clean extraction
    const validatedExtraction = validateExtraction(extractionResult.data!);

    // Step 3: Build or merge canonical plan
    let mergedPlan: CanonicalPlan | undefined;
    let isNewPlan = true;

    if (input.existingPlan) {
      // Merge with existing plan
      const mergeResult = await mergeWithExistingPlan(
        input.existingPlan,
        validatedExtraction.extraction,
        input.sessionId,
        openaiClient
      );

      if (mergeResult.success && mergeResult.data) {
        mergedPlan = mergeResult.data;
        isNewPlan = false;
        totalTokenUsage = addTokenUsage(totalTokenUsage, mergeResult.tokenUsage);
      } else {
        // Fallback to simple merge if AI merge fails
        mergedPlan = simpleManualMerge(
          input.existingPlan,
          validatedExtraction.extraction,
          input.sessionId
        );
        isNewPlan = false;
      }
    }

    return {
      success: true,
      data: {
        extraction: validatedExtraction.extraction,
        mergedPlan,
        isNewPlan,
        validationWarnings: validatedExtraction.warnings,
      },
      durationMs: Date.now() - startTime,
      tokenUsage: totalTokenUsage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
      durationMs: Date.now() - startTime,
      tokenUsage: totalTokenUsage,
    };
  }
}

// =============================================================================
// EXTRACTION WITH RETRY
// =============================================================================

interface ExtractionAPIResult {
  success: boolean;
  data?: ExtractionOutput;
  error?: string;
  tokenUsage?: TokenUsage;
}

/**
 * Perform extraction with retry logic
 */
async function performExtraction(
  input: ExtractionInput,
  openaiClient: OpenAI,
  maxRetries: number = LIMITS.maxRetries
): Promise<ExtractionAPIResult> {
  const config = getModelConfig('extraction');
  
  // Truncate transcript if too long
  const truncatedTranscript = input.transcript.length > LIMITS.maxTranscriptLength
    ? input.transcript.substring(0, LIMITS.maxTranscriptLength) + '\n\n[Transcript truncated]'
    : input.transcript;

  const prompt = getExtractionPrompt({
    transcript: truncatedTranscript,
    sessionId: input.sessionId,
    sessionNumber: input.sessionNumber,
    existingPlan: input.existingPlan,
    preferences: input.preferences,
    clientContext: input.clientContext,
  });

  let lastError: string = '';
  let totalTokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      // Track token usage
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        estimatedCost: calculateCost(
          config.model,
          response.usage?.prompt_tokens ?? 0,
          response.usage?.completion_tokens ?? 0
        ),
      };
      totalTokenUsage = addTokenUsage(totalTokenUsage, usage);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        lastError = 'Empty response from AI';
        continue;
      }

      // Parse JSON response
      const parsed = JSON.parse(content);

      // Validate against schema
      const validated = extractionOutputSchema.parse(parsed);

      return {
        success: true,
        data: validated,
        tokenUsage: totalTokenUsage,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        lastError = `JSON parsing failed (attempt ${attempt}): ${error.message}`;
      } else if (error instanceof Error) {
        lastError = `Extraction failed (attempt ${attempt}): ${error.message}`;
      } else {
        lastError = `Unknown error (attempt ${attempt})`;
      }

      // Exponential backoff before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return {
    success: false,
    error: lastError || 'All extraction attempts failed',
    tokenUsage: totalTokenUsage,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

interface ValidationResult {
  extraction: ExtractionOutput;
  warnings: string[];
}

/**
 * Validate and clean extracted data
 */
function validateExtraction(extraction: ExtractionOutput): ValidationResult {
  const warnings: string[] = [];
  const cleaned: ExtractionOutput = {
    concerns: [],
    impressions: [],
    suggestedDiagnoses: [],
    goals: [],
    interventions: [],
    strengths: [],
    risks: [],
    homework: [],
  };

  // Validate concerns
  for (const concern of extraction.concerns) {
    if (concern.description && concern.description.length > 5) {
      cleaned.concerns.push({
        ...concern,
        id: concern.id || generateItemId('concern', cleaned.concerns.length),
      });
    } else {
      warnings.push(`Skipped concern with insufficient description`);
    }
  }

  // Validate impressions
  for (const impression of extraction.impressions) {
    if (impression.observation && impression.observation.length > 5) {
      cleaned.impressions.push({
        ...impression,
        id: impression.id || generateItemId('impression', cleaned.impressions.length),
      });
    }
  }

  // Validate diagnoses
  for (const diagnosis of extraction.suggestedDiagnoses) {
    if (diagnosis.name && diagnosis.name.length > 2) {
      // Validate ICD code format if provided
      if (diagnosis.icdCode && !/^[A-Z]\d{2}(\.[A-Z0-9]{1,4})?$/.test(diagnosis.icdCode)) {
        warnings.push(`Invalid ICD code format for diagnosis: ${diagnosis.name}`);
        diagnosis.icdCode = undefined;
      }
      cleaned.suggestedDiagnoses.push({
        ...diagnosis,
        id: diagnosis.id || generateItemId('diagnosis', cleaned.suggestedDiagnoses.length),
      });
    }
  }

  // Validate goals
  for (const goal of extraction.goals) {
    if (goal.description && goal.description.length > 5) {
      cleaned.goals.push({
        ...goal,
        id: goal.id || generateItemId('goal', cleaned.goals.length),
        progress: Math.min(100, Math.max(0, goal.progress || 0)),
      });
    }
  }

  // Validate interventions
  for (const intervention of extraction.interventions) {
    if (intervention.name && intervention.description) {
      cleaned.interventions.push({
        ...intervention,
        id: intervention.id || generateItemId('intervention', cleaned.interventions.length),
      });
    }
  }

  // Validate strengths
  for (const strength of extraction.strengths) {
    if (strength.description && strength.description.length > 5) {
      cleaned.strengths.push({
        ...strength,
        id: strength.id || generateItemId('strength', cleaned.strengths.length),
      });
    }
  }

  // Validate risks
  for (const risk of extraction.risks) {
    if (risk.description && risk.description.length > 5) {
      cleaned.risks.push({
        ...risk,
        id: risk.id || generateItemId('risk', cleaned.risks.length),
      });
    }
  }

  // Validate homework
  for (const hw of extraction.homework) {
    if (hw.title && hw.description) {
      cleaned.homework.push({
        ...hw,
        id: hw.id || generateItemId('homework', cleaned.homework.length),
      });
    }
  }

  // Log extraction summary
  if (process.env.NODE_ENV === 'development') {
    console.log(formatExtractionSummary(cleaned));
  }

  return { extraction: cleaned, warnings };
}

// =============================================================================
// MERGE LOGIC
// =============================================================================

interface MergeResult {
  success: boolean;
  data?: CanonicalPlan;
  error?: string;
  tokenUsage?: TokenUsage;
}

/**
 * Merge new extractions with existing plan using AI
 */
async function mergeWithExistingPlan(
  existingPlan: CanonicalPlan,
  newExtractions: ExtractionOutput,
  sessionId: string,
  openaiClient: OpenAI
): Promise<MergeResult> {
  const config = getModelConfig('extraction');

  try {
    const prompt = getMergePlanPrompt({
      existingPlan,
      newExtractions,
      sessionId,
    });

    const response = await openaiClient.chat.completions.create({
      model: config.model,
      temperature: 0.2, // Lower temperature for merge consistency
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Empty merge response' };
    }

    const merged = JSON.parse(content) as CanonicalPlan;

    const tokenUsage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      estimatedCost: calculateCost(
        config.model,
        response.usage?.prompt_tokens ?? 0,
        response.usage?.completion_tokens ?? 0
      ),
    };

    return {
      success: true,
      data: merged,
      tokenUsage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Merge failed',
    };
  }
}

/**
 * Simple manual merge as fallback
 */
function simpleManualMerge(
  existingPlan: CanonicalPlan,
  newExtractions: ExtractionOutput,
  sessionId: string
): CanonicalPlan {
  const now = new Date().toISOString();

  return {
    ...existingPlan,
    updatedAt: now,
    version: existingPlan.version + 1,
    
    // Add new concerns
    presentingConcerns: [
      ...existingPlan.presentingConcerns,
      ...newExtractions.concerns.map(c => ({
        ...c,
        sourceSessionIds: [sessionId],
      } as PresentingConcern)),
    ],
    
    // Add new impressions
    clinicalImpressions: [
      ...existingPlan.clinicalImpressions,
      ...newExtractions.impressions.map(i => ({
        ...i,
        sourceSessionIds: [sessionId],
      } as ClinicalImpression)),
    ],
    
    // Add new diagnoses (avoid exact duplicates)
    diagnoses: mergeDiagnoses(existingPlan.diagnoses, newExtractions.suggestedDiagnoses),
    
    // Add new goals
    goals: [
      ...existingPlan.goals,
      ...newExtractions.goals.map(g => ({
        ...g,
        sourceSessionIds: [sessionId],
      } as Goal)),
    ],
    
    // Add new interventions
    interventions: [
      ...existingPlan.interventions,
      ...newExtractions.interventions as Intervention[],
    ],
    
    // Add new strengths
    strengths: [
      ...existingPlan.strengths,
      ...newExtractions.strengths.map(s => ({
        ...s,
        sourceSessionIds: [sessionId],
      } as Strength)),
    ],
    
    // Add new risk factors
    riskFactors: [
      ...existingPlan.riskFactors,
      ...newExtractions.risks.map(r => ({
        ...r,
        sourceSessionIds: [sessionId],
      } as RiskFactor)),
    ],
    
    // Add new homework
    homework: [
      ...existingPlan.homework,
      ...newExtractions.homework as HomeworkItem[],
    ],
    
    // Add session reference
    sessionReferences: [
      ...existingPlan.sessionReferences,
      {
        sessionId,
        sessionNumber: existingPlan.sessionReferences.length + 1,
        date: now,
        keyContributions: generateSessionContributions(newExtractions),
      },
    ],
  };
}

/**
 * Merge diagnoses avoiding duplicates
 */
function mergeDiagnoses(
  existing: Diagnosis[],
  newDiagnoses: Diagnosis[]
): Diagnosis[] {
  const merged = [...existing];
  
  for (const newDiag of newDiagnoses) {
    const existingIndex = merged.findIndex(
      d => d.name.toLowerCase() === newDiag.name.toLowerCase() ||
           (d.icdCode && d.icdCode === newDiag.icdCode)
    );
    
    if (existingIndex === -1) {
      merged.push(newDiag);
    } else if (newDiag.status === 'confirmed' && merged[existingIndex].status !== 'confirmed') {
      // Upgrade status if new evidence confirms
      merged[existingIndex] = {
        ...merged[existingIndex],
        status: 'confirmed',
        notes: `${merged[existingIndex].notes || ''} | Updated: ${newDiag.notes || ''}`.trim(),
      };
    }
  }
  
  return merged;
}

/**
 * Generate session contribution summary
 */
function generateSessionContributions(extraction: ExtractionOutput): string[] {
  const contributions: string[] = [];
  
  if (extraction.concerns.length > 0) {
    contributions.push(`Identified ${extraction.concerns.length} concern(s)`);
  }
  if (extraction.goals.length > 0) {
    contributions.push(`Set ${extraction.goals.length} goal(s)`);
  }
  if (extraction.interventions.length > 0) {
    contributions.push(`Introduced ${extraction.interventions.length} intervention(s)`);
  }
  if (extraction.homework.length > 0) {
    contributions.push(`Assigned ${extraction.homework.length} homework item(s)`);
  }
  if (extraction.risks.length > 0) {
    contributions.push(`Noted ${extraction.risks.length} risk factor(s)`);
  }
  
  return contributions.length > 0 ? contributions : ['Session documented'];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Add token usage
 */
function addTokenUsage(a: TokenUsage | undefined, b: TokenUsage | undefined): TokenUsage {
  return {
    promptTokens: (a?.promptTokens ?? 0) + (b?.promptTokens ?? 0),
    completionTokens: (a?.completionTokens ?? 0) + (b?.completionTokens ?? 0),
    totalTokens: (a?.totalTokens ?? 0) + (b?.totalTokens ?? 0),
    estimatedCost: (a?.estimatedCost ?? 0) + (b?.estimatedCost ?? 0),
  };
}

/**
 * Create a new canonical plan from extraction
 */
export function createNewPlanFromExtraction(
  clientId: string,
  sessionId: string,
  extraction: ExtractionOutput
): CanonicalPlan {
  const now = new Date().toISOString();

  return {
    clientId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    presentingConcerns: extraction.concerns.map(c => ({
      ...c,
      sourceSessionIds: [sessionId],
    })) as PresentingConcern[],
    clinicalImpressions: extraction.impressions.map(i => ({
      ...i,
      sourceSessionIds: [sessionId],
    })) as ClinicalImpression[],
    diagnoses: extraction.suggestedDiagnoses as Diagnosis[],
    goals: extraction.goals.map(g => ({
      ...g,
      sourceSessionIds: [sessionId],
    })) as Goal[],
    interventions: extraction.interventions as Intervention[],
    strengths: extraction.strengths.map(s => ({
      ...s,
      sourceSessionIds: [sessionId],
    })) as Strength[],
    riskFactors: extraction.risks.map(r => ({
      ...r,
      sourceSessionIds: [sessionId],
    })) as RiskFactor[],
    homework: extraction.homework as HomeworkItem[],
    crisisAssessment: {
      severity: getHighestRiskSeverity(extraction.risks),
      lastAssessed: now,
      safetyPlanInPlace: false,
    },
    sessionReferences: [{
      sessionId,
      sessionNumber: 1,
      date: now,
      keyContributions: generateSessionContributions(extraction),
    }],
  };
}

/**
 * Get highest risk severity from risks array
 */
function getHighestRiskSeverity(risks: ExtractionOutput['risks']): CrisisSeverity {
  const severityOrder: CrisisSeverity[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let highest: CrisisSeverity = 'NONE';
  
  for (const risk of risks) {
    const riskIndex = severityOrder.indexOf(risk.severity);
    const highestIndex = severityOrder.indexOf(highest);
    if (riskIndex > highestIndex) {
      highest = risk.severity;
    }
  }
  
  return highest;
}

/**
 * Get extraction summary for display
 */
export function getExtractionSummary(extraction: ExtractionOutput): string {
  return formatExtractionSummary(extraction);
}

