/**
 * Summary Generation Stage
 * 
 * Generates dual-tone session summaries:
 * - Therapist summary: Clinical documentation
 * - Client summary: Accessible recap
 */

import { z } from 'zod';
import {
  THERAPIST_SUMMARY_SYSTEM_PROMPT,
  CLIENT_SUMMARY_SYSTEM_PROMPT,
  getTherapistSummaryPrompt,
  getClientSummaryPrompt,
  validateSummary,
  extractActionItems,
  FALLBACK_TEMPLATES,
  formatSessionDate,
  type SummaryPromptParams,
} from '../prompts/summary';

// =============================================================================
// SCHEMAS
// =============================================================================

export const TherapistSummarySchema = z.object({
  overview: z.string().describe('Brief overview of the session'),
  presentation: z.string().describe('Client presentation and emotional state'),
  topicsDiscussed: z.array(z.object({
    topic: z.string(),
    details: z.string(),
  })).describe('Key topics and themes discussed'),
  interventionsUsed: z.array(z.object({
    intervention: z.string(),
    rationale: z.string().optional(),
  })).describe('Therapeutic interventions used'),
  progressNotes: z.string().describe('Progress toward treatment goals'),
  homeworkAssigned: z.array(z.string()).optional().describe('Homework or tasks assigned'),
  riskNotes: z.string().optional().describe('Risk-related observations if any'),
  planForNext: z.string().describe('Plans for next session'),
  clinicalFormulation: z.string().optional().describe('Brief clinical formulation'),
});

export const ClientSummarySchema = z.object({
  greeting: z.string().describe('Warm personalized greeting'),
  whatWeDiscussed: z.array(z.string()).describe('Key topics in plain language'),
  keyTakeaways: z.array(z.string()).describe('Main insights or realizations'),
  actionItems: z.array(z.object({
    task: z.string(),
    dueBy: z.string().optional(),
  })).optional().describe('Homework or action items'),
  encouragement: z.string().describe('Encouraging closing message'),
  progressAcknowledgment: z.string().optional().describe('Acknowledgment of progress'),
});

export type TherapistSummary = z.infer<typeof TherapistSummarySchema>;
export type ClientSummary = z.infer<typeof ClientSummarySchema>;

// =============================================================================
// SUMMARY RESULT TYPES
// =============================================================================

export interface SummaryGenerationResult {
  therapistSummary: TherapistSummary;
  clientSummary: ClientSummary;
  therapistText: string;
  clientText: string;
  metadata: {
    generatedAt: string;
    sessionId: string;
    sessionNumber: number;
    wordCounts: {
      therapist: number;
      client: number;
    };
    actionItemCount: number;
  };
}

export interface SummaryGenerationInput {
  sessionId: string;
  sessionNumber: number;
  sessionDate: Date | string;
  transcript: string;
  clientName?: string;
  presentingConcerns?: string[];
  treatmentGoals?: string[];
  previousSummary?: string;
}

// =============================================================================
// MOCK AI GENERATION (Replace with actual AI call)
// =============================================================================

/**
 * Generate therapist summary using AI
 * In production, this would call the actual AI model
 */
async function generateTherapistSummaryWithAI(
  params: SummaryPromptParams
): Promise<TherapistSummary> {
  // Extract key information from transcript for mock
  const transcript = params.transcript.toLowerCase();
  
  // Detect common therapy topics
  const topics: Array<{ topic: string; details: string }> = [];
  
  if (transcript.includes('anxiety') || transcript.includes('anxious') || transcript.includes('worried')) {
    topics.push({
      topic: 'Anxiety management',
      details: 'Client discussed experiences with anxiety and coping strategies.',
    });
  }
  
  if (transcript.includes('relationship') || transcript.includes('family') || transcript.includes('partner')) {
    topics.push({
      topic: 'Relationship dynamics',
      details: 'Explored interpersonal relationships and communication patterns.',
    });
  }
  
  if (transcript.includes('work') || transcript.includes('job') || transcript.includes('career')) {
    topics.push({
      topic: 'Occupational stress',
      details: 'Discussed work-related stressors and professional challenges.',
    });
  }
  
  if (transcript.includes('sleep') || transcript.includes('tired') || transcript.includes('insomnia')) {
    topics.push({
      topic: 'Sleep concerns',
      details: 'Addressed sleep quality and patterns.',
    });
  }
  
  // Default topic if none detected
  if (topics.length === 0) {
    topics.push({
      topic: 'General check-in and processing',
      details: 'Client engaged in general therapeutic processing and reflection.',
    });
  }
  
  // Detect interventions
  const interventions: Array<{ intervention: string; rationale?: string }> = [];
  
  if (transcript.includes('breathing') || transcript.includes('relax')) {
    interventions.push({
      intervention: 'Relaxation techniques',
      rationale: 'To address somatic symptoms and promote self-regulation',
    });
  }
  
  if (transcript.includes('thought') || transcript.includes('thinking') || transcript.includes('belief')) {
    interventions.push({
      intervention: 'Cognitive restructuring',
      rationale: 'To identify and challenge unhelpful thought patterns',
    });
  }
  
  interventions.push({
    intervention: 'Supportive listening and validation',
    rationale: 'To strengthen therapeutic alliance and provide emotional support',
  });
  
  return {
    overview: `Session ${params.sessionNumber} focused on ${topics[0]?.topic.toLowerCase() || 'therapeutic processing'} with continued engagement in treatment.`,
    presentation: 'Client presented as engaged and willing to explore difficult topics. Affect was appropriate to content discussed.',
    topicsDiscussed: topics,
    interventionsUsed: interventions,
    progressNotes: 'Client continues to demonstrate insight and willingness to engage in therapeutic work. Progress toward treatment goals is evident.',
    homeworkAssigned: ['Continue practicing discussed techniques', 'Journal about experiences before next session'],
    planForNext: 'Continue exploration of identified themes and review homework completion.',
  };
}

/**
 * Generate client summary using AI
 * In production, this would call the actual AI model
 */
async function generateClientSummaryWithAI(
  params: SummaryPromptParams
): Promise<ClientSummary> {
  const firstName = params.clientName?.split(' ')[0] || 'there';
  const transcript = params.transcript.toLowerCase();
  
  // Determine topics discussed in plain language
  const whatWeDiscussed: string[] = [];
  
  if (transcript.includes('anxiety') || transcript.includes('anxious') || transcript.includes('worried')) {
    whatWeDiscussed.push('We talked about those anxious feelings and ways to feel more calm');
  }
  
  if (transcript.includes('relationship') || transcript.includes('family')) {
    whatWeDiscussed.push('We explored your relationships and how to communicate better');
  }
  
  if (transcript.includes('work') || transcript.includes('job')) {
    whatWeDiscussed.push('We discussed the stress at work and how to handle it');
  }
  
  if (whatWeDiscussed.length === 0) {
    whatWeDiscussed.push('We had a great conversation about what\'s been on your mind');
  }
  
  // Generate takeaways
  const keyTakeaways = [
    'You showed real courage by opening up about difficult topics',
    'Every small step forward counts - and you\'re making progress',
    'The insights you had today will help you moving forward',
  ];
  
  return {
    greeting: `Hi ${firstName}! 👋 Great job showing up for session ${params.sessionNumber} today!`,
    whatWeDiscussed,
    keyTakeaways,
    actionItems: [
      { task: 'Practice the techniques we discussed', dueBy: 'Before next session' },
      { task: 'Take a few minutes each day to check in with yourself' },
    ],
    encouragement: `You\'re doing amazing work, ${firstName}! Remember, healing isn\'t a straight line - every session is a step forward. See you next time! 💪`,
    progressAcknowledgment: 'You continue to show dedication to your growth and well-being.',
  };
}

// =============================================================================
// TEXT FORMATTERS
// =============================================================================

/**
 * Format therapist summary as readable text
 */
export function formatTherapistSummaryText(summary: TherapistSummary): string {
  let text = `## Session Overview\n${summary.overview}\n\n`;
  text += `## Client Presentation\n${summary.presentation}\n\n`;
  
  text += `## Topics Discussed\n`;
  summary.topicsDiscussed.forEach(t => {
    text += `### ${t.topic}\n${t.details}\n\n`;
  });
  
  text += `## Interventions Used\n`;
  summary.interventionsUsed.forEach(i => {
    text += `- **${i.intervention}**`;
    if (i.rationale) text += `: ${i.rationale}`;
    text += '\n';
  });
  text += '\n';
  
  text += `## Progress Notes\n${summary.progressNotes}\n\n`;
  
  if (summary.homeworkAssigned && summary.homeworkAssigned.length > 0) {
    text += `## Homework Assigned\n`;
    summary.homeworkAssigned.forEach(h => {
      text += `- ${h}\n`;
    });
    text += '\n';
  }
  
  if (summary.riskNotes) {
    text += `## Risk Notes\n${summary.riskNotes}\n\n`;
  }
  
  text += `## Plan for Next Session\n${summary.planForNext}`;
  
  if (summary.clinicalFormulation) {
    text += `\n\n## Clinical Formulation\n${summary.clinicalFormulation}`;
  }
  
  return text.trim();
}

/**
 * Format client summary as readable text
 */
export function formatClientSummaryText(summary: ClientSummary): string {
  let text = `${summary.greeting}\n\n`;
  
  text += `**What We Talked About:**\n`;
  summary.whatWeDiscussed.forEach(item => {
    text += `• ${item}\n`;
  });
  text += '\n';
  
  text += `**Key Takeaways:**\n`;
  summary.keyTakeaways.forEach(item => {
    text += `• ${item}\n`;
  });
  text += '\n';
  
  if (summary.progressAcknowledgment) {
    text += `**Your Progress:** ${summary.progressAcknowledgment}\n\n`;
  }
  
  if (summary.actionItems && summary.actionItems.length > 0) {
    text += `**Your Action Items:**\n`;
    summary.actionItems.forEach(item => {
      text += `☐ ${item.task}`;
      if (item.dueBy) text += ` *(${item.dueBy})*`;
      text += '\n';
    });
    text += '\n';
  }
  
  text += summary.encouragement;
  
  return text.trim();
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate both therapist and client summaries for a session
 */
export async function generateSessionSummaries(
  input: SummaryGenerationInput
): Promise<SummaryGenerationResult> {
  const {
    sessionId,
    sessionNumber,
    sessionDate,
    transcript,
    clientName,
    presentingConcerns,
    treatmentGoals,
    previousSummary,
  } = input;

  const formattedDate = formatSessionDate(sessionDate);

  const params: SummaryPromptParams = {
    transcript,
    sessionNumber,
    sessionDate: formattedDate,
    clientName,
    presentingConcerns,
    treatmentGoals,
    previousSummary,
  };

  // Generate both summaries
  const [therapistSummary, clientSummary] = await Promise.all([
    generateTherapistSummaryWithAI(params),
    generateClientSummaryWithAI(params),
  ]);

  // Format as text
  const therapistText = formatTherapistSummaryText(therapistSummary);
  const clientText = formatClientSummaryText(clientSummary);

  // Validate summaries
  const therapistValidation = validateSummary(therapistText, 'therapist');
  const clientValidation = validateSummary(clientText, 'client');

  if (!therapistValidation.isValid) {
    console.warn('Therapist summary validation issues:', therapistValidation.issues);
  }

  if (!clientValidation.isValid) {
    console.warn('Client summary validation issues:', clientValidation.issues);
  }

  // Extract action items count
  const actionItemCount = clientSummary.actionItems?.length || 0;

  return {
    therapistSummary,
    clientSummary,
    therapistText,
    clientText,
    metadata: {
      generatedAt: new Date().toISOString(),
      sessionId,
      sessionNumber,
      wordCounts: {
        therapist: therapistText.split(/\s+/).length,
        client: clientText.split(/\s+/).length,
      },
      actionItemCount,
    },
  };
}

/**
 * Generate only therapist summary
 */
export async function generateTherapistSummaryOnly(
  input: SummaryGenerationInput
): Promise<{ summary: TherapistSummary; text: string }> {
  const formattedDate = formatSessionDate(input.sessionDate);

  const params: SummaryPromptParams = {
    transcript: input.transcript,
    sessionNumber: input.sessionNumber,
    sessionDate: formattedDate,
    clientName: input.clientName,
    presentingConcerns: input.presentingConcerns,
    treatmentGoals: input.treatmentGoals,
    previousSummary: input.previousSummary,
  };

  const summary = await generateTherapistSummaryWithAI(params);
  const text = formatTherapistSummaryText(summary);

  return { summary, text };
}

/**
 * Generate only client summary
 */
export async function generateClientSummaryOnly(
  input: SummaryGenerationInput
): Promise<{ summary: ClientSummary; text: string }> {
  const formattedDate = formatSessionDate(input.sessionDate);

  const params: SummaryPromptParams = {
    transcript: input.transcript,
    sessionNumber: input.sessionNumber,
    sessionDate: formattedDate,
    clientName: input.clientName,
    treatmentGoals: input.treatmentGoals,
  };

  const summary = await generateClientSummaryWithAI(params);
  const text = formatClientSummaryText(summary);

  return { summary, text };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  THERAPIST_SUMMARY_SYSTEM_PROMPT,
  CLIENT_SUMMARY_SYSTEM_PROMPT,
  getTherapistSummaryPrompt,
  getClientSummaryPrompt,
  validateSummary,
  extractActionItems,
  FALLBACK_TEMPLATES,
};

