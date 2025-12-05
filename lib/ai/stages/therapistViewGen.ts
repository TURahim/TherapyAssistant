/**
 * Therapist View Generation Stage
 * 
 * Transforms canonical treatment plan data into a comprehensive
 * clinical view optimized for mental health professionals.
 */

import OpenAI from 'openai';
import type {
  StageResult,
  TokenUsage,
  CanonicalPlan,
  TherapistView,
  TherapistGoal,
  TherapistIntervention,
  TherapistPreferencesInput,
} from '../types';
import { therapistViewSchema } from '../schemas';
import { getModelConfig, calculateCost, LIMITS } from '../config';
import {
  THERAPIST_VIEW_SYSTEM_PROMPT,
  getTherapistViewPrompt,
  formatRiskLevel,
  formatGoalStatus,
  formatDiagnosisStatus,
  generatePresentingProblemsSummary,
  generateDiagnosticFormulation,
  generateTreatmentRationale,
} from '../prompts/therapistView';

// =============================================================================
// TYPES
// =============================================================================

export interface TherapistViewInput {
  canonicalPlan: CanonicalPlan;
  clientName: string;
  includeIcdCodes?: boolean;
  languageLevel?: 'professional' | 'conversational' | 'simple';
  preferences?: TherapistPreferencesInput;
}

export interface TherapistViewResult {
  view: TherapistView;
  generatedFromAI: boolean;
}

// =============================================================================
// THERAPIST VIEW GENERATION STAGE
// =============================================================================

/**
 * Generate therapist view from canonical plan
 */
export async function generateTherapistView(
  input: TherapistViewInput,
  openaiClient: OpenAI
): Promise<StageResult<TherapistViewResult>> {
  const startTime = Date.now();

  try {
    // Try AI generation first
    const aiResult = await generateTherapistViewWithAI(input, openaiClient);
    
    if (aiResult.success && aiResult.data) {
      return {
        success: true,
        data: {
          view: aiResult.data,
          generatedFromAI: true,
        },
        durationMs: Date.now() - startTime,
        tokenUsage: aiResult.tokenUsage,
      };
    }

    // Fallback to rule-based generation
    const fallbackView = generateTherapistViewFallback(input);
    
    return {
      success: true,
      data: {
        view: fallbackView,
        generatedFromAI: false,
      },
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    // Return fallback view on error
    const fallbackView = generateTherapistViewFallback(input);
    
    return {
      success: true,
      data: {
        view: fallbackView,
        generatedFromAI: false,
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
  data?: TherapistView;
  error?: string;
  tokenUsage?: TokenUsage;
}

/**
 * Generate therapist view using AI
 */
async function generateTherapistViewWithAI(
  input: TherapistViewInput,
  openaiClient: OpenAI,
  maxRetries: number = LIMITS.maxRetries
): Promise<AIGenerationResult> {
  const config = getModelConfig('therapist_view');
  
  const prompt = getTherapistViewPrompt({
    canonicalPlan: input.canonicalPlan,
    clientName: input.clientName,
    includeIcdCodes: input.includeIcdCodes,
    languageLevel: input.languageLevel,
    preferences: input.preferences,
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
          { role: 'system', content: THERAPIST_VIEW_SYSTEM_PROMPT },
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
      const validated = therapistViewSchema.parse(parsed);

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

// =============================================================================
// FALLBACK GENERATION
// =============================================================================

/**
 * Generate therapist view using rule-based logic (fallback)
 */
function generateTherapistViewFallback(input: TherapistViewInput): TherapistView {
  const { canonicalPlan, clientName, includeIcdCodes = true } = input;

  // Build diagnoses object
  const primaryDiagnosis = canonicalPlan.diagnoses.find(d => d.status === 'confirmed') 
    ?? canonicalPlan.diagnoses[0];
  const secondaryDiagnoses = canonicalPlan.diagnoses.filter(d => d !== primaryDiagnosis);

  // Build goals
  const shortTermGoals = canonicalPlan.goals
    .filter(g => g.type === 'short_term')
    .map(g => mapGoalToTherapistGoal(g, canonicalPlan.interventions));
  
  const longTermGoals = canonicalPlan.goals
    .filter(g => g.type === 'long_term')
    .map(g => mapGoalToTherapistGoal(g, canonicalPlan.interventions));

  // Build interventions
  const interventionPlan: TherapistIntervention[] = canonicalPlan.interventions.map(i => ({
    modality: i.modality,
    technique: i.name,
    description: i.description,
    frequency: i.frequency,
    rationale: i.rationale,
  }));

  // Build risk factors
  const riskFactors = canonicalPlan.riskFactors.map(r => ({
    type: formatRiskType(r.type),
    description: r.description,
    mitigation: r.mitigatingFactors.join('; ') || 'Continue monitoring',
  }));

  // Build homework
  const homework = canonicalPlan.homework.map(h => ({
    id: h.id,
    task: h.title,
    purpose: h.rationale,
    status: h.status,
  }));

  // Build session history
  const sessionHistory = canonicalPlan.sessionReferences.map(s => ({
    sessionNumber: s.sessionNumber,
    date: s.date,
    keyPoints: s.keyContributions,
  }));

  // Calculate plan status
  const planStatus = determinePlanStatus(canonicalPlan);

  // Generate progress summary
  const progressSummary = generateProgressSummary(canonicalPlan);

  return {
    header: {
      clientName,
      planStatus,
      lastUpdated: canonicalPlan.updatedAt,
      version: canonicalPlan.version,
    },
    clinicalSummary: {
      presentingProblems: generatePresentingProblemsSummary(canonicalPlan.presentingConcerns),
      diagnosticFormulation: generateDiagnosticFormulation(
        canonicalPlan.diagnoses,
        canonicalPlan.clinicalImpressions
      ),
      treatmentRationale: generateTreatmentRationale(canonicalPlan.interventions),
    },
    diagnoses: {
      primary: primaryDiagnosis ? {
        code: includeIcdCodes ? primaryDiagnosis.icdCode : undefined,
        name: primaryDiagnosis.name,
        status: formatDiagnosisStatus(primaryDiagnosis.status),
      } : undefined,
      secondary: secondaryDiagnoses.map(d => ({
        code: includeIcdCodes ? d.icdCode : undefined,
        name: d.name,
        status: formatDiagnosisStatus(d.status),
      })),
    },
    treatmentGoals: {
      shortTerm: shortTermGoals,
      longTerm: longTermGoals,
    },
    interventionPlan,
    riskAssessment: {
      currentLevel: formatRiskLevel(canonicalPlan.crisisAssessment.severity),
      factors: riskFactors,
    },
    progressNotes: {
      summary: progressSummary,
      recentChanges: extractRecentChanges(canonicalPlan),
      nextSteps: generateNextSteps(canonicalPlan),
    },
    homework,
    sessionHistory,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map canonical goal to therapist goal
 */
function mapGoalToTherapistGoal(
  goal: CanonicalPlan['goals'][0],
  interventions: CanonicalPlan['interventions']
): TherapistGoal {
  const linkedInterventions = interventions
    .filter(i => goal.interventionIds.includes(i.id))
    .map(i => i.name);

  return {
    id: goal.id,
    goal: goal.description,
    objective: goal.measurableOutcome,
    progress: goal.progress,
    status: formatGoalStatus(goal.status),
    interventions: linkedInterventions.length > 0 ? linkedInterventions : ['See intervention plan'],
  };
}

/**
 * Format risk type for display
 */
function formatRiskType(type: string): string {
  const types: Record<string, string> = {
    suicidal_ideation: 'Suicidal Ideation',
    self_harm: 'Self-Harm',
    substance_use: 'Substance Use',
    violence: 'Violence Risk',
    other: 'Other Safety Concern',
  };
  return types[type] || type;
}

/**
 * Determine plan status based on goals and activity
 */
function determinePlanStatus(plan: CanonicalPlan): string {
  const allGoalsAchieved = plan.goals.length > 0 && 
    plan.goals.every(g => g.status === 'achieved');
  
  if (allGoalsAchieved) {
    return 'Complete';
  }
  
  const hasInProgressGoals = plan.goals.some(g => g.status === 'in_progress');
  const hasInterventions = plan.interventions.length > 0;
  
  if (hasInProgressGoals || hasInterventions) {
    return 'Active';
  }
  
  return 'Draft';
}

/**
 * Generate progress summary
 */
function generateProgressSummary(plan: CanonicalPlan): string {
  const totalGoals = plan.goals.length;
  const achievedGoals = plan.goals.filter(g => g.status === 'achieved').length;
  const inProgressGoals = plan.goals.filter(g => g.status === 'in_progress').length;
  const avgProgress = totalGoals > 0 
    ? Math.round(plan.goals.reduce((acc, g) => acc + g.progress, 0) / totalGoals)
    : 0;

  const parts: string[] = [];

  if (totalGoals > 0) {
    parts.push(`Treatment includes ${totalGoals} goal(s)`);
    if (achievedGoals > 0) {
      parts.push(`${achievedGoals} achieved`);
    }
    if (inProgressGoals > 0) {
      parts.push(`${inProgressGoals} in progress`);
    }
    parts.push(`overall progress at ${avgProgress}%`);
  } else {
    parts.push('Treatment goals to be established');
  }

  const sessionCount = plan.sessionReferences.length;
  if (sessionCount > 0) {
    parts.push(`Based on ${sessionCount} session(s)`);
  }

  return parts.join('. ') + '.';
}

/**
 * Extract recent changes from plan
 */
function extractRecentChanges(plan: CanonicalPlan): string[] {
  const changes: string[] = [];

  // Get the most recent session
  if (plan.sessionReferences.length > 0) {
    const lastSession = plan.sessionReferences[plan.sessionReferences.length - 1];
    changes.push(`Latest session: ${lastSession.keyContributions.join(', ')}`);
  }

  // Check for achieved goals
  const recentlyAchieved = plan.goals.filter(g => g.status === 'achieved');
  if (recentlyAchieved.length > 0) {
    changes.push(`Goal achieved: ${recentlyAchieved[0].description}`);
  }

  // Check for high progress goals
  const nearCompletion = plan.goals.filter(g => g.progress >= 75 && g.status === 'in_progress');
  if (nearCompletion.length > 0) {
    changes.push(`Near completion: ${nearCompletion[0].description} (${nearCompletion[0].progress}%)`);
  }

  return changes.length > 0 ? changes : ['No recent changes documented'];
}

/**
 * Generate next steps based on plan
 */
function generateNextSteps(plan: CanonicalPlan): string[] {
  const steps: string[] = [];

  // Pending homework
  const pendingHomework = plan.homework.filter(h => h.status === 'assigned' || h.status === 'in_progress');
  if (pendingHomework.length > 0) {
    steps.push(`Review homework: ${pendingHomework.map(h => h.title).join(', ')}`);
  }

  // Goals needing attention
  const lowProgressGoals = plan.goals.filter(g => g.progress < 25 && g.status === 'in_progress');
  if (lowProgressGoals.length > 0) {
    steps.push(`Focus on: ${lowProgressGoals[0].description}`);
  }

  // Risk factors
  if (plan.crisisAssessment.severity !== 'NONE') {
    steps.push(`Continue monitoring: ${formatRiskLevel(plan.crisisAssessment.severity)} risk level`);
  }

  // Default step
  if (steps.length === 0) {
    steps.push('Continue with current treatment plan');
  }

  return steps;
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
  formatRiskLevel,
  formatGoalStatus,
  formatDiagnosisStatus,
  determinePlanStatus,
  generateProgressSummary,
};

