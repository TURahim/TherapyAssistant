import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrisisSeverity } from '@prisma/client';
import {
  formatRiskLevel,
  formatGoalStatus,
  formatDiagnosisStatus,
  determinePlanStatus,
  generateProgressSummary,
} from '@/lib/ai/stages/therapistViewGen';
import {
  getTherapistViewPrompt,
  generatePresentingProblemsSummary,
  generateDiagnosticFormulation,
  generateTreatmentRationale,
  getTherapistViewSummary,
  THERAPIST_VIEW_SYSTEM_PROMPT,
} from '@/lib/ai/prompts/therapistView';
import { SAMPLE_CANONICAL_PLAN } from '@/tests/mocks/data';
import type { CanonicalPlan } from '@/lib/ai/types';

describe('Therapist View Generation', () => {
  describe('formatRiskLevel', () => {
    it('formats all severity levels correctly', () => {
      expect(formatRiskLevel('NONE')).toBe('None');
      expect(formatRiskLevel('LOW')).toBe('Low');
      expect(formatRiskLevel('MEDIUM')).toBe('Moderate');
      expect(formatRiskLevel('HIGH')).toBe('High');
      expect(formatRiskLevel('CRITICAL')).toBe('Critical');
    });

    it('handles unknown severity', () => {
      expect(formatRiskLevel('UNKNOWN')).toBe('Unknown');
    });
  });

  describe('formatGoalStatus', () => {
    it('formats all goal statuses correctly', () => {
      expect(formatGoalStatus('not_started')).toBe('Not Started');
      expect(formatGoalStatus('in_progress')).toBe('In Progress');
      expect(formatGoalStatus('achieved')).toBe('Achieved');
      expect(formatGoalStatus('revised')).toBe('Revised');
    });

    it('returns original status for unknown values', () => {
      expect(formatGoalStatus('custom_status')).toBe('custom_status');
    });
  });

  describe('formatDiagnosisStatus', () => {
    it('formats all diagnosis statuses correctly', () => {
      expect(formatDiagnosisStatus('provisional')).toBe('Provisional');
      expect(formatDiagnosisStatus('confirmed')).toBe('Confirmed');
      expect(formatDiagnosisStatus('rule_out')).toBe('Rule Out');
    });

    it('returns original status for unknown values', () => {
      expect(formatDiagnosisStatus('unknown')).toBe('unknown');
    });
  });

  describe('determinePlanStatus', () => {
    it('returns Complete when all goals are achieved', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        goals: [
          { ...createMinimalGoal(), status: 'achieved' },
          { ...createMinimalGoal(), status: 'achieved' },
        ],
      };
      expect(determinePlanStatus(plan)).toBe('Complete');
    });

    it('returns Active when goals are in progress', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        goals: [
          { ...createMinimalGoal(), status: 'in_progress' },
        ],
      };
      expect(determinePlanStatus(plan)).toBe('Active');
    });

    it('returns Active when there are interventions', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        interventions: [
          {
            id: 'int_1',
            modality: 'CBT',
            name: 'Cognitive Restructuring',
            description: 'Test',
            frequency: 'Weekly',
            rationale: 'Test',
          },
        ],
      };
      expect(determinePlanStatus(plan)).toBe('Active');
    });

    it('returns Draft when no goals or interventions', () => {
      const plan: CanonicalPlan = createMinimalPlan();
      expect(determinePlanStatus(plan)).toBe('Draft');
    });
  });

  describe('generateProgressSummary', () => {
    it('includes goal count in summary', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        goals: [
          { ...createMinimalGoal(), status: 'in_progress', progress: 50 },
          { ...createMinimalGoal(), status: 'achieved', progress: 100 },
        ],
      };
      const summary = generateProgressSummary(plan);
      expect(summary).toContain('2 goal(s)');
    });

    it('includes achieved goals count', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        goals: [
          { ...createMinimalGoal(), status: 'achieved', progress: 100 },
        ],
      };
      const summary = generateProgressSummary(plan);
      expect(summary).toContain('1 achieved');
    });

    it('includes in progress goals count', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        goals: [
          { ...createMinimalGoal(), status: 'in_progress', progress: 50 },
        ],
      };
      const summary = generateProgressSummary(plan);
      expect(summary).toContain('1 in progress');
    });

    it('includes overall progress percentage', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        goals: [
          { ...createMinimalGoal(), progress: 50 },
          { ...createMinimalGoal(), progress: 100 },
        ],
      };
      const summary = generateProgressSummary(plan);
      expect(summary).toContain('75%');
    });

    it('includes session count', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        sessionReferences: [
          { sessionId: '1', sessionNumber: 1, date: '2024-01-01', keyContributions: [] },
          { sessionId: '2', sessionNumber: 2, date: '2024-01-08', keyContributions: [] },
        ],
      };
      const summary = generateProgressSummary(plan);
      expect(summary).toContain('2 session(s)');
    });

    it('handles empty goals', () => {
      const plan: CanonicalPlan = createMinimalPlan();
      const summary = generateProgressSummary(plan);
      expect(summary).toContain('Treatment goals to be established');
    });
  });

  describe('getTherapistViewPrompt', () => {
    it('includes client name', () => {
      const prompt = getTherapistViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientName: 'John Doe',
      });
      expect(prompt).toContain('John Doe');
    });

    it('includes plan version', () => {
      const plan = { ...createMinimalPlan(), version: 3 };
      const prompt = getTherapistViewPrompt({
        canonicalPlan: plan,
        clientName: 'Test',
      });
      expect(prompt).toContain('3');
    });

    it('includes ICD code instruction based on preference', () => {
      const withCodes = getTherapistViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientName: 'Test',
        includeIcdCodes: true,
      });
      expect(withCodes).toContain('Include ICD-10 codes');

      const withoutCodes = getTherapistViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientName: 'Test',
        includeIcdCodes: false,
      });
      expect(withoutCodes).toContain('Omit ICD-10 codes');
    });

    it('includes language level instructions', () => {
      const professional = getTherapistViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientName: 'Test',
        languageLevel: 'professional',
      });
      expect(professional).toContain('professional');

      const conversational = getTherapistViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientName: 'Test',
        languageLevel: 'conversational',
      });
      expect(conversational).toContain('conversational');
    });

    it('includes canonical plan JSON', () => {
      const plan = createMinimalPlan();
      const prompt = getTherapistViewPrompt({
        canonicalPlan: plan,
        clientName: 'Test',
      });
      expect(prompt).toContain('"clientId"');
      expect(prompt).toContain('"version"');
    });

    it('includes therapist preferences when provided', () => {
      const prompt = getTherapistViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientName: 'Test',
        preferences: {
          preferredModalities: ['CBT', 'DBT'],
          languageLevel: 'professional',
          includeIcdCodes: true,
          customInstructions: 'Focus on anxiety',
        },
      });
      expect(prompt).toContain('CBT');
      expect(prompt).toContain('DBT');
      expect(prompt).toContain('Focus on anxiety');
    });
  });

  describe('generatePresentingProblemsSummary', () => {
    it('returns default message for empty concerns', () => {
      const summary = generatePresentingProblemsSummary([]);
      expect(summary).toBe('No presenting concerns documented.');
    });

    it('includes concern details', () => {
      const concerns = [
        {
          id: 'c1',
          description: 'Anxiety about work',
          severity: 'moderate' as const,
          duration: '6 months',
          impact: 'Difficulty sleeping',
          sourceSessionIds: [],
        },
      ];
      const summary = generatePresentingProblemsSummary(concerns);
      expect(summary).toContain('Anxiety about work');
      expect(summary).toContain('Moderate');
      expect(summary).toContain('6 months');
      expect(summary).toContain('Difficulty sleeping');
    });

    it('combines multiple concerns', () => {
      const concerns = [
        {
          id: 'c1',
          description: 'Anxiety',
          severity: 'mild' as const,
          duration: '1 month',
          impact: 'Mild impact',
          sourceSessionIds: [],
        },
        {
          id: 'c2',
          description: 'Depression',
          severity: 'moderate' as const,
          duration: '3 months',
          impact: 'Moderate impact',
          sourceSessionIds: [],
        },
      ];
      const summary = generatePresentingProblemsSummary(concerns);
      expect(summary).toContain('Anxiety');
      expect(summary).toContain('Depression');
    });
  });

  describe('generateDiagnosticFormulation', () => {
    it('returns default message for empty inputs', () => {
      const formulation = generateDiagnosticFormulation([], []);
      expect(formulation).toBe('No diagnostic information available.');
    });

    it('includes diagnoses', () => {
      const diagnoses = [
        {
          id: 'd1',
          name: 'Generalized Anxiety Disorder',
          icdCode: 'F41.1',
          status: 'confirmed' as const,
        },
      ];
      const formulation = generateDiagnosticFormulation(diagnoses, []);
      expect(formulation).toContain('Generalized Anxiety Disorder');
      expect(formulation).toContain('F41.1');
      expect(formulation).toContain('Confirmed');
    });

    it('includes clinical impressions by category', () => {
      const impressions = [
        {
          id: 'i1',
          observation: 'Anxious presentation',
          category: 'Emotional' as const,
          sourceSessionIds: [],
        },
        {
          id: 'i2',
          observation: 'Avoidant behavior',
          category: 'Behavioral' as const,
          sourceSessionIds: [],
        },
      ];
      const formulation = generateDiagnosticFormulation([], impressions);
      expect(formulation).toContain('Emotional');
      expect(formulation).toContain('Behavioral');
      expect(formulation).toContain('Anxious presentation');
      expect(formulation).toContain('Avoidant behavior');
    });
  });

  describe('generateTreatmentRationale', () => {
    it('returns default message for empty interventions', () => {
      const rationale = generateTreatmentRationale([]);
      expect(rationale).toBe('Treatment approach to be determined.');
    });

    it('includes modalities', () => {
      const interventions = [
        {
          id: 'int1',
          modality: 'CBT',
          name: 'Cognitive Restructuring',
          description: 'Test',
          frequency: 'Weekly',
          rationale: 'Evidence-based for anxiety',
        },
      ];
      const rationale = generateTreatmentRationale(interventions);
      expect(rationale).toContain('CBT');
      expect(rationale).toContain('Evidence-based for anxiety');
    });

    it('combines multiple modalities', () => {
      const interventions = [
        {
          id: 'int1',
          modality: 'CBT',
          name: 'Test',
          description: 'Test',
          frequency: 'Weekly',
          rationale: '',
        },
        {
          id: 'int2',
          modality: 'DBT',
          name: 'Test',
          description: 'Test',
          frequency: 'Weekly',
          rationale: '',
        },
      ];
      const rationale = generateTreatmentRationale(interventions);
      expect(rationale).toContain('CBT');
      expect(rationale).toContain('DBT');
    });
  });

  describe('getTherapistViewSummary', () => {
    it('includes goal counts', () => {
      const view = {
        treatmentGoals: {
          shortTerm: [{ id: '1' }, { id: '2' }],
          longTerm: [{ id: '3' }],
        },
        interventionPlan: [],
        homework: [],
        riskAssessment: { currentLevel: 'None' },
      };
      const summary = getTherapistViewSummary(view);
      expect(summary).toContain('Short-term Goals: 2');
      expect(summary).toContain('Long-term Goals: 1');
    });

    it('includes intervention count', () => {
      const view = {
        treatmentGoals: { shortTerm: [], longTerm: [] },
        interventionPlan: [{ id: '1' }, { id: '2' }],
        homework: [],
        riskAssessment: { currentLevel: 'None' },
      };
      const summary = getTherapistViewSummary(view);
      expect(summary).toContain('Interventions: 2');
    });

    it('includes homework count', () => {
      const view = {
        treatmentGoals: { shortTerm: [], longTerm: [] },
        interventionPlan: [],
        homework: [{ id: '1' }],
        riskAssessment: { currentLevel: 'None' },
      };
      const summary = getTherapistViewSummary(view);
      expect(summary).toContain('Homework Items: 1');
    });

    it('includes risk level', () => {
      const view = {
        treatmentGoals: { shortTerm: [], longTerm: [] },
        interventionPlan: [],
        homework: [],
        riskAssessment: { currentLevel: 'Low' },
      };
      const summary = getTherapistViewSummary(view);
      expect(summary).toContain('Risk Level: Low');
    });
  });

  describe('THERAPIST_VIEW_SYSTEM_PROMPT', () => {
    it('contains clinical documentation context', () => {
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('clinical');
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('documentation');
    });

    it('mentions output requirements', () => {
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('Clinical Summary');
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('Treatment Goals');
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('Risk Assessment');
    });

    it('mentions professional language', () => {
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('professional');
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('clinical terminology');
    });

    it('mentions JSON output format', () => {
      expect(THERAPIST_VIEW_SYSTEM_PROMPT).toContain('JSON');
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMinimalPlan(): CanonicalPlan {
  return {
    clientId: 'client_test',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
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
      lastAssessed: '2024-01-01T00:00:00Z',
      safetyPlanInPlace: false,
    },
    sessionReferences: [],
  };
}

function createMinimalGoal() {
  return {
    id: 'goal_test',
    type: 'short_term' as const,
    description: 'Test goal',
    measurableOutcome: 'Test outcome',
    status: 'not_started' as const,
    progress: 0,
    interventionIds: [],
    sourceSessionIds: [],
  };
}

