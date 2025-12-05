/**
 * AI Prompts Index
 * 
 * Central export point for all AI prompt modules.
 * Each module contains prompts and helpers for a specific pipeline stage.
 */

// Internal imports for use in this file
import { CRISIS_SYSTEM_PROMPT as _CRISIS_PROMPT } from './crisis';
import { EXTRACTION_SYSTEM_PROMPT as _EXTRACTION_PROMPT } from './extraction';
import { THERAPIST_VIEW_SYSTEM_PROMPT as _THERAPIST_PROMPT } from './therapistView';
import { CLIENT_VIEW_SYSTEM_PROMPT as _CLIENT_PROMPT } from './clientView';
import { THERAPIST_SUMMARY_SYSTEM_PROMPT as _THERAPIST_SUMMARY_PROMPT } from './summary';
import { CLIENT_SUMMARY_SYSTEM_PROMPT as _CLIENT_SUMMARY_PROMPT } from './summary';

// =============================================================================
// CRISIS PROMPTS (Stage 2)
// =============================================================================

export {
  CRISIS_SYSTEM_PROMPT,
  getCrisisAssessmentPrompt,
  SEVERITY_DESCRIPTIONS,
  INDICATOR_DESCRIPTIONS,
  RECOMMENDED_ACTIONS,
  getRecommendedActions,
  getSeverityDescription,
  formatCrisisAssessmentForDisplay,
} from './crisis';

// =============================================================================
// EXTRACTION PROMPTS (Stage 3)
// =============================================================================

export {
  EXTRACTION_SYSTEM_PROMPT,
  getExtractionPrompt,
  getMergePlanPrompt,
  getValidationPrompt,
  generateItemId,
  getModalitySpecificInstructions,
  formatExtractionSummary,
} from './extraction';

// =============================================================================
// THERAPIST VIEW PROMPTS (Stage 4A)
// =============================================================================

export {
  THERAPIST_VIEW_SYSTEM_PROMPT,
  getTherapistViewPrompt,
  formatRiskLevel,
  formatGoalStatus,
  formatDiagnosisStatus,
  generatePresentingProblemsSummary,
  generateDiagnosticFormulation,
  generateTreatmentRationale,
  getTherapistViewSummary,
  type TherapistViewPromptParams,
} from './therapistView';

// =============================================================================
// CLIENT VIEW PROMPTS (Stage 4B)
// =============================================================================

export {
  CLIENT_VIEW_SYSTEM_PROMPT,
  getClientViewPrompt,
  simplifyText,
  goalToPlainLanguage,
  generateEncouragingMessage,
  generateStrengthAcknowledgment,
  isAppropriateForClient,
  getPlainAlternative,
  getClientViewSummary,
  type ClientViewPromptParams,
} from './clientView';

// =============================================================================
// SUMMARY PROMPTS (Session Summaries)
// =============================================================================

export {
  THERAPIST_SUMMARY_SYSTEM_PROMPT,
  CLIENT_SUMMARY_SYSTEM_PROMPT,
  getTherapistSummaryPrompt,
  getClientSummaryPrompt,
  formatSessionDate,
  extractActionItems,
  getProgressIndicators,
  validateSummary,
  FALLBACK_TEMPLATES,
  type SummaryPromptParams,
} from './summary';

// =============================================================================
// PROMPT UTILITIES
// =============================================================================

/**
 * Get all system prompts for debugging/display
 */
export function getAllSystemPrompts(): Record<string, string> {
  return {
    crisis: _CRISIS_PROMPT,
    extraction: _EXTRACTION_PROMPT,
    therapistView: _THERAPIST_PROMPT,
    clientView: _CLIENT_PROMPT,
    therapistSummary: _THERAPIST_SUMMARY_PROMPT,
    clientSummary: _CLIENT_SUMMARY_PROMPT,
  };
}

/**
 * Prompt stage names
 */
export type PromptStage = 'crisis' | 'extraction' | 'therapistView' | 'clientView' | 'summary';

/**
 * Get system prompt by stage name
 */
export function getSystemPrompt(stage: PromptStage): string | undefined {
  const prompts = getAllSystemPrompts();
  return prompts[stage];
}

