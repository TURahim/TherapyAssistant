import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrisisSeverity } from '@prisma/client';
import {
  validateClientViewReadingLevel,
  simplifyClientView,
  generateGreeting,
  getCelebrationMessage,
} from '@/lib/ai/stages/clientViewGen';
import {
  getClientViewPrompt,
  simplifyText,
  goalToPlainLanguage,
  generateEncouragingMessage,
  generateStrengthAcknowledgment,
  isAppropriateForClient,
  getPlainAlternative,
  CLIENT_VIEW_SYSTEM_PROMPT,
  getClientViewSummary,
} from '@/lib/ai/prompts/clientView';
import type { CanonicalPlan, ClientView } from '@/lib/ai/types';

describe('Client View Generation', () => {
  describe('simplifyText', () => {
    it('replaces clinical terms with simpler alternatives', () => {
      expect(simplifyText('anxiety disorder')).toContain('worry');
      expect(simplifyText('depression')).toContain('feeling down');
      expect(simplifyText('therapeutic intervention')).not.toContain('therapeutic');
      expect(simplifyText('cognitive behavioral')).not.toContain('cognitive');
    });

    it('handles mixed case', () => {
      expect(simplifyText('Anxiety Disorder')).toContain('worry');
      expect(simplifyText('DEPRESSION')).toContain('feeling down');
    });

    it('preserves simple text', () => {
      const simple = 'You are doing great work.';
      expect(simplifyText(simple)).toBe(simple);
    });

    it('handles multiple replacements', () => {
      const complex = 'The cognitive intervention addressed the behavioral symptom.';
      const simplified = simplifyText(complex);
      expect(simplified).not.toContain('cognitive');
      expect(simplified).not.toContain('intervention');
      expect(simplified).not.toContain('behavioral');
      expect(simplified).not.toContain('symptom');
    });
  });

  describe('goalToPlainLanguage', () => {
    it('simplifies goal description', () => {
      const goal = {
        id: 'g1',
        type: 'short_term' as const,
        description: 'Reduce anxiety disorder symptoms using cognitive methods',
        measurableOutcome: 'Test',
        status: 'in_progress' as const,
        progress: 50,
        interventionIds: [],
        sourceSessionIds: [],
      };
      const plain = goalToPlainLanguage(goal);
      // simplifyText replaces clinical terms using regex patterns
      expect(plain.toLowerCase()).toContain('thinking'); // cognitive -> thinking
      expect(plain.toLowerCase()).toContain('worry'); // "anxiety disorder" -> "worry and stress"
    });

    it('adds progress encouragement for high progress', () => {
      const goal = {
        id: 'g1',
        type: 'short_term' as const,
        description: 'Test goal',
        measurableOutcome: 'Test',
        status: 'in_progress' as const,
        progress: 80,
        interventionIds: [],
        sourceSessionIds: [],
      };
      const plain = goalToPlainLanguage(goal);
      expect(plain).toContain('almost there');
    });

    it('adds progress encouragement for medium progress', () => {
      const goal = {
        id: 'g1',
        type: 'short_term' as const,
        description: 'Test goal',
        measurableOutcome: 'Test',
        status: 'in_progress' as const,
        progress: 60,
        interventionIds: [],
        sourceSessionIds: [],
      };
      const plain = goalToPlainLanguage(goal);
      expect(plain).toContain('great progress');
    });
  });

  describe('generateEncouragingMessage', () => {
    it('generates message for high progress', () => {
      const message = generateEncouragingMessage(80, 'Sarah');
      expect(message).toContain('Sarah');
      expect(message.toLowerCase()).toContain('amazing');
    });

    it('generates message for medium progress', () => {
      const message = generateEncouragingMessage(55, 'John');
      expect(message).toContain('John');
      expect(message.toLowerCase()).toContain('great progress');
    });

    it('generates message for low progress', () => {
      const message = generateEncouragingMessage(20, 'Mike');
      expect(message).toContain('Mike');
      // 20% falls in the 1-25% range, so should mention "first steps" or "courage"
      expect(message.toLowerCase()).toMatch(/first|steps|courage|begun/);
    });

    it('generates message for no progress', () => {
      const message = generateEncouragingMessage(0, 'Lisa');
      expect(message).toContain('Lisa');
      expect(message.toLowerCase()).toContain('journey');
    });
  });

  describe('generateStrengthAcknowledgment', () => {
    it('includes client name', () => {
      const ack = generateStrengthAcknowledgment([], 'Alex');
      expect(ack).toContain('Alex');
    });

    it('acknowledges provided strengths', () => {
      const strengths = [
        {
          id: 's1',
          category: 'personal' as const,
          description: 'Strong motivation',
          sourceSessionIds: [],
        },
        {
          id: 's2',
          category: 'social' as const,
          description: 'Supportive family',
          sourceSessionIds: [],
        },
      ];
      const ack = generateStrengthAcknowledgment(strengths, 'Sam');
      expect(ack).toContain('motivation');
      expect(ack).toContain('family');
    });

    it('provides default acknowledgment when no strengths', () => {
      const ack = generateStrengthAcknowledgment([], 'Kim');
      expect(ack).toContain('strength');
    });
  });

  describe('isAppropriateForClient', () => {
    it('accepts simple, client-friendly text', () => {
      expect(isAppropriateForClient('You are doing great work.')).toBe(true);
      expect(isAppropriateForClient('Keep up the good effort!')).toBe(true);
      expect(isAppropriateForClient('Your progress is wonderful.')).toBe(true);
    });

    it('rejects clinical terminology', () => {
      expect(isAppropriateForClient('suicidal ideation')).toBe(false);
      expect(isAppropriateForClient('psychotic symptoms')).toBe(false);
      expect(isAppropriateForClient('comorbid conditions')).toBe(false);
      expect(isAppropriateForClient('differential diagnosis required')).toBe(false);
      expect(isAppropriateForClient('ICD-10 F41.1')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isAppropriateForClient('SUICIDAL thoughts')).toBe(false);
      expect(isAppropriateForClient('Psychosis')).toBe(false);
    });
  });

  describe('getPlainAlternative', () => {
    it('provides alternatives for clinical terms', () => {
      expect(getPlainAlternative('anxiety')).toBe('worry');
      expect(getPlainAlternative('depression')).toBe('feeling down');
      expect(getPlainAlternative('symptom')).toBe('experience');
      expect(getPlainAlternative('treatment')).toBe('our work together');
    });

    it('returns original term if no alternative', () => {
      expect(getPlainAlternative('happiness')).toBe('happiness');
      expect(getPlainAlternative('success')).toBe('success');
    });

    it('is case insensitive', () => {
      expect(getPlainAlternative('ANXIETY')).toBe('worry');
      expect(getPlainAlternative('Depression')).toBe('feeling down');
    });
  });

  describe('getCelebrationMessage', () => {
    it('returns completion message at 100%', () => {
      expect(getCelebrationMessage(100)).toContain('did it');
    });

    it('returns almost there message at 75%+', () => {
      expect(getCelebrationMessage(80)).toContain('Almost there');
    });

    it('returns halfway message at 50%+', () => {
      expect(getCelebrationMessage(60)).toContain('halfway');
    });

    it('returns started message at 25%+', () => {
      expect(getCelebrationMessage(30)).toContain('good start');
    });

    it('returns begun message at 1%+', () => {
      expect(getCelebrationMessage(10)).toContain('begun');
    });

    it('returns undefined at 0%', () => {
      expect(getCelebrationMessage(0)).toBeUndefined();
    });
  });

  describe('generateGreeting', () => {
    it('includes client name', () => {
      const greeting = generateGreeting('Emma', 50, 'warm');
      expect(greeting).toContain('Emma');
    });

    it('generates warm greetings', () => {
      const greeting = generateGreeting('Test', 50, 'warm');
      expect(greeting.toLowerCase()).toMatch(/hi|welcome|great/);
    });

    it('generates encouraging greetings', () => {
      const greeting = generateGreeting('Test', 50, 'encouraging');
      // Encouraging greetings mention forward steps, effort, etc.
      expect(greeting.toLowerCase()).toMatch(/great|amazing|hello|step|effort/);
    });

    it('generates matter-of-fact greetings', () => {
      const greeting = generateGreeting('Test', 50, 'matter-of-fact');
      expect(greeting.toLowerCase()).toMatch(/hello|hi/);
    });
  });

  describe('getClientViewPrompt', () => {
    it('includes client first name', () => {
      const prompt = getClientViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientFirstName: 'Sarah',
      });
      expect(prompt).toContain('Sarah');
    });

    it('includes target reading level', () => {
      const prompt = getClientViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientFirstName: 'Test',
        targetReadingLevel: 6,
      });
      expect(prompt).toContain('6th grade');
    });

    it('includes tone instructions', () => {
      const warm = getClientViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientFirstName: 'Test',
        tone: 'warm',
      });
      expect(warm).toContain('Warm');

      const encouraging = getClientViewPrompt({
        canonicalPlan: createMinimalPlan(),
        clientFirstName: 'Test',
        tone: 'encouraging',
      });
      expect(encouraging).toContain('Encouraging');
    });

    it('includes strengths from plan', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        strengths: [
          {
            id: 's1',
            category: 'personal',
            description: 'High motivation',
            sourceSessionIds: [],
          },
        ],
      };
      const prompt = getClientViewPrompt({
        canonicalPlan: plan,
        clientFirstName: 'Test',
      });
      expect(prompt).toContain('High motivation');
    });

    it('includes goals from plan', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        goals: [
          {
            id: 'g1',
            type: 'short_term',
            description: 'Reduce stress',
            measurableOutcome: 'Test',
            status: 'in_progress',
            progress: 30,
            interventionIds: [],
            sourceSessionIds: [],
          },
        ],
      };
      const prompt = getClientViewPrompt({
        canonicalPlan: plan,
        clientFirstName: 'Test',
      });
      expect(prompt).toContain('Reduce stress');
      expect(prompt).toContain('30%');
    });

    it('includes homework from plan', () => {
      const plan: CanonicalPlan = {
        ...createMinimalPlan(),
        homework: [
          {
            id: 'h1',
            title: 'Daily journal',
            description: 'Write about your feelings',
            rationale: 'Test',
            goalIds: [],
            status: 'assigned',
          },
        ],
      };
      const prompt = getClientViewPrompt({
        canonicalPlan: plan,
        clientFirstName: 'Test',
      });
      expect(prompt).toContain('Daily journal');
    });
  });

  describe('validateClientViewReadingLevel', () => {
    it('validates simple client view as acceptable', () => {
      const view: ClientView = createSimpleClientView();
      const validation = validateClientViewReadingLevel(view);
      expect(validation.gradeLevel).toBeLessThanOrEqual(10);
    });

    it('provides issues for complex text', () => {
      const view: ClientView = {
        ...createSimpleClientView(),
        overview: {
          whatWeAreWorkingOn: 'The implementation of comprehensive psychotherapeutic interventions requires sophisticated understanding.',
          whyThisMatters: 'Neurobiological mechanisms and differential diagnostic methodologies are essential.',
          yourStrengths: ['Sophisticated analytical capabilities'],
        },
      };
      const validation = validateClientViewReadingLevel(view);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('simplifyClientView', () => {
    it('simplifies all text fields', () => {
      const view: ClientView = {
        header: {
          greeting: 'The therapeutic intervention begins.',
          lastUpdated: '2024-01-01',
        },
        overview: {
          whatWeAreWorkingOn: 'Cognitive behavioral modifications.',
          whyThisMatters: 'Symptom reduction is essential.',
          yourStrengths: ['Therapeutic engagement'],
        },
        goals: [
          {
            id: 'g1',
            title: 'Behavioral modification',
            description: 'Cognitive restructuring of anxious thoughts.',
            progress: 50,
          },
        ],
        nextSteps: [
          {
            step: 'Implement intervention',
            why: 'Therapeutic benefit',
          },
        ],
        homework: [
          {
            id: 'h1',
            title: 'Cognitive exercise',
            description: 'Practice thought restructuring',
            status: 'assigned',
          },
        ],
        encouragement: {
          progressMessage: 'Therapeutic progress observed.',
        },
      };

      const simplified = simplifyClientView(view);
      
      expect(simplified.header.greeting).not.toContain('therapeutic');
      expect(simplified.overview.whatWeAreWorkingOn).not.toContain('Cognitive');
    });
  });

  describe('getClientViewSummary', () => {
    it('includes goal count', () => {
      const view = {
        goals: [{}, {}],
        homework: [],
        encouragement: { progressMessage: 'Test' },
      };
      const summary = getClientViewSummary(view);
      expect(summary).toContain('Goals: 2');
    });

    it('includes homework count', () => {
      const view = {
        goals: [],
        homework: [{}, {}, {}],
        encouragement: { progressMessage: 'Test' },
      };
      const summary = getClientViewSummary(view);
      expect(summary).toContain('Homework Items: 3');
    });

    it('confirms encouragement included', () => {
      const view = {
        goals: [],
        homework: [],
        encouragement: { progressMessage: 'Great job!' },
      };
      const summary = getClientViewSummary(view);
      expect(summary).toContain('Encouragement included: Yes');
    });
  });

  describe('CLIENT_VIEW_SYSTEM_PROMPT', () => {
    it('emphasizes warm and supportive tone', () => {
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('warm');
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('support');
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('encouraging');
    });

    it('specifies reading level requirements', () => {
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('6th');
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('8th');
      // Should mention Grade or reading level
      expect(CLIENT_VIEW_SYSTEM_PROMPT.toLowerCase()).toMatch(/grade|reading level/);
    });

    it('lists terms to avoid', () => {
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('intervention');
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('cognitive');
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('symptom');
    });

    it('emphasizes what to avoid', () => {
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('AVOID');
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('jargon');
    });

    it('mentions JSON output', () => {
      expect(CLIENT_VIEW_SYSTEM_PROMPT).toContain('JSON');
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

function createSimpleClientView(): ClientView {
  return {
    header: {
      greeting: 'Hi there! Good to see you.',
      lastUpdated: '2024-01-01T00:00:00Z',
    },
    overview: {
      whatWeAreWorkingOn: 'We are working on feeling better day by day.',
      whyThisMatters: 'This helps you live the life you want.',
      yourStrengths: ['You showed up', 'You want to change'],
    },
    goals: [
      {
        id: 'g1',
        title: 'Feel less stress',
        description: 'Learn ways to feel calm when things get hard.',
        progress: 30,
      },
    ],
    nextSteps: [
      {
        step: 'Try the breathing exercise',
        why: 'It helps you feel calm.',
      },
    ],
    homework: [
      {
        id: 'h1',
        title: 'Daily deep breaths',
        description: 'Take 5 deep breaths each morning.',
        tip: 'Set a reminder on your phone.',
        status: 'assigned',
      },
    ],
    encouragement: {
      progressMessage: 'You are doing great! Keep it up.',
      celebrationPoints: ['You tried something new'],
    },
  };
}

