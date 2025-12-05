import { z } from 'zod';
import { CrisisSeverity } from '@prisma/client';

// =============================================================================
// ENUMS & LITERALS
// =============================================================================

export const severityEnum = z.enum(['mild', 'moderate', 'severe']);

export const goalTypeEnum = z.enum(['short_term', 'long_term']);

export const goalStatusEnum = z.enum(['not_started', 'in_progress', 'achieved', 'revised']);

export const diagnosisStatusEnum = z.enum(['provisional', 'confirmed', 'rule_out']);

export const strengthCategoryEnum = z.enum(['personal', 'social', 'environmental', 'coping']);

export const riskTypeEnum = z.enum([
  'suicidal_ideation',
  'self_harm',
  'substance_use',
  'violence',
  'other',
]);

export const impressionCategoryEnum = z.enum([
  'Cognitive',
  'Emotional',
  'Behavioral',
  'Interpersonal',
  'Physiological',
]);

export const homeworkStatusEnum = z.enum(['assigned', 'in_progress', 'completed', 'skipped']);

export const crisisSeverityEnum = z.nativeEnum(CrisisSeverity);

// =============================================================================
// BASE SCHEMAS
// =============================================================================

export const presentingConcernSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(1000),
  severity: severityEnum,
  duration: z.string().min(1),
  impact: z.string().min(1).max(500),
  sourceSessionIds: z.array(z.string()),
});

export const clinicalImpressionSchema = z.object({
  id: z.string().min(1),
  observation: z.string().min(1).max(1000),
  category: impressionCategoryEnum,
  sourceSessionIds: z.array(z.string()),
});

export const diagnosisSchema = z.object({
  id: z.string().min(1),
  icdCode: z.string().optional(),
  name: z.string().min(1),
  status: diagnosisStatusEnum,
  notes: z.string().optional(),
});

export const goalSchema = z.object({
  id: z.string().min(1),
  type: goalTypeEnum,
  description: z.string().min(1).max(500),
  measurableOutcome: z.string().min(1).max(500),
  targetDate: z.string().optional(),
  status: goalStatusEnum,
  progress: z.number().min(0).max(100),
  interventionIds: z.array(z.string()),
  sourceSessionIds: z.array(z.string()),
});

export const interventionSchema = z.object({
  id: z.string().min(1),
  modality: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).max(1000),
  frequency: z.string().min(1),
  rationale: z.string().min(1).max(500),
});

export const strengthSchema = z.object({
  id: z.string().min(1),
  category: strengthCategoryEnum,
  description: z.string().min(1).max(500),
  sourceSessionIds: z.array(z.string()),
});

export const riskFactorSchema = z.object({
  id: z.string().min(1),
  type: riskTypeEnum,
  description: z.string().min(1).max(500),
  severity: crisisSeverityEnum,
  mitigatingFactors: z.array(z.string()),
  sourceSessionIds: z.array(z.string()),
});

export const homeworkItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  rationale: z.string().min(1).max(500),
  goalIds: z.array(z.string()),
  status: homeworkStatusEnum,
  dueDate: z.string().optional(),
});

export const crisisIndicatorSchema = z.object({
  type: z.string().min(1),
  quote: z.string().min(1),
  severity: crisisSeverityEnum,
  context: z.string().optional(),
});

export const crisisAssessmentSchema = z.object({
  severity: crisisSeverityEnum,
  lastAssessed: z.string(),
  indicators: z.array(crisisIndicatorSchema).optional(),
  safetyPlanInPlace: z.boolean(),
  safetyPlanDetails: z.string().optional(),
});

export const sessionReferenceSchema = z.object({
  sessionId: z.string().min(1),
  sessionNumber: z.number().int().positive(),
  date: z.string(),
  keyContributions: z.array(z.string()),
});

// =============================================================================
// CANONICAL PLAN SCHEMA
// =============================================================================

export const canonicalPlanSchema = z.object({
  clientId: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().positive(),
  presentingConcerns: z.array(presentingConcernSchema),
  clinicalImpressions: z.array(clinicalImpressionSchema),
  diagnoses: z.array(diagnosisSchema),
  goals: z.array(goalSchema),
  interventions: z.array(interventionSchema),
  strengths: z.array(strengthSchema),
  riskFactors: z.array(riskFactorSchema),
  homework: z.array(homeworkItemSchema),
  crisisAssessment: crisisAssessmentSchema,
  sessionReferences: z.array(sessionReferenceSchema),
});

// =============================================================================
// EXTRACTION OUTPUT SCHEMA (AI Response)
// =============================================================================

export const extractionOutputSchema = z.object({
  concerns: z.array(presentingConcernSchema),
  impressions: z.array(clinicalImpressionSchema),
  suggestedDiagnoses: z.array(diagnosisSchema),
  goals: z.array(goalSchema),
  interventions: z.array(interventionSchema),
  strengths: z.array(strengthSchema),
  risks: z.array(riskFactorSchema),
  homework: z.array(homeworkItemSchema),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PresentingConcernInput = z.infer<typeof presentingConcernSchema>;
export type ClinicalImpressionInput = z.infer<typeof clinicalImpressionSchema>;
export type DiagnosisInput = z.infer<typeof diagnosisSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type InterventionInput = z.infer<typeof interventionSchema>;
export type StrengthInput = z.infer<typeof strengthSchema>;
export type RiskFactorInput = z.infer<typeof riskFactorSchema>;
export type HomeworkItemInput = z.infer<typeof homeworkItemSchema>;
export type CrisisIndicatorInput = z.infer<typeof crisisIndicatorSchema>;
export type CrisisAssessmentInput = z.infer<typeof crisisAssessmentSchema>;
export type SessionReferenceInput = z.infer<typeof sessionReferenceSchema>;
export type CanonicalPlanInput = z.infer<typeof canonicalPlanSchema>;
export type ExtractionOutputInput = z.infer<typeof extractionOutputSchema>;

