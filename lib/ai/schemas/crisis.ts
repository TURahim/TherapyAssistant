import { z } from 'zod';
import { CrisisSeverity } from '@prisma/client';

// =============================================================================
// CRISIS INDICATOR TYPES
// =============================================================================

export const crisisIndicatorTypeEnum = z.enum([
  'suicidal_ideation',
  'suicidal_plan',
  'suicidal_intent',
  'self_harm',
  'homicidal_ideation',
  'psychotic_symptoms',
  'severe_dissociation',
  'substance_emergency',
  'abuse_disclosure',
  'severe_panic',
  'other_crisis',
]);

// =============================================================================
// CRISIS ASSESSMENT OUTPUT SCHEMA
// =============================================================================

export const crisisIndicatorOutputSchema = z.object({
  type: crisisIndicatorTypeEnum,
  quote: z.string().min(1).describe('Direct quote from transcript indicating crisis'),
  severity: z.nativeEnum(CrisisSeverity),
  context: z.string().optional().describe('Additional context around the quote'),
  lineReference: z.number().optional().describe('Approximate line number in transcript'),
});

export const crisisAssessmentOutputSchema = z.object({
  overallSeverity: z.nativeEnum(CrisisSeverity),
  confidence: z.number().min(0).max(1).describe('Confidence in assessment (0-1)'),
  indicators: z.array(crisisIndicatorOutputSchema),
  immediateRisk: z.boolean().describe('Whether immediate intervention may be needed'),
  recommendedActions: z.array(z.string()).describe('Suggested follow-up actions for therapist'),
  protectiveFactors: z.array(z.string()).optional().describe('Factors reducing risk'),
  reasoning: z.string().describe('Explanation of the assessment'),
});

// =============================================================================
// CRISIS CHECK RESULT SCHEMA
// =============================================================================

export const crisisCheckResultSchema = z.object({
  isCrisis: z.boolean(),
  severity: z.nativeEnum(CrisisSeverity),
  shouldHalt: z.boolean().describe('Whether to halt pipeline for immediate review'),
  assessment: crisisAssessmentOutputSchema,
  processingNotes: z.string().optional(),
});

// =============================================================================
// RISK LEVEL MAPPING
// =============================================================================

export const RISK_LEVELS = {
  NONE: {
    severity: 'NONE' as const,
    action: 'continue',
    description: 'No indicators of crisis detected',
  },
  LOW: {
    severity: 'LOW' as const,
    action: 'flag',
    description: 'Minor concerns noted, monitor in future sessions',
  },
  MODERATE: {
    severity: 'MODERATE' as const,
    action: 'alert',
    description: 'Significant concerns requiring therapist attention',
  },
  HIGH: {
    severity: 'HIGH' as const,
    action: 'halt',
    description: 'Serious safety concerns, immediate review required',
  },
  CRITICAL: {
    severity: 'CRITICAL' as const,
    action: 'emergency',
    description: 'Imminent danger, emergency protocols may be needed',
  },
} as const;

// =============================================================================
// CRISIS KEYWORDS FOR PREPROCESSING
// =============================================================================

export const CRISIS_KEYWORDS = {
  suicidal: [
    'kill myself',
    'end my life',
    'suicide',
    'suicidal',
    'don\'t want to live',
    'better off dead',
    'wish I was dead',
    'want to die',
    'no reason to live',
    'end it all',
    'take my life',
    'not worth living',
  ],
  selfHarm: [
    'cut myself',
    'hurt myself',
    'self-harm',
    'self harm',
    'burning myself',
    'hitting myself',
    'punishing myself',
  ],
  violence: [
    'kill someone',
    'hurt someone',
    'homicidal',
    'violent thoughts',
    'want to harm',
    'attack',
    'revenge',
  ],
  psychosis: [
    'hearing voices',
    'seeing things',
    'paranoid',
    'being watched',
    'being followed',
    'conspiracy',
    'delusions',
    'hallucinations',
  ],
  emergency: [
    'overdose',
    'emergency',
    '911',
    'hospital',
    'in danger',
    'unsafe',
    'scared for my life',
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Quick check for crisis keywords in text (used in preprocessing)
 */
export function containsCrisisLanguage(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  for (const category of Object.values(CRISIS_KEYWORDS)) {
    for (const keyword of category) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get crisis keyword matches (for highlighting)
 */
export function findCrisisKeywords(text: string): Array<{ keyword: string; category: string; index: number }> {
  const matches: Array<{ keyword: string; category: string; index: number }> = [];
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CRISIS_KEYWORDS)) {
    for (const keyword of keywords) {
      let index = lowerText.indexOf(keyword);
      while (index !== -1) {
        matches.push({ keyword, category, index });
        index = lowerText.indexOf(keyword, index + 1);
      }
    }
  }
  
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Determine if crisis level should halt pipeline
 */
export function shouldHaltForCrisis(severity: CrisisSeverity): boolean {
  return severity === 'HIGH' || severity === 'CRITICAL';
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CrisisIndicatorType = z.infer<typeof crisisIndicatorTypeEnum>;
export type CrisisIndicatorOutput = z.infer<typeof crisisIndicatorOutputSchema>;
export type CrisisAssessmentOutput = z.infer<typeof crisisAssessmentOutputSchema>;
export type CrisisCheckResult = z.infer<typeof crisisCheckResultSchema>;

