import { CrisisSeverity } from '@prisma/client';
import type {
  CanonicalPlanInput,
  CrisisAssessmentInput,
  CrisisIndicatorType,
  SessionReferenceInput,
} from '../lib/ai/schemas';
import type { CrisisCheckResult } from '../lib/ai/schemas';
import type { TokenUsage } from '../lib/ai/types';

export interface EvaluationModelOutput {
  canonicalPlan: CanonicalPlanInput;
  clientViewText: string;
  crisisResult: CrisisCheckResult;
  tokenUsage?: TokenUsage;
  latencyMs?: number;
}

export interface EvaluationSample {
  id: string;
  transcript: string;
  groundTruth: {
    severity: CrisisSeverity;
    indicators: CrisisIndicatorType[];
  };
  models: Record<string, EvaluationModelOutput>;
}

type SampleDefinition = {
  id: string;
  transcript: string;
  severity: CrisisSeverity;
  indicators: CrisisIndicatorType[];
  baselineMissing?: Array<'strengths' | 'homework' | 'sessionReferences' | 'interventions'>;
  baselineIndicators?: CrisisIndicatorType[];
  candidateIndicators?: CrisisIndicatorType[];
  baselineSeverity?: CrisisSeverity;
  candidateSeverity?: CrisisSeverity;
};

const SAMPLE_DEFINITIONS: SampleDefinition[] = [
  {
    id: 'eval-01',
    transcript: 'Client reports persistent work anxiety and tight deadlines causing sleep disruption. No crisis language expressed.',
    severity: CrisisSeverity.NONE,
    indicators: [],
    baselineMissing: ['strengths'],
  },
  {
    id: 'eval-02',
    transcript: 'Client is anxious about an upcoming presentation and avoids team meetings. Denies self-harm.',
    severity: CrisisSeverity.NONE,
    indicators: [],
    baselineMissing: ['sessionReferences'],
  },
  {
    id: 'eval-03',
    transcript: 'Client describes low mood and ruminations after a breakup. Eating patterns stable, no safety concerns.',
    severity: CrisisSeverity.NONE,
    indicators: [],
    baselineMissing: ['homework'],
  },
  {
    id: 'eval-04',
    transcript: 'Client notes panic spikes in crowded stores and uses breathing to cope. No suicidal thoughts reported.',
    severity: CrisisSeverity.NONE,
    indicators: [],
  },
  {
    id: 'eval-05',
    transcript: 'Client shared passive thoughts of wanting to disappear and said, "sometimes I wish I did not wake up." No plan disclosed.',
    severity: CrisisSeverity.MEDIUM,
    indicators: ['suicidal_ideation'],
    baselineIndicators: [],
  },
  {
    id: 'eval-06',
    transcript: 'Client relapsed on alcohol last weekend and drove while impaired. Expressed shame and fear of consequences.',
    severity: CrisisSeverity.MEDIUM,
    indicators: ['substance_emergency'],
    baselineMissing: ['homework'],
  },
  {
    id: 'eval-07',
    transcript: 'Client reports panic attacks twice weekly with chest tightness; denies self-harm.',
    severity: CrisisSeverity.LOW,
    indicators: [],
    baselineMissing: ['strengths'],
  },
  {
    id: 'eval-08',
    transcript: 'Client describes nightmares about a past assault and startle responses. Mentions "feeling on edge."',
    severity: CrisisSeverity.MEDIUM,
    indicators: ['other_crisis'],
  },
  {
    id: 'eval-09',
    transcript: 'Client notes obsessive checking of locks before sleep; feels embarrassed but no danger concerns.',
    severity: CrisisSeverity.NONE,
    indicators: [],
    baselineMissing: ['interventions'],
  },
  {
    id: 'eval-10',
    transcript: 'Client stated, "I thought about taking all my pills two nights ago but called my sister instead." Safety plan discussed.',
    severity: CrisisSeverity.HIGH,
    indicators: ['suicidal_plan', 'suicidal_intent'],
    baselineIndicators: ['suicidal_plan'],
    baselineSeverity: CrisisSeverity.MEDIUM,
  },
  {
    id: 'eval-11',
    transcript: 'Client reports chronic pain increasing irritability; no suicidal intent.',
    severity: CrisisSeverity.NONE,
    indicators: [],
  },
  {
    id: 'eval-12',
    transcript: 'Client processing relationship conflict; occasional insomnia; denies self-harm.',
    severity: CrisisSeverity.NONE,
    indicators: [],
  },
  {
    id: 'eval-13',
    transcript: 'Client reported anger surges and once thought "I could hurt someone if pushed," but denied intent.',
    severity: CrisisSeverity.MEDIUM,
    indicators: ['homicidal_ideation'],
    baselineIndicators: [],
  },
  {
    id: 'eval-14',
    transcript: 'Client hearing whispers telling them they are unsafe; feels watched when walking home.',
    severity: CrisisSeverity.HIGH,
    indicators: ['psychotic_symptoms'],
    baselineSeverity: CrisisSeverity.MEDIUM,
  },
  {
    id: 'eval-15',
    transcript: 'Client admitted to scratching their arm until bleeding when anxious last week; no current intent.',
    severity: CrisisSeverity.HIGH,
    indicators: ['self_harm'],
  },
  {
    id: 'eval-16',
    transcript: 'Client working through trauma triggers; grounding techniques helpful; no safety concerns.',
    severity: CrisisSeverity.NONE,
    indicators: [],
    baselineMissing: ['sessionReferences'],
  },
  {
    id: 'eval-17',
    transcript: 'Client with ADHD struggles to finish tasks; reports shame but no harmful intent.',
    severity: CrisisSeverity.NONE,
    indicators: [],
  },
  {
    id: 'eval-18',
    transcript: 'Client describes persistent sadness, low motivation, and sleeping 10+ hours; denies self-harm.',
    severity: CrisisSeverity.NONE,
    indicators: [],
  },
  {
    id: 'eval-19',
    transcript: 'Client restricts food intake and intense guilt after meals; fleeting thoughts of self-punishment but no plan.',
    severity: CrisisSeverity.MEDIUM,
    indicators: ['self_harm'],
    baselineMissing: ['interventions'],
  },
  {
    id: 'eval-20',
    transcript: 'Client preparing for graduation; mild stress about job search; excited for future; no crisis.',
    severity: CrisisSeverity.NONE,
    indicators: [],
    baselineMissing: ['homework'],
  },
];

function makeCrisisAssessment(severity: CrisisSeverity, indicators: string[]): CrisisAssessmentInput {
  return {
    severity,
    lastAssessed: new Date().toISOString(),
    indicators: indicators.map((type, index) => ({
      type,
      quote: `Indicator: ${type}`,
      severity,
      context: 'Auto-generated for evaluation',
    })),
    safetyPlanInPlace: severity !== CrisisSeverity.NONE,
    safetyPlanDetails: severity !== CrisisSeverity.NONE ? 'Safety plan reviewed; crisis numbers provided.' : undefined,
  };
}

function makeSessionReference(id: string): SessionReferenceInput {
  return {
    sessionId: `session-${id}`,
    sessionNumber: 1,
    date: new Date().toISOString(),
    keyContributions: ['Initial evaluation session'],
  };
}

function mapIndicatorToRiskType(indicator?: CrisisIndicatorType): 'suicidal_ideation' | 'self_harm' | 'substance_use' | 'violence' | 'other' {
  switch (indicator) {
    case 'suicidal_ideation':
    case 'suicidal_plan':
    case 'suicidal_intent':
      return 'suicidal_ideation';
    case 'self_harm':
      return 'self_harm';
    case 'substance_emergency':
      return 'substance_use';
    case 'homicidal_ideation':
      return 'violence';
    default:
      return 'other';
  }
}

function buildCanonicalPlan(
  id: string,
  severity: CrisisSeverity,
  indicators: CrisisIndicatorType[],
  overrides: Partial<CanonicalPlanInput> = {}
): CanonicalPlanInput {
  const now = new Date().toISOString();
  const base: CanonicalPlanInput = {
    clientId: `client-${id}`,
    createdAt: now,
    updatedAt: now,
    version: 1,
    presentingConcerns: [
      {
        id: `pc-${id}`,
        description: 'Anxiety impacting daily functioning',
        severity: 'moderate',
        duration: '3 months',
        impact: 'Sleep disruption and reduced concentration',
        sourceSessionIds: [`session-${id}`],
      },
    ],
    clinicalImpressions: [
      {
        id: `ci-${id}`,
        observation: 'Heightened arousal and worry themes',
        category: 'Emotional',
        sourceSessionIds: [`session-${id}`],
      },
    ],
    diagnoses: [
      {
        id: `dx-${id}`,
        name: 'Generalized Anxiety (provisional)',
        status: 'provisional',
        notes: 'Monitor mood and rule out MDD',
      },
    ],
    goals: [
      {
        id: `goal-${id}`,
        type: 'short_term',
        description: 'Reduce daily anxiety intensity',
        measurableOutcome: 'Self-reported anxiety <= 4/10 on 4 of 7 days',
        targetDate: undefined,
        status: 'in_progress',
        progress: 30,
        interventionIds: [`inv-${id}`],
        sourceSessionIds: [`session-${id}`],
      },
    ],
    interventions: [
      {
        id: `inv-${id}`,
        modality: 'CBT',
        name: 'Cognitive restructuring',
        description: 'Identify and challenge catastrophic thoughts',
        frequency: 'Weekly',
        rationale: 'Reduce anxiety maintaining cognitions',
      },
    ],
    strengths: [
      {
        id: `str-${id}`,
        category: 'personal',
        description: 'Motivated to engage in therapy',
        sourceSessionIds: [`session-${id}`],
      },
    ],
    riskFactors:
      severity === CrisisSeverity.NONE
        ? []
        : [
            {
              id: `risk-${id}`,
              type: mapIndicatorToRiskType(indicators[0]),
              description: 'Documented risk signal from transcript',
              severity,
              mitigatingFactors: ['Supportive contact available'],
              sourceSessionIds: [`session-${id}`],
            },
          ],
    homework: [
      {
        id: `hw-${id}`,
        title: 'Breathing practice',
        description: 'Practice 4-7-8 breathing twice daily',
        rationale: 'Reduce physiological arousal',
        goalIds: [`goal-${id}`],
        status: 'assigned',
        dueDate: undefined,
      },
    ],
    crisisAssessment: makeCrisisAssessment(severity, indicators),
    sessionReferences: [makeSessionReference(id)],
  };

  return {
    ...base,
    ...overrides,
  };
}

function clonePlan(plan: CanonicalPlanInput): CanonicalPlanInput {
  return JSON.parse(JSON.stringify(plan));
}

function buildCrisisResult(
  severity: CrisisSeverity,
  indicators: CrisisIndicatorType[],
  confidence = 0.72
): CrisisCheckResult {
  return {
    isCrisis: severity !== CrisisSeverity.NONE,
    severity,
    shouldHalt: severity === CrisisSeverity.HIGH || severity === CrisisSeverity.CRITICAL,
    assessment: {
      overallSeverity: severity,
      confidence,
      indicators: indicators.map((type, index) => ({
        type,
        quote: `Detected: ${type}`,
        severity,
        context: 'Evaluation sample',
        lineReference: index + 1,
      })),
      immediateRisk: severity === CrisisSeverity.HIGH || severity === CrisisSeverity.CRITICAL,
      recommendedActions:
        severity === CrisisSeverity.NONE
          ? ['Continue monitoring']
          : ['Confirm safety plan', 'Escalate per protocol'],
      protectiveFactors: ['Supportive relationship'],
      reasoning: indicators.length
        ? `Signals detected: ${indicators.join(', ')}`
        : 'No explicit crisis indicators found.',
    },
    processingNotes: indicators.length ? 'Indicators mapped from transcript notes.' : 'No action required.',
  };
}

function complexClientViewText(id: string): string {
  return `This treatment modality seeks to ameliorate ${id} anxiety through iterative cognitive restructuring, nuanced behavioral activation, and meticulously scaffolded exposure hierarchies, incorporating psychoeducation and metacognitive reflection to facilitate durable change.`;
}

function conciseClientViewText(id: string): string {
  return `Plan for ${id}: We will practice short breathing exercises, challenge worried thoughts, and take small steps toward situations that feel hard. You will have clear steps and check-ins to keep it manageable.`;
}

function applyBaselineGaps(plan: CanonicalPlanInput, gaps: SampleDefinition['baselineMissing']): CanonicalPlanInput {
  if (!gaps || gaps.length === 0) return plan;
  const next = clonePlan(plan);
  for (const gap of gaps) {
    if (gap === 'strengths') next.strengths = [];
    if (gap === 'homework') next.homework = [];
    if (gap === 'sessionReferences') next.sessionReferences = [];
    if (gap === 'interventions') next.interventions = [];
  }
  return next;
}

function makeTokenUsage(promptTokens: number, completionTokens: number): TokenUsage {
  const totalTokens = promptTokens + completionTokens;
  const estimatedCost = Math.round((totalTokens * 0.000002) * 10000) / 10000;
  return { promptTokens, completionTokens, totalTokens, estimatedCost };
}

export const evaluationDataset: EvaluationSample[] = SAMPLE_DEFINITIONS.map((def, index) => {
  const canonical = buildCanonicalPlan(def.id, def.severity, def.indicators);
  const baselinePlan = applyBaselineGaps(canonical, def.baselineMissing);
  const candidatePlan = clonePlan(canonical);

  const baselineIndicators = def.baselineIndicators ?? def.indicators.slice(0, Math.max(def.indicators.length - 1, 0));
  const candidateIndicators = def.candidateIndicators ?? def.indicators;

  const baselineSeverity = def.baselineSeverity ?? def.severity;
  const candidateSeverity = def.candidateSeverity ?? def.severity;

  const baseLatency = 1900 + (index * 35);

  return {
    id: def.id,
    transcript: def.transcript,
    groundTruth: {
      severity: def.severity,
      indicators: def.indicators,
    },
    models: {
      baseline: {
        canonicalPlan: baselinePlan,
        clientViewText: complexClientViewText(def.id),
        crisisResult: buildCrisisResult(baselineSeverity, baselineIndicators, 0.6),
        tokenUsage: makeTokenUsage(950 + index * 10, 520 + index * 8),
        latencyMs: baseLatency + 220,
      },
      candidate: {
        canonicalPlan: candidatePlan,
        clientViewText: conciseClientViewText(def.id),
        crisisResult: buildCrisisResult(candidateSeverity, candidateIndicators, 0.82),
        tokenUsage: makeTokenUsage(880 + index * 12, 600 + index * 9),
        latencyMs: baseLatency,
      },
    },
  };
});

