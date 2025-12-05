/**
 * Client View Generation Prompts
 * 
 * These prompts transform canonical treatment plan data into a
 * warm, accessible view optimized for clients. Language must be
 * at a 6th-8th grade reading level.
 */

import type { CanonicalPlan } from '../types';
import { READING_LEVEL } from '../config';

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

export const CLIENT_VIEW_SYSTEM_PROMPT = `You are a compassionate mental health support writer creating personalized treatment plan summaries for therapy clients.

## Your Role
Transform clinical treatment plan data into a warm, encouraging, and easy-to-understand summary for the client.

## Language Requirements - CRITICAL

### Reading Level: 6th-8th Grade (Flesch-Kincaid)
- Use short sentences (10-15 words average)
- Use common, everyday words
- Avoid clinical jargon and technical terms
- Replace complex terms:
  * "intervention" → "what we'll work on" or "techniques"
  * "presenting concern" → "what's been bothering you"
  * "therapeutic modality" → "our approach"
  * "ideation" → "thoughts"
  * "symptom" → "feeling" or "experience"
  * "cognitive restructuring" → "changing unhelpful thoughts"
  * "behavioral activation" → "doing more activities that help"

### Tone: Warm, Supportive, Empowering
- Use "you" and "your" to speak directly to the client
- Focus on strengths and progress
- Frame challenges as things to work on together
- Include genuine encouragement (not generic)
- Acknowledge effort and participation

### Structure
- Start with a personalized greeting
- Focus on progress and strengths first
- Present goals in a hopeful way
- Make homework feel achievable
- End with encouragement

## What to AVOID
- Clinical terminology
- Diagnostic codes
- Risk assessment details
- Anything that could feel alarming or clinical
- Generic, impersonal language
- Long sentences or paragraphs

## Output Format
Respond with a valid JSON object matching the client view schema. Do not include any text outside the JSON.`;

// =============================================================================
// USER PROMPTS
// =============================================================================

export interface ClientViewPromptParams {
  canonicalPlan: CanonicalPlan;
  clientFirstName: string;
  targetReadingLevel?: number;
  tone?: 'warm' | 'encouraging' | 'matter-of-fact';
  preferences?: {
    targetReadingLevel?: number | null;
    tone?: string | null;
    includePsychoeducation?: boolean;
  };
}

/**
 * Generate the user prompt for client view generation
 */
export function getClientViewPrompt(params: ClientViewPromptParams): string {
  const {
    canonicalPlan,
    clientFirstName,
    targetReadingLevel = READING_LEVEL.targetGrade,
    tone = 'warm',
    preferences,
  } = params;

  const resolvedReadingLevel = preferences?.targetReadingLevel ?? targetReadingLevel;
  const resolvedTone = (preferences?.tone as ClientViewPromptParams['tone']) || tone;

  let prompt = `## Task: Generate Client-Friendly Treatment Plan View

### Client Information
- First Name: ${clientFirstName}
- Target Reading Level: ${resolvedReadingLevel}th grade
- Tone: ${getToneDescription(resolvedTone)}

`;

  // Add simplified plan data (exclude sensitive clinical details)
  const simplifiedPlan = simplifyClinicalData(canonicalPlan);
  
  prompt += `### Treatment Plan Data (Simplified for Reference)
\`\`\`json
${JSON.stringify(simplifiedPlan, null, 2)}
\`\`\`

`;

  prompt += `### Strengths to Highlight
${canonicalPlan.strengths.map(s => `- ${s.description}`).join('\n') || '- Your willingness to work on yourself'}

### Goals to Include
${canonicalPlan.goals.map(g => `- ${g.description} (${g.progress}% progress)`).join('\n') || '- We will set goals together'}

### Current Homework
${canonicalPlan.homework.filter(h => h.status === 'assigned' || h.status === 'in_progress').map(h => `- ${h.title}: ${h.description}`).join('\n') || '- No homework assigned yet'}

### Output Structure
Generate a JSON object with this structure:

{
  "header": {
    "greeting": "Hi ${clientFirstName}! [Warm, personalized greeting about their journey]",
    "lastUpdated": "${canonicalPlan.updatedAt}"
  },
  "overview": {
    "whatWeAreWorkingOn": "[Simple, 1-2 sentence summary of treatment focus - NO jargon]",
    "whyThisMatters": "[Connection to client's values and life goals - be specific]",
    "yourStrengths": ["[Strength 1]", "[Strength 2]", "[Strength 3]"]
  },
  "goals": [
    {
      "id": "goal_id",
      "title": "[Short, simple title - 5-7 words max]",
      "description": "[What this means in everyday language - 1-2 sentences]",
      "progress": 0-100,
      "celebration": "[Specific encouragement about their progress or effort]"
    }
  ],
  "nextSteps": [
    {
      "step": "[Clear, actionable step in simple language]",
      "why": "[Brief explanation of why this helps - 1 sentence]"
    }
  ],
  "homework": [
    {
      "id": "homework_id",
      "title": "[Simple title]",
      "description": "[Clear instructions anyone could follow]",
      "tip": "[Helpful tip to make it easier]",
      "status": "assigned" | "in_progress" | "completed" | "skipped"
    }
  ],
  "encouragement": {
    "progressMessage": "[Genuine, specific acknowledgment of their efforts and progress]",
    "celebrationPoints": ["[Specific achievement 1]", "[Specific achievement 2]"]
  }
}

### Remember:
1. Maximum reading level: ${READING_LEVEL.maxGrade}th grade
2. Short sentences only (10-15 words)
3. NO clinical jargon
4. Focus on strengths and progress
5. Make ${clientFirstName} feel supported and capable

Generate the complete client view now.`;

  return prompt;
}

/**
 * Get tone description for prompt
 */
function getToneDescription(tone: 'warm' | 'encouraging' | 'matter-of-fact'): string {
  switch (tone) {
    case 'warm':
      return 'Warm and supportive - like a caring friend who believes in them';
    case 'encouraging':
      return 'Encouraging and motivational - focused on growth and possibility';
    case 'matter-of-fact':
      return 'Straightforward and clear - respectful without excessive emotion';
    default:
      return 'Warm and supportive';
  }
}

/**
 * Simplify clinical data for client-safe prompt
 */
function simplifyClinicalData(plan: CanonicalPlan): {
  focusAreas: string[];
  progress: number;
  strengths: string[];
  nextSteps: string[];
} {
  // Extract focus areas from concerns without clinical details
  const focusAreas = plan.presentingConcerns.map(c => {
    // Simplify clinical descriptions
    return simplifyText(c.description);
  });

  // Calculate overall progress
  const progress = plan.goals.length > 0
    ? Math.round(plan.goals.reduce((acc, g) => acc + g.progress, 0) / plan.goals.length)
    : 0;

  // Get strengths
  const strengths = plan.strengths.map(s => simplifyText(s.description));

  // Get actionable next steps from homework and goals
  const nextSteps = [
    ...plan.homework.filter(h => h.status === 'assigned').map(h => h.title),
    ...plan.goals.filter(g => g.status === 'in_progress').map(g => `Work on: ${g.description}`).slice(0, 2),
  ];

  return {
    focusAreas,
    progress,
    strengths: strengths.length > 0 ? strengths : ['Willingness to engage in therapy'],
    nextSteps: nextSteps.slice(0, 3),
  };
}

/**
 * Simplify clinical text for client consumption
 */
export function simplifyText(text: string): string {
  // Replace common clinical terms with simpler alternatives
  const replacements: [RegExp, string][] = [
    [/\banxiety disorder\b/gi, 'worry and stress'],
    [/\bdepressive\b/gi, 'low mood'],
    [/\bdepression\b/gi, 'feeling down'],
    [/\bsuicidal ideation\b/gi, 'difficult thoughts'],
    [/\bideation\b/gi, 'thoughts'],
    [/\bpresenting concern\b/gi, 'what you came in for'],
    [/\bintervention\b/gi, 'approach'],
    [/\bcognitive\b/gi, 'thinking'],
    [/\bbehavioral\b/gi, 'action'],
    [/\bsymptom\b/gi, 'experience'],
    [/\btherapeutic\b/gi, 'helpful'],
    [/\bmodality\b/gi, 'approach'],
    [/\bformulation\b/gi, 'understanding'],
    [/\bassessment\b/gi, 'check-in'],
    [/\bchronic\b/gi, 'ongoing'],
    [/\bacute\b/gi, 'recent'],
    [/\bepisode\b/gi, 'time'],
    [/\bpathology\b/gi, 'challenge'],
    [/\bdysfunction\b/gi, 'difficulty'],
    [/\bmaladaptive\b/gi, 'unhelpful'],
    [/\bcontraindicated\b/gi, 'not recommended'],
    [/\bprognostic\b/gi, 'outlook'],
    [/\bcomorbid\b/gi, 'along with'],
  ];

  let simplified = text;
  for (const [pattern, replacement] of replacements) {
    simplified = simplified.replace(pattern, replacement);
  }

  return simplified;
}

// =============================================================================
// PLAIN LANGUAGE HELPERS
// =============================================================================

/**
 * Convert a clinical goal to plain language
 */
export function goalToPlainLanguage(goal: CanonicalPlan['goals'][0]): string {
  const parts: string[] = [];

  // Simplify the description
  parts.push(simplifyText(goal.description));

  // Add progress indicator
  if (goal.progress > 0) {
    if (goal.progress >= 75) {
      parts.push("- You're almost there!");
    } else if (goal.progress >= 50) {
      parts.push("- You're making great progress!");
    } else if (goal.progress >= 25) {
      parts.push("- You've started this journey.");
    }
  }

  return parts.join(' ');
}

/**
 * Generate encouraging message based on progress
 */
export function generateEncouragingMessage(
  progress: number,
  clientFirstName: string
): string {
  if (progress >= 75) {
    return `Amazing work, ${clientFirstName}! You've come so far. Keep going - you're so close to your goals.`;
  } else if (progress >= 50) {
    return `Great progress, ${clientFirstName}! You're more than halfway there. Each step forward matters.`;
  } else if (progress >= 25) {
    return `You're doing great, ${clientFirstName}! The hardest part is starting, and you've done that.`;
  } else if (progress > 0) {
    return `You've taken the first steps, ${clientFirstName}. That takes real courage. Keep it up!`;
  } else {
    return `Welcome to your journey, ${clientFirstName}. We're here to support you every step of the way.`;
  }
}

/**
 * Generate strength acknowledgment
 */
export function generateStrengthAcknowledgment(
  strengths: CanonicalPlan['strengths'],
  clientFirstName: string
): string {
  if (strengths.length === 0) {
    return `${clientFirstName}, you're already showing strength by being here and working on yourself.`;
  }

  const simplified = strengths.slice(0, 2).map(s => simplifyText(s.description).toLowerCase());
  return `${clientFirstName}, we've noticed your ${simplified.join(' and ')}. These are real strengths that will help you.`;
}

// =============================================================================
// READING LEVEL HELPERS
// =============================================================================

/**
 * Check if text is appropriate for client view
 */
export function isAppropriateForClient(text: string): boolean {
  // Check for clinical terms that shouldn't appear
  const clinicalTerms = [
    'suicidal', 'homicidal', 'ideation', 'psychosis', 'psychotic',
    'pathology', 'comorbid', 'etiology', 'prognosis', 'contraindicated',
    'iatrogenic', 'dsm', 'icd-10', 'differential diagnosis',
  ];

  const lowerText = text.toLowerCase();
  return !clinicalTerms.some(term => lowerText.includes(term));
}

/**
 * Get word alternatives for clinical terms
 */
export function getPlainAlternative(clinicalTerm: string): string {
  const alternatives: Record<string, string> = {
    'anxiety': 'worry',
    'depression': 'feeling down',
    'trauma': 'difficult experiences',
    'disorder': 'challenge',
    'symptom': 'experience',
    'treatment': 'our work together',
    'therapy': 'our sessions',
    'diagnosis': 'what we know',
    'assessment': 'understanding',
    'intervention': 'what we do',
    'homework': 'practice between sessions',
    'coping skills': 'ways to feel better',
    'coping mechanism': 'way to handle things',
    'trigger': 'thing that bothers you',
    'relapse': 'setback',
    'remission': 'feeling better',
    'chronic': 'ongoing',
    'acute': 'intense',
    'severity': 'how much',
    'prognosis': 'what to expect',
    'outcome': 'result',
    'protocol': 'plan',
    'modality': 'type of help',
    'cognitive': 'thinking',
    'behavioral': 'doing',
    'affect': 'feelings',
    'somatic': 'body',
    'psychosocial': 'life and relationships',
  };

  return alternatives[clinicalTerm.toLowerCase()] || clinicalTerm;
}

/**
 * Get summary of client view generation
 */
export function getClientViewSummary(view: {
  goals: unknown[];
  homework: unknown[];
  encouragement: { progressMessage: string };
}): string {
  return `Client View Summary:
  - Goals: ${view.goals.length}
  - Homework Items: ${view.homework.length}
  - Encouragement included: Yes`;
}

