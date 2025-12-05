import { z } from 'zod';

// =============================================================================
// CLIENT VIEW SCHEMAS
// =============================================================================

export const clientGoalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  progress: z.number().min(0).max(100),
  celebration: z.string().optional().describe('Encouraging message for progress made'),
});

export const clientHomeworkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tip: z.string().optional().describe('Helpful tip for completing the homework'),
  status: z.string().min(1),
});

export const clientNextStepSchema = z.object({
  step: z.string().min(1).max(200),
  why: z.string().min(1).max(200),
});

// =============================================================================
// MAIN CLIENT VIEW SCHEMA
// =============================================================================

export const clientViewSchema = z.object({
  header: z.object({
    greeting: z.string().min(1).max(200).describe('Warm, personalized greeting'),
    lastUpdated: z.string(),
  }),
  overview: z.object({
    whatWeAreWorkingOn: z.string().min(1).max(500).describe('Simple summary of treatment focus'),
    whyThisMatters: z.string().min(1).max(500).describe('Connection to client\'s values/goals'),
    yourStrengths: z.array(z.string().max(100)).min(1).describe('Client strengths to reinforce'),
  }),
  goals: z.array(clientGoalSchema).min(1),
  nextSteps: z.array(clientNextStepSchema).min(1),
  homework: z.array(clientHomeworkSchema),
  encouragement: z.object({
    progressMessage: z.string().min(1).max(300).describe('Validating message about progress'),
    celebrationPoints: z.array(z.string().max(100)).optional().describe('Specific achievements to celebrate'),
  }),
});

// =============================================================================
// GENERATION INPUT SCHEMA
// =============================================================================

export const clientViewGenerationInputSchema = z.object({
  canonicalPlan: z.any(), // Will be validated separately
  clientFirstName: z.string().min(1),
  targetReadingLevel: z.number().min(1).max(12).default(6),
  tone: z.enum(['warm', 'encouraging', 'matter-of-fact']).default('warm'),
});

// =============================================================================
// READING LEVEL VALIDATION
// =============================================================================

/**
 * Calculate Flesch-Kincaid Grade Level
 * Target: 6th-8th grade for client-facing content
 */
export function calculateReadingLevel(text: string): {
  gradeLevel: number;
  fleschEase: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
} {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
  
  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const syllableCount = syllables;
  
  // Flesch-Kincaid Grade Level
  const gradeLevel = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
  
  // Flesch Reading Ease (0-100, higher is easier)
  const fleschEase = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
  
  return {
    gradeLevel: Math.max(0, Math.round(gradeLevel * 10) / 10),
    fleschEase: Math.max(0, Math.min(100, Math.round(fleschEase * 10) / 10)),
    wordCount,
    sentenceCount,
    syllableCount,
  };
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Simplify text for lower reading level
 */
export function simplifyForReadingLevel(suggestions: string[]): string[] {
  return [
    'Use shorter sentences (aim for 10-15 words)',
    'Replace complex words with simpler alternatives',
    'Avoid clinical jargon',
    'Use "you" and "your" for direct connection',
    'Break long paragraphs into shorter ones',
    ...suggestions,
  ];
}

/**
 * Validate that client view meets reading level requirements
 */
export function validateClientViewReadingLevel(view: z.infer<typeof clientViewSchema>): {
  isValid: boolean;
  overallGrade: number;
  issues: string[];
} {
  const issues: string[] = [];
  const textsToCheck = [
    view.overview.whatWeAreWorkingOn,
    view.overview.whyThisMatters,
    view.encouragement.progressMessage,
    ...view.goals.map(g => g.description),
    ...view.homework.map(h => h.description),
  ];
  
  let totalGrade = 0;
  let count = 0;
  
  for (const text of textsToCheck) {
    const { gradeLevel } = calculateReadingLevel(text);
    totalGrade += gradeLevel;
    count++;
    
    if (gradeLevel > 8) {
      issues.push(`Text exceeds target reading level (${gradeLevel}): "${text.substring(0, 50)}..."`);
    }
  }
  
  const overallGrade = count > 0 ? totalGrade / count : 0;
  
  return {
    isValid: issues.length === 0 && overallGrade <= 8,
    overallGrade: Math.round(overallGrade * 10) / 10,
    issues,
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ClientGoalOutput = z.infer<typeof clientGoalSchema>;
export type ClientHomeworkOutput = z.infer<typeof clientHomeworkSchema>;
export type ClientNextStepOutput = z.infer<typeof clientNextStepSchema>;
export type ClientViewOutput = z.infer<typeof clientViewSchema>;
export type ClientViewGenerationInput = z.infer<typeof clientViewGenerationInputSchema>;

