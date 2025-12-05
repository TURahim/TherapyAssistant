/**
 * AI Schema Index
 * 
 * Centralized exports for all Zod schemas used in the AI pipeline.
 * These schemas validate AI model outputs and ensure type safety.
 */

// =============================================================================
// CANONICAL PLAN SCHEMAS
// =============================================================================

export {
  // Enums
  severityEnum,
  goalTypeEnum,
  goalStatusEnum,
  diagnosisStatusEnum,
  strengthCategoryEnum,
  riskTypeEnum,
  impressionCategoryEnum,
  homeworkStatusEnum,
  crisisSeverityEnum,
  // Schemas
  presentingConcernSchema,
  clinicalImpressionSchema,
  diagnosisSchema,
  goalSchema,
  interventionSchema,
  strengthSchema,
  riskFactorSchema,
  homeworkItemSchema,
  crisisIndicatorSchema,
  crisisAssessmentSchema,
  sessionReferenceSchema,
  canonicalPlanSchema,
  extractionOutputSchema,
  // Types
  type PresentingConcernInput,
  type ClinicalImpressionInput,
  type DiagnosisInput,
  type GoalInput,
  type InterventionInput,
  type StrengthInput,
  type RiskFactorInput,
  type HomeworkItemInput,
  type CrisisIndicatorInput,
  type CrisisAssessmentInput,
  type SessionReferenceInput,
  type CanonicalPlanInput,
  type ExtractionOutputInput,
} from './canonical';

// =============================================================================
// CRISIS ASSESSMENT SCHEMAS
// =============================================================================

export {
  // Enums
  crisisIndicatorTypeEnum,
  // Schemas
  crisisIndicatorOutputSchema,
  crisisAssessmentOutputSchema,
  crisisCheckResultSchema,
  // Constants
  RISK_LEVELS,
  CRISIS_KEYWORDS,
  // Helper functions
  containsCrisisLanguage,
  findCrisisKeywords,
  shouldHaltForCrisis,
  // Types
  type CrisisIndicatorType,
  type CrisisIndicatorOutput,
  type CrisisAssessmentOutput,
  type CrisisCheckResult,
} from './crisis';

// =============================================================================
// THERAPIST VIEW SCHEMAS
// =============================================================================

export {
  // Schemas
  therapistGoalSchema,
  therapistInterventionSchema,
  therapistDiagnosisSchema,
  therapistRiskFactorSchema,
  therapistHomeworkSchema,
  therapistSessionHistorySchema,
  therapistViewSchema,
  therapistViewGenerationInputSchema,
  // Types
  type TherapistGoalOutput,
  type TherapistInterventionOutput,
  type TherapistDiagnosisOutput,
  type TherapistRiskFactorOutput,
  type TherapistHomeworkOutput,
  type TherapistSessionHistoryOutput,
  type TherapistViewOutput,
  type TherapistViewGenerationInput,
} from './therapistView';

// =============================================================================
// CLIENT VIEW SCHEMAS
// =============================================================================

export {
  // Schemas
  clientGoalSchema,
  clientHomeworkSchema,
  clientNextStepSchema,
  clientViewSchema,
  clientViewGenerationInputSchema,
  // Helper functions
  calculateReadingLevel,
  simplifyForReadingLevel,
  validateClientViewReadingLevel,
  // Types
  type ClientGoalOutput,
  type ClientHomeworkOutput,
  type ClientNextStepOutput,
  type ClientViewOutput,
  type ClientViewGenerationInput,
} from './clientView';

// =============================================================================
// SUMMARY SCHEMAS
// =============================================================================

export {
  // Schemas
  keyTopicSchema,
  moodObservationSchema,
  sessionHighlightSchema,
  sessionSummaryOutputSchema,
  summaryGenerationInputSchema,
  // Constants
  SUMMARY_GUIDELINES,
  // Helper functions
  formatSummaryForDisplay,
  getQuickTopics,
  // Types
  type KeyTopicOutput,
  type MoodObservationOutput,
  type SessionHighlightOutput,
  type SessionSummaryOutput,
  type SummaryGenerationInput,
} from './summary';

