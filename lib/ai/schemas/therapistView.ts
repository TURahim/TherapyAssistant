import { z } from 'zod';

// =============================================================================
// THERAPIST VIEW SCHEMAS
// =============================================================================

export const therapistGoalSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(1).max(300),
  objective: z.string().min(1).max(500),
  progress: z.number().min(0).max(100),
  status: z.string().min(1),
  interventions: z.array(z.string()),
});

export const therapistInterventionSchema = z.object({
  modality: z.string().min(1),
  technique: z.string().min(1),
  description: z.string().min(1).max(500),
  frequency: z.string().min(1),
  rationale: z.string().min(1).max(300),
});

export const therapistDiagnosisSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  status: z.string().min(1),
});

export const therapistRiskFactorSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  mitigation: z.string().min(1),
});

export const therapistHomeworkSchema = z.object({
  id: z.string().min(1),
  task: z.string().min(1),
  purpose: z.string().min(1),
  status: z.string().min(1),
});

export const therapistSessionHistorySchema = z.object({
  sessionNumber: z.number().int().positive(),
  date: z.string(),
  keyPoints: z.array(z.string()),
});

// =============================================================================
// MAIN THERAPIST VIEW SCHEMA
// =============================================================================

export const therapistViewSchema = z.object({
  header: z.object({
    clientName: z.string().min(1),
    planStatus: z.string().min(1),
    lastUpdated: z.string(),
    version: z.number().int().positive(),
  }),
  clinicalSummary: z.object({
    presentingProblems: z.string().min(1),
    diagnosticFormulation: z.string().min(1),
    treatmentRationale: z.string().min(1),
  }),
  diagnoses: z.object({
    primary: therapistDiagnosisSchema.optional(),
    secondary: z.array(therapistDiagnosisSchema),
  }),
  treatmentGoals: z.object({
    shortTerm: z.array(therapistGoalSchema),
    longTerm: z.array(therapistGoalSchema),
  }),
  interventionPlan: z.array(therapistInterventionSchema),
  riskAssessment: z.object({
    currentLevel: z.string().min(1),
    factors: z.array(therapistRiskFactorSchema),
  }),
  progressNotes: z.object({
    summary: z.string().min(1),
    recentChanges: z.array(z.string()),
    nextSteps: z.array(z.string()),
  }),
  homework: z.array(therapistHomeworkSchema),
  sessionHistory: z.array(therapistSessionHistorySchema),
});

// =============================================================================
// GENERATION INPUT SCHEMA
// =============================================================================

export const therapistViewGenerationInputSchema = z.object({
  canonicalPlan: z.any(), // Will be validated separately
  clientName: z.string().min(1),
  includeIcdCodes: z.boolean().default(true),
  languageLevel: z.enum(['professional', 'conversational', 'simple']).default('professional'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TherapistGoalOutput = z.infer<typeof therapistGoalSchema>;
export type TherapistInterventionOutput = z.infer<typeof therapistInterventionSchema>;
export type TherapistDiagnosisOutput = z.infer<typeof therapistDiagnosisSchema>;
export type TherapistRiskFactorOutput = z.infer<typeof therapistRiskFactorSchema>;
export type TherapistHomeworkOutput = z.infer<typeof therapistHomeworkSchema>;
export type TherapistSessionHistoryOutput = z.infer<typeof therapistSessionHistorySchema>;
export type TherapistViewOutput = z.infer<typeof therapistViewSchema>;
export type TherapistViewGenerationInput = z.infer<typeof therapistViewGenerationInputSchema>;

