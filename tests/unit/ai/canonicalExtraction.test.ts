import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrisisSeverity } from '@prisma/client';
import {
  createNewPlanFromExtraction,
  getExtractionSummary,
} from '@/lib/ai/stages/canonicalExtraction';
import {
  getExtractionPrompt,
  generateItemId,
  formatExtractionSummary,
} from '@/lib/ai/prompts/extraction';
import { SAMPLE_TRANSCRIPTS, SAMPLE_CANONICAL_PLAN } from '@/tests/mocks/data';
import type { ExtractionOutput, CanonicalPlan } from '@/lib/ai/types';

describe('Canonical Extraction', () => {
  describe('generateItemId', () => {
    it('generates unique IDs with correct prefix', () => {
      const id1 = generateItemId('concern', 0);
      const id2 = generateItemId('concern', 1);
      const id3 = generateItemId('goal', 0);

      expect(id1).toMatch(/^concern_\d+_0_[a-z0-9]+$/);
      expect(id2).toMatch(/^concern_\d+_1_[a-z0-9]+$/);
      expect(id3).toMatch(/^goal_\d+_0_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('uses different types correctly', () => {
      const types = ['concern', 'impression', 'diagnosis', 'goal', 'intervention', 'strength', 'risk', 'homework'];
      
      for (const type of types) {
        const id = generateItemId(type, 0);
        expect(id.startsWith(`${type}_`)).toBe(true);
      }
    });
  });

  describe('getExtractionPrompt', () => {
    it('includes session information', () => {
      const prompt = getExtractionPrompt({
        transcript: SAMPLE_TRANSCRIPTS.normal,
        sessionId: 'session_123',
        sessionNumber: 1,
      });

      expect(prompt).toContain('session_123');
      expect(prompt).toContain('Session Number: 1');
    });

    it('includes transcript content', () => {
      const prompt = getExtractionPrompt({
        transcript: SAMPLE_TRANSCRIPTS.withAnxiety,
        sessionId: 'session_456',
        sessionNumber: 2,
      });

      expect(prompt).toContain('anxiety');
      expect(prompt).toContain('overwhelming');
    });

    it('includes existing plan context when provided', () => {
      const prompt = getExtractionPrompt({
        transcript: SAMPLE_TRANSCRIPTS.normal,
        sessionId: 'session_789',
        sessionNumber: 3,
        existingPlan: SAMPLE_CANONICAL_PLAN as unknown as CanonicalPlan,
      });

      expect(prompt).toContain('Existing Treatment Plan Context');
      expect(prompt).toContain('Current Goals');
    });

    it('includes therapist preferences when provided', () => {
      const prompt = getExtractionPrompt({
        transcript: SAMPLE_TRANSCRIPTS.normal,
        sessionId: 'session_abc',
        sessionNumber: 1,
        preferences: {
          preferredModalities: ['CBT', 'DBT'],
          languageLevel: 'professional',
          includeIcdCodes: true,
          customInstructions: 'Focus on behavioral interventions',
        },
      });

      expect(prompt).toContain('Therapist Preferences');
      expect(prompt).toContain('CBT');
      expect(prompt).toContain('DBT');
      expect(prompt).toContain('Focus on behavioral interventions');
    });

    it('includes client context when provided', () => {
      const prompt = getExtractionPrompt({
        transcript: SAMPLE_TRANSCRIPTS.normal,
        sessionId: 'session_def',
        sessionNumber: 1,
        clientContext: '45-year-old female with history of depression',
      });

      expect(prompt).toContain('Client Context');
      expect(prompt).toContain('45-year-old female');
    });

    it('includes JSON schema structure', () => {
      const prompt = getExtractionPrompt({
        transcript: SAMPLE_TRANSCRIPTS.normal,
        sessionId: 'session_ghi',
        sessionNumber: 1,
      });

      expect(prompt).toContain('"concerns"');
      expect(prompt).toContain('"impressions"');
      expect(prompt).toContain('"suggestedDiagnoses"');
      expect(prompt).toContain('"goals"');
      expect(prompt).toContain('"interventions"');
      expect(prompt).toContain('"strengths"');
      expect(prompt).toContain('"risks"');
      expect(prompt).toContain('"homework"');
    });
  });

  describe('formatExtractionSummary', () => {
    it('formats extraction summary correctly', () => {
      const extraction = {
        concerns: [{ id: '1', description: 'test' }],
        impressions: [{ id: '1', observation: 'test' }, { id: '2', observation: 'test2' }],
        suggestedDiagnoses: [],
        goals: [{ id: '1', description: 'test' }],
        interventions: [],
        strengths: [{ id: '1', description: 'test' }],
        risks: [],
        homework: [{ id: '1', title: 'test' }],
      };

      const summary = formatExtractionSummary(extraction as unknown as ExtractionOutput);

      expect(summary).toContain('Concerns: 1');
      expect(summary).toContain('Impressions: 2');
      expect(summary).toContain('Diagnoses: 0');
      expect(summary).toContain('Goals: 1');
      expect(summary).toContain('Interventions: 0');
      expect(summary).toContain('Strengths: 1');
      expect(summary).toContain('Risks: 0');
      expect(summary).toContain('Homework: 1');
    });
  });

  describe('createNewPlanFromExtraction', () => {
    const mockExtraction: ExtractionOutput = {
      concerns: [
        {
          id: 'concern_1',
          description: 'Anxiety about work performance',
          severity: 'moderate',
          duration: '6 months',
          impact: 'Difficulty concentrating',
          sourceSessionIds: [],
        },
      ],
      impressions: [
        {
          id: 'impression_1',
          observation: 'Client appears engaged and motivated',
          category: 'Behavioral',
          sourceSessionIds: [],
        },
      ],
      suggestedDiagnoses: [
        {
          id: 'diagnosis_1',
          icdCode: 'F41.1',
          name: 'Generalized Anxiety Disorder',
          status: 'provisional',
          notes: 'Meets criteria based on reported symptoms',
        },
      ],
      goals: [
        {
          id: 'goal_1',
          type: 'short_term',
          description: 'Reduce anxiety frequency',
          measurableOutcome: 'Report 3 or fewer anxiety episodes per week',
          status: 'not_started',
          progress: 0,
          interventionIds: [],
          sourceSessionIds: [],
        },
      ],
      interventions: [
        {
          id: 'intervention_1',
          modality: 'CBT',
          name: 'Cognitive Restructuring',
          description: 'Challenge anxious thoughts',
          frequency: 'Weekly',
          rationale: 'Evidence-based for anxiety',
        },
      ],
      strengths: [
        {
          id: 'strength_1',
          category: 'personal',
          description: 'High motivation for change',
          sourceSessionIds: [],
        },
      ],
      risks: [],
      homework: [
        {
          id: 'homework_1',
          title: 'Thought Journal',
          description: 'Record anxious thoughts daily',
          rationale: 'Build awareness',
          goalIds: ['goal_1'],
          status: 'assigned',
        },
      ],
    };

    it('creates a valid canonical plan from extraction', () => {
      const plan = createNewPlanFromExtraction(
        'client_123',
        'session_456',
        mockExtraction
      );

      expect(plan.clientId).toBe('client_123');
      expect(plan.version).toBe(1);
      expect(plan.presentingConcerns).toHaveLength(1);
      expect(plan.clinicalImpressions).toHaveLength(1);
      expect(plan.diagnoses).toHaveLength(1);
      expect(plan.goals).toHaveLength(1);
      expect(plan.interventions).toHaveLength(1);
      expect(plan.strengths).toHaveLength(1);
      expect(plan.homework).toHaveLength(1);
    });

    it('sets correct session references', () => {
      const plan = createNewPlanFromExtraction(
        'client_123',
        'session_456',
        mockExtraction
      );

      expect(plan.sessionReferences).toHaveLength(1);
      expect(plan.sessionReferences[0].sessionId).toBe('session_456');
      expect(plan.sessionReferences[0].sessionNumber).toBe(1);
      expect(plan.sessionReferences[0].keyContributions.length).toBeGreaterThan(0);
    });

    it('adds sourceSessionIds to extracted items', () => {
      const plan = createNewPlanFromExtraction(
        'client_123',
        'session_456',
        mockExtraction
      );

      expect(plan.presentingConcerns[0].sourceSessionIds).toContain('session_456');
      expect(plan.clinicalImpressions[0].sourceSessionIds).toContain('session_456');
      expect(plan.goals[0].sourceSessionIds).toContain('session_456');
      expect(plan.strengths[0].sourceSessionIds).toContain('session_456');
    });

    it('sets crisis assessment to NONE when no risks', () => {
      const plan = createNewPlanFromExtraction(
        'client_123',
        'session_456',
        mockExtraction
      );

      expect(plan.crisisAssessment.severity).toBe(CrisisSeverity.NONE);
      expect(plan.crisisAssessment.safetyPlanInPlace).toBe(false);
    });

    it('sets crisis assessment based on highest risk', () => {
      const extractionWithRisk: ExtractionOutput = {
        ...mockExtraction,
        risks: [
          {
            id: 'risk_1',
            type: 'self_harm',
            description: 'History of self-harm',
            severity: 'MEDIUM',
            mitigatingFactors: ['No current urges'],
            sourceSessionIds: [],
          },
        ],
      };

      const plan = createNewPlanFromExtraction(
        'client_123',
        'session_456',
        extractionWithRisk
      );

      expect(plan.crisisAssessment.severity).toBe(CrisisSeverity.MEDIUM);
    });

    it('creates valid timestamps', () => {
      const plan = createNewPlanFromExtraction(
        'client_123',
        'session_456',
        mockExtraction
      );

      expect(new Date(plan.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
      expect(new Date(plan.updatedAt).getTime()).toBeLessThanOrEqual(Date.now());
      expect(plan.createdAt).toBe(plan.updatedAt);
    });
  });

  describe('getExtractionSummary', () => {
    it('returns formatted summary string', () => {
      const extraction: ExtractionOutput = {
        concerns: [{ id: '1' } as ExtractionOutput['concerns'][0]],
        impressions: [],
        suggestedDiagnoses: [{ id: '1' } as ExtractionOutput['suggestedDiagnoses'][0]],
        goals: [{ id: '1' } as ExtractionOutput['goals'][0], { id: '2' } as ExtractionOutput['goals'][0]],
        interventions: [],
        strengths: [],
        risks: [],
        homework: [],
      };

      const summary = getExtractionSummary(extraction);

      expect(summary).toContain('Extraction Summary');
      expect(summary).toContain('Concerns: 1');
      expect(summary).toContain('Diagnoses: 1');
      expect(summary).toContain('Goals: 2');
    });
  });
});

describe('Extraction Edge Cases', () => {
  it('handles empty extraction', () => {
    const emptyExtraction: ExtractionOutput = {
      concerns: [],
      impressions: [],
      suggestedDiagnoses: [],
      goals: [],
      interventions: [],
      strengths: [],
      risks: [],
      homework: [],
    };

    const plan = createNewPlanFromExtraction(
      'client_123',
      'session_456',
      emptyExtraction
    );

    expect(plan.presentingConcerns).toHaveLength(0);
    expect(plan.goals).toHaveLength(0);
    expect(plan.sessionReferences[0].keyContributions).toEqual(['Session documented']);
  });

  it('handles extraction with all risk severities', () => {
    const severities: Array<'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    
    for (const severity of severities) {
      const extraction: ExtractionOutput = {
        concerns: [],
        impressions: [],
        suggestedDiagnoses: [],
        goals: [],
        interventions: [],
        strengths: [],
        risks: [{
          id: 'risk_1',
          type: 'other',
          description: 'Test risk',
          severity,
          mitigatingFactors: [],
          sourceSessionIds: [],
        }],
        homework: [],
      };

      const plan = createNewPlanFromExtraction('client', 'session', extraction);
      expect(plan.crisisAssessment.severity).toBe(severity);
    }
  });

  it('handles long transcript prompt generation', () => {
    const longTranscript = 'A'.repeat(50000);
    
    const prompt = getExtractionPrompt({
      transcript: longTranscript,
      sessionId: 'session_long',
      sessionNumber: 1,
    });

    // Prompt should be generated without error
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('session_long');
  });
});

