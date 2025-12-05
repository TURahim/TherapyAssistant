import OpenAI from 'openai';
import { CrisisSeverity } from '@prisma/client';
import type { StageResult, TokenUsage } from '../types';
import type { CrisisCheckResult, CrisisAssessmentOutput } from '../schemas';
import { crisisAssessmentOutputSchema, shouldHaltForCrisis, containsCrisisLanguage, findCrisisKeywords } from '../schemas';
import { getModelConfig, calculateCost, LIMITS } from '../config';
import { CRISIS_SYSTEM_PROMPT, getCrisisAssessmentPrompt, getRecommendedActions } from '../prompts/crisis';

// =============================================================================
// CRISIS CLASSIFIER STAGE
// =============================================================================

/**
 * Analyze transcript for crisis indicators
 * This is a safety-critical stage that uses the best available model
 */
export async function classifyCrisis(
  transcript: string,
  openaiClient: OpenAI
): Promise<StageResult<CrisisCheckResult>> {
  const startTime = Date.now();

  try {
    // Step 1: Quick keyword pre-check
    const keywordCheck = performKeywordPreCheck(transcript);
    
    // Step 2: If keywords found or transcript is long, use AI assessment
    const needsAIAssessment = keywordCheck.hasCrisisLanguage || 
                              transcript.length > 1000 ||
                              keywordCheck.keywordMatches.length > 0;

    if (!needsAIAssessment) {
      // No concerning keywords in short transcript - return safe result
      return createSafeResult(startTime);
    }

    // Step 3: Full AI-powered crisis assessment
    const aiResult = await performAIAssessment(transcript, openaiClient);
    
    if (!aiResult.success) {
      // AI assessment failed - err on the side of caution
      return handleAIFailure(keywordCheck, startTime, aiResult.error);
    }

    // Step 4: Combine keyword check with AI assessment
    const finalAssessment = combineAssessments(keywordCheck, aiResult.data!);
    
    // Step 5: Determine if pipeline should halt
    const shouldHalt = shouldHaltForCrisis(finalAssessment.overallSeverity);

    const result: CrisisCheckResult = {
      isCrisis: finalAssessment.overallSeverity !== CrisisSeverity.NONE,
      severity: finalAssessment.overallSeverity,
      shouldHalt,
      assessment: finalAssessment,
      processingNotes: keywordCheck.keywordMatches.length > 0 
        ? `Keyword pre-check found ${keywordCheck.keywordMatches.length} potential indicator(s)`
        : undefined,
    };

    return {
      success: true,
      data: result,
      durationMs: Date.now() - startTime,
      tokenUsage: aiResult.tokenUsage,
    };
  } catch (error) {
    // On any error, return a cautious result
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Crisis classification failed',
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// KEYWORD PRE-CHECK
// =============================================================================

interface KeywordCheckResult {
  hasCrisisLanguage: boolean;
  keywordMatches: Array<{ keyword: string; category: string; index: number }>;
  suggestedSeverity: CrisisSeverity;
}

/**
 * Fast keyword-based pre-check for crisis indicators
 * This runs before AI assessment for quick detection
 */
function performKeywordPreCheck(transcript: string): KeywordCheckResult {
  const hasCrisisLanguage = containsCrisisLanguage(transcript);
  const keywordMatches = findCrisisKeywords(transcript);

  // Determine suggested severity based on keywords
  let suggestedSeverity: CrisisSeverity = CrisisSeverity.NONE;
  
  if (keywordMatches.length > 0) {
    const categories = new Set(keywordMatches.map(m => m.category));
    
    if (categories.has('suicidal') || categories.has('violence')) {
      suggestedSeverity = CrisisSeverity.HIGH;
    } else if (categories.has('selfHarm') || categories.has('psychosis')) {
      suggestedSeverity = CrisisSeverity.MEDIUM;
    } else if (categories.has('emergency')) {
      suggestedSeverity = CrisisSeverity.HIGH;
    } else {
      suggestedSeverity = CrisisSeverity.LOW;
    }
  }

  return {
    hasCrisisLanguage,
    keywordMatches,
    suggestedSeverity,
  };
}

// =============================================================================
// AI ASSESSMENT
// =============================================================================

interface AIAssessmentResult {
  success: boolean;
  data?: CrisisAssessmentOutput;
  error?: string;
  tokenUsage?: TokenUsage;
}

/**
 * Perform AI-powered crisis assessment using GPT-4
 */
async function performAIAssessment(
  transcript: string,
  openaiClient: OpenAI
): Promise<AIAssessmentResult> {
  const config = getModelConfig('crisis_check');
  
  // Truncate transcript if too long
  const truncatedTranscript = transcript.length > LIMITS.maxTranscriptLength
    ? transcript.substring(0, LIMITS.maxTranscriptLength) + '\n\n[Transcript truncated for processing]'
    : transcript;

  try {
    const response = await openaiClient.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: CRISIS_SYSTEM_PROMPT },
        { role: 'user', content: getCrisisAssessmentPrompt(truncatedTranscript) },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Empty response from AI' };
    }

    // Parse and validate response
    const parsed = JSON.parse(content);
    const validated = crisisAssessmentOutputSchema.parse(parsed);

    // Calculate token usage
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
      data: validated,
      tokenUsage,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Failed to parse AI response as JSON' };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error during AI assessment' };
  }
}

// =============================================================================
// ASSESSMENT COMBINATION
// =============================================================================

/**
 * Combine keyword pre-check with AI assessment
 * Takes the higher severity between the two
 */
function combineAssessments(
  keywordCheck: KeywordCheckResult,
  aiAssessment: CrisisAssessmentOutput
): CrisisAssessmentOutput {
  // Use the higher severity between keyword check and AI assessment
  const severityOrder: CrisisSeverity[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const keywordIndex = severityOrder.indexOf(keywordCheck.suggestedSeverity);
  const aiIndex = severityOrder.indexOf(aiAssessment.overallSeverity);
  
  const finalSeverity = keywordIndex > aiIndex 
    ? keywordCheck.suggestedSeverity 
    : aiAssessment.overallSeverity;

  // If keyword check suggests higher severity, add a note
  const updatedReasoning = keywordIndex > aiIndex
    ? `${aiAssessment.reasoning}\n\nNote: Keyword pre-check detected explicit crisis language that elevated the severity rating.`
    : aiAssessment.reasoning;

  // Ensure recommended actions are appropriate for final severity
  const recommendedActions = aiAssessment.recommendedActions.length > 0
    ? aiAssessment.recommendedActions
    : getRecommendedActions(finalSeverity);

  return {
    ...aiAssessment,
    overallSeverity: finalSeverity,
    reasoning: updatedReasoning,
    recommendedActions,
    // Ensure immediate risk flag matches severity
    immediateRisk: finalSeverity === 'CRITICAL' || finalSeverity === 'HIGH' || aiAssessment.immediateRisk,
  };
}

// =============================================================================
// FALLBACK HANDLERS
// =============================================================================

/**
 * Create a safe result when no crisis indicators are found
 */
function createSafeResult(startTime: number): StageResult<CrisisCheckResult> {
  return {
    success: true,
    data: {
      isCrisis: false,
      severity: CrisisSeverity.NONE,
      shouldHalt: false,
      assessment: {
        overallSeverity: CrisisSeverity.NONE,
        confidence: 1.0,
        indicators: [],
        immediateRisk: false,
        recommendedActions: getRecommendedActions(CrisisSeverity.NONE),
        reasoning: 'No crisis indicators detected in transcript. No explicit safety concerns found.',
      },
    },
    durationMs: Date.now() - startTime,
  };
}

/**
 * Handle AI assessment failure
 * Err on the side of caution based on keyword check
 */
function handleAIFailure(
  keywordCheck: KeywordCheckResult,
  startTime: number,
  error?: string
): StageResult<CrisisCheckResult> {
  // If keywords suggest risk, flag for review even if AI failed
  if (keywordCheck.keywordMatches.length > 0) {
    return {
      success: true,
      data: {
        isCrisis: true,
        severity: keywordCheck.suggestedSeverity,
        shouldHalt: shouldHaltForCrisis(keywordCheck.suggestedSeverity),
        assessment: {
          overallSeverity: keywordCheck.suggestedSeverity,
          confidence: 0.5, // Lower confidence without AI verification
          indicators: keywordCheck.keywordMatches.map(m => ({
            type: m.category as CrisisAssessmentOutput['indicators'][0]['type'],
            quote: m.keyword,
            severity: keywordCheck.suggestedSeverity,
            context: 'Detected by keyword pre-check (AI assessment unavailable)',
          })),
          immediateRisk: keywordCheck.suggestedSeverity === 'HIGH' || keywordCheck.suggestedSeverity === 'CRITICAL',
          recommendedActions: [
            'AI assessment failed - manual review required',
            ...getRecommendedActions(keywordCheck.suggestedSeverity),
          ],
          reasoning: `Keyword pre-check detected potential crisis indicators. AI assessment failed: ${error}. Manual clinical review is strongly recommended.`,
        },
        processingNotes: `AI assessment failed. Using keyword-based assessment only. Error: ${error}`,
      },
      durationMs: Date.now() - startTime,
    };
  }

  // No keywords found, AI failed - return cautionary result
  return {
    success: false,
    error: `Crisis assessment failed: ${error}. Manual review recommended.`,
    durationMs: Date.now() - startTime,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Perform a quick crisis check without full AI assessment
 * Useful for real-time preview of crisis indicators
 */
export function quickCrisisCheck(transcript: string): {
  hasConcerns: boolean;
  severity: CrisisSeverity;
  matches: Array<{ keyword: string; category: string }>;
} {
  const result = performKeywordPreCheck(transcript);
  return {
    hasConcerns: result.hasCrisisLanguage,
    severity: result.suggestedSeverity,
    matches: result.keywordMatches.map(m => ({
      keyword: m.keyword,
      category: m.category,
    })),
  };
}

/**
 * Get human-readable severity label
 */
export function getSeverityLabel(severity: CrisisSeverity): string {
  const labels: Record<CrisisSeverity, string> = {
    NONE: 'No Concerns',
    LOW: 'Low Risk',
    MEDIUM: 'Medium Risk',
    HIGH: 'High Risk',
    CRITICAL: 'Critical',
  };
  return labels[severity];
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: CrisisSeverity): string {
  const colors: Record<CrisisSeverity, string> = {
    NONE: 'green',
    LOW: 'yellow',
    MEDIUM: 'orange',
    HIGH: 'red',
    CRITICAL: 'red',
  };
  return colors[severity];
}

