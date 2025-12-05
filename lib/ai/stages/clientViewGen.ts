/**
 * Client View Generation Stage
 * 
 * Transforms canonical treatment plan data into a warm, accessible
 * view optimized for clients. Ensures reading level is at 6th-8th grade.
 */

import OpenAI from 'openai';
import type {
  StageResult,
  TokenUsage,
  CanonicalPlan,
  ClientView,
  ClientGoal,
  ClientHomework,
} from '../types';
import { clientViewSchema } from '../schemas';
import { getModelConfig, calculateCost, LIMITS, READING_LEVEL } from '../config';
import {
  CLIENT_VIEW_SYSTEM_PROMPT,
  getClientViewPrompt,
  simplifyText,
  generateEncouragingMessage,
  generateStrengthAcknowledgment,
  goalToPlainLanguage,
} from '../prompts/clientView';
import {
  calculateReadingLevel,
  validateReadingLevel,
  type ReadingLevelValidation,
} from '@/lib/utils/readingLevel';

// =============================================================================
// TYPES
// =============================================================================

export interface ClientViewInput {
  canonicalPlan: CanonicalPlan;
  clientFirstName: string;
  targetReadingLevel?: number;
  tone?: 'warm' | 'encouraging' | 'matter-of-fact';
}

export interface ClientViewResult {
  view: ClientView;
  generatedFromAI: boolean;
  readingLevelValidation: ReadingLevelValidation;
}

// =============================================================================
// CLIENT VIEW GENERATION STAGE
// =============================================================================

/**
 * Generate client view from canonical plan
 */
export async function generateClientView(
  input: ClientViewInput,
  openaiClient: OpenAI
): Promise<StageResult<ClientViewResult>> {
  const startTime = Date.now();
  const targetLevel = input.targetReadingLevel ?? READING_LEVEL.targetGrade;

  try {
    // Try AI generation first
    const aiResult = await generateClientViewWithAI(input, openaiClient);
    
    if (aiResult.success && aiResult.data) {
      // Validate reading level
      const validation = validateClientViewReadingLevel(aiResult.data);
      
      // If reading level is too high, try to simplify or regenerate
      if (!validation.isValid) {
        // Try AI regeneration with stricter instructions
        const simplifiedResult = await regenerateWithSimplerLanguage(
          input,
          aiResult.data,
          openaiClient
        );
        
        if (simplifiedResult.success && simplifiedResult.data) {
          const newValidation = validateClientViewReadingLevel(simplifiedResult.data);
          return {
            success: true,
            data: {
              view: simplifiedResult.data,
              generatedFromAI: true,
              readingLevelValidation: newValidation,
            },
            durationMs: Date.now() - startTime,
            tokenUsage: addTokenUsage(aiResult.tokenUsage, simplifiedResult.tokenUsage),
          };
        }
        
        // Use rule-based simplification as fallback
        const simplifiedView = simplifyClientView(aiResult.data);
        const simplifiedValidation = validateClientViewReadingLevel(simplifiedView);
        
        return {
          success: true,
          data: {
            view: simplifiedView,
            generatedFromAI: true,
            readingLevelValidation: simplifiedValidation,
          },
          durationMs: Date.now() - startTime,
          tokenUsage: aiResult.tokenUsage,
        };
      }
      
      return {
        success: true,
        data: {
          view: aiResult.data,
          generatedFromAI: true,
          readingLevelValidation: validation,
        },
        durationMs: Date.now() - startTime,
        tokenUsage: aiResult.tokenUsage,
      };
    }

    // Fallback to rule-based generation
    const fallbackView = generateClientViewFallback(input);
    const fallbackValidation = validateClientViewReadingLevel(fallbackView);
    
    return {
      success: true,
      data: {
        view: fallbackView,
        generatedFromAI: false,
        readingLevelValidation: fallbackValidation,
      },
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    // Return fallback view on error
    const fallbackView = generateClientViewFallback(input);
    const fallbackValidation = validateClientViewReadingLevel(fallbackView);
    
    return {
      success: true,
      data: {
        view: fallbackView,
        generatedFromAI: false,
        readingLevelValidation: fallbackValidation,
      },
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error - using fallback',
    };
  }
}

// =============================================================================
// AI GENERATION
// =============================================================================

interface AIGenerationResult {
  success: boolean;
  data?: ClientView;
  error?: string;
  tokenUsage?: TokenUsage;
}

/**
 * Generate client view using AI
 */
async function generateClientViewWithAI(
  input: ClientViewInput,
  openaiClient: OpenAI,
  maxRetries: number = LIMITS.maxRetries
): Promise<AIGenerationResult> {
  const config = getModelConfig('client_view');
  
  const prompt = getClientViewPrompt({
    canonicalPlan: input.canonicalPlan,
    clientFirstName: input.clientFirstName,
    targetReadingLevel: input.targetReadingLevel,
    tone: input.tone,
  });

  let lastError: string = '';
  let totalTokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: CLIENT_VIEW_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      // Track token usage
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        estimatedCost: calculateCost(
          config.model,
          response.usage?.prompt_tokens ?? 0,
          response.usage?.completion_tokens ?? 0
        ),
      };
      totalTokenUsage = addTokenUsage(totalTokenUsage, usage);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        lastError = 'Empty response from AI';
        continue;
      }

      // Parse and validate JSON response
      const parsed = JSON.parse(content);
      const validated = clientViewSchema.parse(parsed);

      return {
        success: true,
        data: validated,
        tokenUsage: totalTokenUsage,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        lastError = `JSON parsing failed (attempt ${attempt}): ${error.message}`;
      } else if (error instanceof Error) {
        lastError = `Generation failed (attempt ${attempt}): ${error.message}`;
      } else {
        lastError = `Unknown error (attempt ${attempt})`;
      }

      // Exponential backoff before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return {
    success: false,
    error: lastError || 'All generation attempts failed',
    tokenUsage: totalTokenUsage,
  };
}

/**
 * Regenerate with simpler language instructions
 */
async function regenerateWithSimplerLanguage(
  input: ClientViewInput,
  previousView: ClientView,
  openaiClient: OpenAI
): Promise<AIGenerationResult> {
  const config = getModelConfig('client_view');

  const prompt = `The previous attempt to create a client-friendly view had a reading level that was too high.

Previous view:
\`\`\`json
${JSON.stringify(previousView, null, 2)}
\`\`\`

Please simplify this content to a 6th grade reading level. Specifically:
1. Use only 1-2 syllable words where possible
2. Keep sentences under 12 words
3. Remove any remaining clinical terminology
4. Use "you" and "your" more often
5. Make every sentence simple and clear

Return the simplified view as JSON matching the same structure.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: config.model,
      temperature: 0.3, // Lower temperature for more consistent simplification
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: CLIENT_VIEW_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      estimatedCost: calculateCost(
        config.model,
        response.usage?.prompt_tokens ?? 0,
        response.usage?.completion_tokens ?? 0
      ),
    };

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Empty response', tokenUsage: usage };
    }

    const parsed = JSON.parse(content);
    const validated = clientViewSchema.parse(parsed);

    return { success: true, data: validated, tokenUsage: usage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Simplification failed',
    };
  }
}

// =============================================================================
// READING LEVEL VALIDATION
// =============================================================================

/**
 * Validate client view reading level
 */
function validateClientViewReadingLevel(view: ClientView): ReadingLevelValidation {
  // Combine all text content for analysis
  const textParts = [
    view.header.greeting,
    view.overview.whatWeAreWorkingOn,
    view.overview.whyThisMatters,
    ...view.overview.yourStrengths,
    ...view.goals.map(g => `${g.title}. ${g.description}. ${g.celebration || ''}`),
    ...view.nextSteps.map(s => `${s.step}. ${s.why}`),
    ...view.homework.map(h => `${h.title}. ${h.description}. ${h.tip || ''}`),
    view.encouragement.progressMessage,
    ...(view.encouragement.celebrationPoints || []),
  ];

  const combinedText = textParts.filter(Boolean).join(' ');
  
  return validateReadingLevel(
    combinedText,
    READING_LEVEL.targetGrade,
    READING_LEVEL.maxGrade
  );
}

/**
 * Simplify client view using rule-based approach
 */
function simplifyClientView(view: ClientView): ClientView {
  return {
    header: {
      greeting: simplifyText(view.header.greeting),
      lastUpdated: view.header.lastUpdated,
    },
    overview: {
      whatWeAreWorkingOn: simplifyText(view.overview.whatWeAreWorkingOn),
      whyThisMatters: simplifyText(view.overview.whyThisMatters),
      yourStrengths: view.overview.yourStrengths.map(s => simplifyText(s)),
    },
    goals: view.goals.map(g => ({
      ...g,
      title: simplifyText(g.title),
      description: simplifyText(g.description),
      celebration: g.celebration ? simplifyText(g.celebration) : undefined,
    })),
    nextSteps: view.nextSteps.map(s => ({
      step: simplifyText(s.step),
      why: simplifyText(s.why),
    })),
    homework: view.homework.map(h => ({
      ...h,
      title: simplifyText(h.title),
      description: simplifyText(h.description),
      tip: h.tip ? simplifyText(h.tip) : undefined,
    })),
    encouragement: {
      progressMessage: simplifyText(view.encouragement.progressMessage),
      celebrationPoints: view.encouragement.celebrationPoints?.map(p => simplifyText(p)),
    },
  };
}

// =============================================================================
// FALLBACK GENERATION
// =============================================================================

/**
 * Generate client view using rule-based logic (fallback)
 */
function generateClientViewFallback(input: ClientViewInput): ClientView {
  const { canonicalPlan, clientFirstName, tone = 'warm' } = input;

  // Calculate overall progress
  const overallProgress = canonicalPlan.goals.length > 0
    ? Math.round(canonicalPlan.goals.reduce((acc, g) => acc + g.progress, 0) / canonicalPlan.goals.length)
    : 0;

  // Build goals
  const goals: ClientGoal[] = canonicalPlan.goals.slice(0, 5).map(g => ({
    id: g.id,
    title: simplifyText(g.description).slice(0, 50),
    description: goalToPlainLanguage(g),
    progress: g.progress,
    celebration: getCelebrationMessage(g.progress),
  }));

  // Build homework
  const homework: ClientHomework[] = canonicalPlan.homework
    .filter(h => h.status === 'assigned' || h.status === 'in_progress')
    .slice(0, 3)
    .map(h => ({
      id: h.id,
      title: simplifyText(h.title),
      description: simplifyText(h.description),
      tip: getHomeworkTip(h.title),
      status: h.status,
    }));

  // Build next steps
  const nextSteps = generateNextStepsForClient(canonicalPlan, homework);

  // Build strengths
  const strengths = canonicalPlan.strengths.length > 0
    ? canonicalPlan.strengths.slice(0, 3).map(s => simplifyText(s.description))
    : getDefaultStrengths(clientFirstName);

  // Generate focus summary
  const focusSummary = generateFocusSummary(canonicalPlan, clientFirstName);

  // Generate why it matters
  const whyItMatters = generateWhyItMatters(canonicalPlan, clientFirstName);

  return {
    header: {
      greeting: generateGreeting(clientFirstName, overallProgress, tone),
      lastUpdated: canonicalPlan.updatedAt,
    },
    overview: {
      whatWeAreWorkingOn: focusSummary,
      whyThisMatters: whyItMatters,
      yourStrengths: strengths,
    },
    goals,
    nextSteps,
    homework,
    encouragement: {
      progressMessage: generateEncouragingMessage(overallProgress, clientFirstName),
      celebrationPoints: getCelebrationPoints(canonicalPlan),
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate greeting based on progress and tone
 */
function generateGreeting(
  name: string,
  progress: number,
  tone: 'warm' | 'encouraging' | 'matter-of-fact'
): string {
  const greetings: Record<typeof tone, string[]> = {
    warm: [
      `Hi ${name}! It's great to check in with you.`,
      `Welcome back, ${name}! Let's see how you're doing.`,
      `Hi ${name}! Thanks for taking time to review your progress.`,
    ],
    encouraging: [
      `Hello ${name}! You're doing great work.`,
      `Hi ${name}! Every step forward counts.`,
      `Welcome, ${name}! Keep up the amazing effort.`,
    ],
    'matter-of-fact': [
      `Hello ${name}. Here's your treatment plan update.`,
      `Hi ${name}. Let's review your progress.`,
      `Hello ${name}. Here's where things stand.`,
    ],
  };

  const options = greetings[tone];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get celebration message based on progress
 */
function getCelebrationMessage(progress: number): string | undefined {
  if (progress >= 100) return "You did it! Goal complete!";
  if (progress >= 75) return "Almost there - great work!";
  if (progress >= 50) return "You're halfway - keep going!";
  if (progress >= 25) return "You've made a good start!";
  if (progress > 0) return "You've begun this journey!";
  return undefined;
}

/**
 * Get homework tip
 */
function getHomeworkTip(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('journal') || lowerTitle.includes('write')) {
    return 'Try doing this at the same time each day.';
  }
  if (lowerTitle.includes('breathe') || lowerTitle.includes('relax')) {
    return 'Even a few minutes can help. Start small.';
  }
  if (lowerTitle.includes('talk') || lowerTitle.includes('social')) {
    return 'Choose someone you feel safe with.';
  }
  if (lowerTitle.includes('exercise') || lowerTitle.includes('walk')) {
    return 'Any movement counts. A short walk is great!';
  }
  
  return 'Take it one step at a time.';
}

/**
 * Generate next steps for client
 */
function generateNextStepsForClient(
  plan: CanonicalPlan,
  homework: ClientHomework[]
): Array<{ step: string; why: string }> {
  const steps: Array<{ step: string; why: string }> = [];

  // Add homework-related steps
  if (homework.length > 0) {
    steps.push({
      step: `Work on your practice: ${homework[0].title}`,
      why: 'This helps build new habits.',
    });
  }

  // Add goal-related step
  const inProgressGoals = plan.goals.filter(g => g.status === 'in_progress');
  if (inProgressGoals.length > 0) {
    steps.push({
      step: 'Keep working on your current goals.',
      why: 'Small steps lead to big changes.',
    });
  }

  // Add general encouragement
  if (steps.length === 0) {
    steps.push({
      step: 'Come to your next session ready to talk.',
      why: 'Talking helps you process and grow.',
    });
  }

  return steps.slice(0, 3);
}

/**
 * Generate focus summary
 */
function generateFocusSummary(plan: CanonicalPlan, name: string): string {
  if (plan.presentingConcerns.length > 0) {
    const mainConcern = simplifyText(plan.presentingConcerns[0].description);
    return `${name}, we're working together on ${mainConcern.toLowerCase()}.`;
  }
  
  if (plan.goals.length > 0) {
    const mainGoal = simplifyText(plan.goals[0].description);
    return `Our focus is helping you ${mainGoal.toLowerCase()}.`;
  }
  
  return `We're working together on what matters most to you.`;
}

/**
 * Generate why it matters
 */
function generateWhyItMatters(plan: CanonicalPlan, name: string): string {
  if (plan.goals.length > 0) {
    return `This matters because you want to feel better and live the life you want.`;
  }
  
  return `This work helps you build skills for a happier, healthier life.`;
}

/**
 * Get default strengths
 */
function getDefaultStrengths(name: string): string[] {
  return [
    'You showed up and asked for help.',
    'You want to make positive changes.',
    'You\'re willing to try new things.',
  ];
}

/**
 * Get celebration points
 */
function getCelebrationPoints(plan: CanonicalPlan): string[] | undefined {
  const points: string[] = [];

  // Check for achieved goals
  const achieved = plan.goals.filter(g => g.status === 'achieved');
  if (achieved.length > 0) {
    points.push(`You achieved ${achieved.length} goal(s)!`);
  }

  // Check for completed homework
  const completed = plan.homework.filter(h => h.status === 'completed');
  if (completed.length > 0) {
    points.push(`You completed ${completed.length} practice task(s)!`);
  }

  // Check for session attendance
  if (plan.sessionReferences.length > 1) {
    points.push(`You've been to ${plan.sessionReferences.length} sessions!`);
  }

  return points.length > 0 ? points : undefined;
}

/**
 * Add token usage
 */
function addTokenUsage(a: TokenUsage | undefined, b: TokenUsage | undefined): TokenUsage {
  return {
    promptTokens: (a?.promptTokens ?? 0) + (b?.promptTokens ?? 0),
    completionTokens: (a?.completionTokens ?? 0) + (b?.completionTokens ?? 0),
    totalTokens: (a?.totalTokens ?? 0) + (b?.totalTokens ?? 0),
    estimatedCost: (a?.estimatedCost ?? 0) + (b?.estimatedCost ?? 0),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  validateClientViewReadingLevel,
  simplifyClientView,
  generateGreeting,
  getCelebrationMessage,
};

