import { describe, it, expect } from 'vitest';
import { CrisisSeverity } from '@prisma/client';
import {
  canonicalPlanSchema,
  extractionOutputSchema,
  presentingConcernSchema,
  goalSchema,
  diagnosisSchema,
  interventionSchema,
  crisisAssessmentSchema,
} from '@/lib/ai/schemas';
import { validate, validateOrThrow, safeParse, isValidFor } from '@/lib/utils/validation';

describe('Schema Validation', () => {
  describe('presentingConcernSchema', () => {
    it('validates valid concern', () => {
      const validConcern = {
        id: 'concern_123',
        description: 'Client reports persistent anxiety about work performance',
        severity: 'moderate',
        duration: '6 months',
        impact: 'Difficulty concentrating and sleeping',
        sourceSessionIds: ['session_001'],
      };

      const result = validate(presentingConcernSchema, validConcern);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validConcern);
    });

    it('rejects invalid severity', () => {
      const invalidConcern = {
        id: 'concern_123',
        description: 'Test concern',
        severity: 'extreme', // Invalid
        duration: '1 month',
        impact: 'Significant',
        sourceSessionIds: [],
      };

      const result = validate(presentingConcernSchema, invalidConcern);
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const incompleteConcern = {
        id: 'concern_123',
        description: 'Test concern',
        // Missing severity, duration, impact
      };

      const result = validate(presentingConcernSchema, incompleteConcern);
      expect(result.success).toBe(false);
    });

    it('rejects empty description', () => {
      const emptyConcern = {
        id: 'concern_123',
        description: '',
        severity: 'mild',
        duration: '1 month',
        impact: 'None',
        sourceSessionIds: [],
      };

      const result = validate(presentingConcernSchema, emptyConcern);
      expect(result.success).toBe(false);
    });
  });

  describe('goalSchema', () => {
    it('validates valid goal', () => {
      const validGoal = {
        id: 'goal_456',
        type: 'short_term',
        description: 'Reduce anxiety episodes to 3 or fewer per week',
        measurableOutcome: 'Self-reported frequency tracking',
        status: 'in_progress',
        progress: 40,
        interventionIds: ['intervention_001'],
        sourceSessionIds: ['session_001'],
      };

      const result = validate(goalSchema, validGoal);
      expect(result.success).toBe(true);
    });

    it('validates goal with optional targetDate', () => {
      const goalWithDate = {
        id: 'goal_789',
        type: 'long_term',
        description: 'Develop lasting coping strategies',
        measurableOutcome: 'Demonstrate 3+ strategies',
        targetDate: '2024-06-01',
        status: 'not_started',
        progress: 0,
        interventionIds: [],
        sourceSessionIds: [],
      };

      const result = validate(goalSchema, goalWithDate);
      expect(result.success).toBe(true);
    });

    it('rejects progress out of range', () => {
      const invalidProgress = {
        id: 'goal_abc',
        type: 'short_term',
        description: 'Test goal',
        measurableOutcome: 'Test outcome',
        status: 'in_progress',
        progress: 150, // Invalid: > 100
        interventionIds: [],
        sourceSessionIds: [],
      };

      const result = validate(goalSchema, invalidProgress);
      expect(result.success).toBe(false);
    });

    it('rejects invalid goal type', () => {
      const invalidType = {
        id: 'goal_def',
        type: 'medium_term', // Invalid
        description: 'Test goal',
        measurableOutcome: 'Test outcome',
        status: 'in_progress',
        progress: 50,
        interventionIds: [],
        sourceSessionIds: [],
      };

      const result = validate(goalSchema, invalidType);
      expect(result.success).toBe(false);
    });
  });

  describe('diagnosisSchema', () => {
    it('validates diagnosis with ICD code', () => {
      const validDiagnosis = {
        id: 'diagnosis_123',
        icdCode: 'F41.1',
        name: 'Generalized Anxiety Disorder',
        status: 'provisional',
        notes: 'Meets criteria based on reported symptoms',
      };

      const result = validate(diagnosisSchema, validDiagnosis);
      expect(result.success).toBe(true);
    });

    it('validates diagnosis without ICD code', () => {
      const diagnosisNoCode = {
        id: 'diagnosis_456',
        name: 'Adjustment Disorder',
        status: 'rule_out',
      };

      const result = validate(diagnosisSchema, diagnosisNoCode);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const invalidStatus = {
        id: 'diagnosis_789',
        name: 'Test Diagnosis',
        status: 'pending', // Invalid
      };

      const result = validate(diagnosisSchema, invalidStatus);
      expect(result.success).toBe(false);
    });
  });

  describe('interventionSchema', () => {
    it('validates valid intervention', () => {
      const validIntervention = {
        id: 'intervention_123',
        modality: 'CBT',
        name: 'Cognitive Restructuring',
        description: 'Identify and challenge automatic thoughts',
        frequency: 'Weekly practice',
        rationale: 'Evidence-based for anxiety disorders',
      };

      const result = validate(interventionSchema, validIntervention);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const emptyName = {
        id: 'intervention_456',
        modality: 'DBT',
        name: '',
        description: 'Test description',
        frequency: 'Daily',
        rationale: 'Test rationale',
      };

      const result = validate(interventionSchema, emptyName);
      expect(result.success).toBe(false);
    });
  });

  describe('crisisAssessmentSchema', () => {
    it('validates crisis assessment with no indicators', () => {
      const assessment = {
        severity: CrisisSeverity.NONE,
        lastAssessed: '2024-01-15T10:00:00.000Z',
        safetyPlanInPlace: false,
      };

      const result = validate(crisisAssessmentSchema, assessment);
      expect(result.success).toBe(true);
    });

    it('validates crisis assessment with indicators', () => {
      const assessment = {
        severity: CrisisSeverity.MEDIUM,
        lastAssessed: '2024-01-15T10:00:00.000Z',
        indicators: [
          {
            type: 'suicidal_ideation',
            quote: 'Sometimes I feel like giving up',
            severity: CrisisSeverity.LOW,
          },
        ],
        safetyPlanInPlace: true,
        safetyPlanDetails: 'Client has emergency contacts and coping strategies documented',
      };

      const result = validate(crisisAssessmentSchema, assessment);
      expect(result.success).toBe(true);
    });
  });

  describe('extractionOutputSchema', () => {
    it('validates complete extraction output', () => {
      const extraction = {
        concerns: [
          {
            id: 'concern_1',
            description: 'Anxiety about work',
            severity: 'moderate',
            duration: '6 months',
            impact: 'Poor sleep',
            sourceSessionIds: ['session_1'],
          },
        ],
        impressions: [
          {
            id: 'impression_1',
            observation: 'Client appears motivated',
            category: 'Behavioral',
            sourceSessionIds: ['session_1'],
          },
        ],
        suggestedDiagnoses: [
          {
            id: 'diagnosis_1',
            name: 'GAD',
            status: 'provisional',
          },
        ],
        goals: [
          {
            id: 'goal_1',
            type: 'short_term',
            description: 'Reduce anxiety',
            measurableOutcome: 'Fewer episodes',
            status: 'not_started',
            progress: 0,
            interventionIds: [],
            sourceSessionIds: ['session_1'],
          },
        ],
        interventions: [
          {
            id: 'intervention_1',
            modality: 'CBT',
            name: 'Breathing',
            description: 'Deep breathing exercises',
            frequency: 'Daily',
            rationale: 'Reduces physiological anxiety',
          },
        ],
        strengths: [
          {
            id: 'strength_1',
            category: 'personal',
            description: 'High motivation',
            sourceSessionIds: ['session_1'],
          },
        ],
        risks: [],
        homework: [
          {
            id: 'homework_1',
            title: 'Practice breathing',
            description: '5 minutes daily',
            rationale: 'Build habit',
            goalIds: ['goal_1'],
            status: 'assigned',
          },
        ],
      };

      const result = validate(extractionOutputSchema, extraction);
      expect(result.success).toBe(true);
    });

    it('validates empty extraction', () => {
      const emptyExtraction = {
        concerns: [],
        impressions: [],
        suggestedDiagnoses: [],
        goals: [],
        interventions: [],
        strengths: [],
        risks: [],
        homework: [],
      };

      const result = validate(extractionOutputSchema, emptyExtraction);
      expect(result.success).toBe(true);
    });
  });

  describe('validation utilities', () => {
    it('validateOrThrow throws on invalid data', () => {
      const invalidData = { invalid: 'data' };

      expect(() => {
        validateOrThrow(presentingConcernSchema, invalidData);
      }).toThrow();
    });

    it('validateOrThrow returns data on valid input', () => {
      const validData = {
        id: 'concern_123',
        description: 'Valid concern',
        severity: 'mild',
        duration: '1 month',
        impact: 'Minimal',
        sourceSessionIds: [],
      };

      const result = validateOrThrow(presentingConcernSchema, validData);
      expect(result).toEqual(validData);
    });

    it('safeParse returns null on invalid data', () => {
      const invalidData = { invalid: 'data' };
      const result = safeParse(presentingConcernSchema, invalidData);
      expect(result).toBeNull();
    });

    it('safeParse returns data on valid input', () => {
      const validData = {
        id: 'concern_123',
        description: 'Valid concern',
        severity: 'severe',
        duration: '2 years',
        impact: 'Significant',
        sourceSessionIds: ['s1', 's2'],
      };

      const result = safeParse(presentingConcernSchema, validData);
      expect(result).toEqual(validData);
    });

    it('isValidFor returns correct boolean', () => {
      const validData = {
        id: 'goal_123',
        type: 'long_term',
        description: 'Test goal',
        measurableOutcome: 'Test outcome',
        status: 'achieved',
        progress: 100,
        interventionIds: [],
        sourceSessionIds: [],
      };

      const invalidData = { invalid: 'data' };

      expect(isValidFor(goalSchema, validData)).toBe(true);
      expect(isValidFor(goalSchema, invalidData)).toBe(false);
    });
  });

  describe('canonicalPlanSchema', () => {
    it('validates complete canonical plan', () => {
      const plan = {
        clientId: 'client_123',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
        version: 1,
        presentingConcerns: [
          {
            id: 'concern_1',
            description: 'Anxiety',
            severity: 'moderate',
            duration: '6 months',
            impact: 'Sleep issues',
            sourceSessionIds: ['session_1'],
          },
        ],
        clinicalImpressions: [],
        diagnoses: [],
        goals: [],
        interventions: [],
        strengths: [],
        riskFactors: [],
        homework: [],
        crisisAssessment: {
          severity: CrisisSeverity.NONE,
          lastAssessed: '2024-01-15T10:00:00.000Z',
          safetyPlanInPlace: false,
        },
        sessionReferences: [
          {
            sessionId: 'session_1',
            sessionNumber: 1,
            date: '2024-01-15T10:00:00.000Z',
            keyContributions: ['Initial assessment'],
          },
        ],
      };

      const result = validate(canonicalPlanSchema, plan);
      expect(result.success).toBe(true);
    });

    it('rejects plan with invalid version', () => {
      const plan = {
        clientId: 'client_123',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
        version: 0, // Invalid: must be positive
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
          lastAssessed: '2024-01-15T10:00:00.000Z',
          safetyPlanInPlace: false,
        },
        sessionReferences: [],
      };

      const result = validate(canonicalPlanSchema, plan);
      expect(result.success).toBe(false);
    });
  });
});

