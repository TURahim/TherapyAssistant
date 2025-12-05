import { z } from 'zod';

// =============================================================================
// SESSION SUMMARY SCHEMAS
// =============================================================================

export const keyTopicSchema = z.object({
  topic: z.string().min(1).max(100),
  discussionPoints: z.array(z.string().max(200)),
  clientResponse: z.string().optional().describe('How client engaged with topic'),
});

export const moodObservationSchema = z.object({
  beginningMood: z.string().min(1).max(50),
  endMood: z.string().min(1).max(50),
  moodShifts: z.array(z.string().max(100)).optional(),
  overallTrajectory: z.enum(['improved', 'stable', 'declined', 'variable']),
});

export const sessionHighlightSchema = z.object({
  type: z.enum(['breakthrough', 'insight', 'challenge', 'homework_progress', 'concern']),
  description: z.string().min(1).max(300),
  quote: z.string().optional().describe('Relevant quote from session'),
});

// =============================================================================
// MAIN SUMMARY SCHEMA
// =============================================================================

export const sessionSummaryOutputSchema = z.object({
  // For therapist records
  therapistSummary: z.string().min(1).max(2000).describe('Clinical summary for therapist records'),
  
  // For client portal
  clientSummary: z.string().min(1).max(1000).describe('Simple, encouraging summary for client'),
  
  // Structured data
  keyTopics: z.array(z.string().max(100)).min(1).describe('Main topics discussed'),
  
  detailedTopics: z.array(keyTopicSchema).optional().describe('Detailed topic breakdown'),
  
  progressNotes: z.string().max(1000).optional().describe('Progress toward treatment goals'),
  
  moodAssessment: z.string().max(200).optional().describe('Brief mood observation'),
  
  moodDetails: moodObservationSchema.optional().describe('Detailed mood tracking'),
  
  highlights: z.array(sessionHighlightSchema).optional().describe('Notable session moments'),
  
  followUp: z.object({
    nextSessionFocus: z.string().max(300).optional(),
    homeworkAssigned: z.array(z.string().max(200)).optional(),
    concernsToMonitor: z.array(z.string().max(200)).optional(),
  }).optional(),
});

// =============================================================================
// GENERATION INPUT SCHEMA
// =============================================================================

export const summaryGenerationInputSchema = z.object({
  transcript: z.string().min(1),
  sessionNumber: z.number().int().positive(),
  clientFirstName: z.string().min(1),
  existingGoals: z.array(z.object({
    id: z.string(),
    description: z.string(),
    status: z.string(),
  })).optional(),
  previousSessionSummary: z.string().optional(),
  includeDetailedTopics: z.boolean().default(false),
  includeMoodTracking: z.boolean().default(true),
});

// =============================================================================
// SUMMARY STYLE GUIDELINES
// =============================================================================

export const SUMMARY_GUIDELINES = {
  therapist: {
    tone: 'clinical',
    focus: [
      'Clinical observations',
      'Progress toward goals',
      'Risk factors noted',
      'Interventions used',
      'Plan for next session',
    ],
    maxLength: 2000,
  },
  client: {
    tone: 'warm and encouraging',
    focus: [
      'What was accomplished',
      'Strengths demonstrated',
      'Key takeaways',
      'Homework reminders',
      'Encouragement',
    ],
    maxLength: 1000,
    readingLevel: 6,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format summary for display
 */
export function formatSummaryForDisplay(
  summary: z.infer<typeof sessionSummaryOutputSchema>,
  type: 'therapist' | 'client'
): string {
  if (type === 'therapist') {
    let formatted = summary.therapistSummary;
    
    if (summary.progressNotes) {
      formatted += `\n\n**Progress Notes:**\n${summary.progressNotes}`;
    }
    
    if (summary.followUp?.concernsToMonitor?.length) {
      formatted += `\n\n**Concerns to Monitor:**\n${summary.followUp.concernsToMonitor.map(c => `• ${c}`).join('\n')}`;
    }
    
    return formatted;
  }
  
  let formatted = summary.clientSummary;
  
  if (summary.followUp?.homeworkAssigned?.length) {
    formatted += `\n\n**Your homework:**\n${summary.followUp.homeworkAssigned.map(h => `✓ ${h}`).join('\n')}`;
  }
  
  return formatted;
}

/**
 * Extract key topics from summary for quick view
 */
export function getQuickTopics(summary: z.infer<typeof sessionSummaryOutputSchema>): string[] {
  return summary.keyTopics.slice(0, 5);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type KeyTopicOutput = z.infer<typeof keyTopicSchema>;
export type MoodObservationOutput = z.infer<typeof moodObservationSchema>;
export type SessionHighlightOutput = z.infer<typeof sessionHighlightSchema>;
export type SessionSummaryOutput = z.infer<typeof sessionSummaryOutputSchema>;
export type SummaryGenerationInput = z.infer<typeof summaryGenerationInputSchema>;

