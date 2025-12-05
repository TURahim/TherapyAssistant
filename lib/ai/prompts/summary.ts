/**
 * Session Summary Prompts
 * 
 * AI prompts for generating dual-tone session summaries:
 * - Therapist summary: Clinical documentation for the therapist
 * - Client summary: Accessible recap for the client
 */

// =============================================================================
// THERAPIST SUMMARY SYSTEM PROMPT
// =============================================================================

export const THERAPIST_SUMMARY_SYSTEM_PROMPT = `You are an expert clinical documentation assistant specializing in mental health therapy session summaries.

Your task is to generate concise, clinically-relevant session summaries for therapist documentation.

## Guidelines

### Tone & Style
- Use professional clinical language
- Be objective and factual
- Maintain appropriate clinical distance
- Use standard therapeutic terminology
- Write in third person (e.g., "Client reported..." not "You reported...")

### Content Focus
- Key themes and topics discussed
- Client's emotional state and presentation
- Progress toward treatment goals
- Therapeutic interventions used
- Homework assigned or reviewed
- Notable insights or breakthroughs
- Risk factors or concerns (if any)
- Plans for next session

### Structure
- Opening: Brief statement of session focus
- Body: Key content organized by theme
- Closing: Summary of progress and next steps

### Length
- Aim for 150-300 words
- Be comprehensive but concise
- Every sentence should add clinical value

### Do NOT Include
- Speculation beyond what's documented
- Personal opinions or judgments
- Detailed transcript quotes (unless clinically significant)
- PHI beyond what's necessary for clinical documentation`;

// =============================================================================
// CLIENT SUMMARY SYSTEM PROMPT
// =============================================================================

export const CLIENT_SUMMARY_SYSTEM_PROMPT = `You are a supportive and empathetic assistant helping create session recaps for therapy clients.

Your task is to generate warm, encouraging session summaries that help clients reflect on their therapy progress.

## Guidelines

### Tone & Style
- Use warm, supportive language
- Be encouraging without being patronizing
- Write at a 6th-8th grade reading level
- Use second person ("you" statements)
- Acknowledge effort and progress

### Content Focus
- What was discussed (general themes)
- Key insights or realizations
- Progress made and strengths shown
- Homework or action items
- What to look forward to

### Structure
- Opening: Warm acknowledgment of the session
- Body: Key takeaways in accessible language
- Closing: Encouragement and preview of what's next

### Length
- Aim for 100-200 words
- Keep sentences short and clear
- Use bullet points for action items

### Do NOT Include
- Clinical jargon or diagnostic language
- Detailed discussion of symptoms or disorders
- Anything that might feel judgmental
- Crisis or risk information (handled separately)
- Overwhelming amount of detail

### Remember
- This summary should feel like a supportive friend recapping what happened
- Focus on empowerment and progress
- Make the client feel heard and understood`;

// =============================================================================
// PROMPT GENERATORS
// =============================================================================

export interface SummaryPromptParams {
  transcript: string;
  sessionNumber: number;
  sessionDate: string;
  clientName?: string;
  presentingConcerns?: string[];
  previousSummary?: string;
  treatmentGoals?: string[];
}

/**
 * Generate the therapist summary prompt
 */
export function getTherapistSummaryPrompt(params: SummaryPromptParams): string {
  const {
    transcript,
    sessionNumber,
    sessionDate,
    clientName,
    presentingConcerns,
    previousSummary,
    treatmentGoals,
  } = params;

  let prompt = `Generate a clinical session summary for the following therapy session.

## Session Information
- Session Number: ${sessionNumber}
- Date: ${sessionDate}`;

  if (clientName) {
    prompt += `\n- Client: ${clientName}`;
  }

  if (presentingConcerns && presentingConcerns.length > 0) {
    prompt += `\n\n## Presenting Concerns\n${presentingConcerns.map(c => `- ${c}`).join('\n')}`;
  }

  if (treatmentGoals && treatmentGoals.length > 0) {
    prompt += `\n\n## Current Treatment Goals\n${treatmentGoals.map(g => `- ${g}`).join('\n')}`;
  }

  if (previousSummary) {
    prompt += `\n\n## Previous Session Summary\n${previousSummary}`;
  }

  prompt += `\n\n## Session Transcript\n${transcript}

## Instructions
Generate a professional clinical summary that:
1. Captures the key themes and content discussed
2. Notes the client's presentation and emotional state
3. Documents any interventions used
4. Records progress toward treatment goals
5. Lists homework assigned (if any)
6. Notes plans for next session

Format the summary with clear sections. Be thorough but concise.`;

  return prompt;
}

/**
 * Generate the client summary prompt
 */
export function getClientSummaryPrompt(params: SummaryPromptParams): string {
  const {
    transcript,
    sessionNumber,
    sessionDate,
    clientName,
    treatmentGoals,
  } = params;

  const firstName = clientName?.split(' ')[0] || 'there';

  let prompt = `Generate a warm, supportive session recap for a therapy client.

## Session Information
- Session Number: ${sessionNumber}
- Date: ${sessionDate}
- Client's first name: ${firstName}`;

  if (treatmentGoals && treatmentGoals.length > 0) {
    prompt += `\n\n## Goals Being Worked On\n${treatmentGoals.map(g => `- ${g}`).join('\n')}`;
  }

  prompt += `\n\n## Session Content\n${transcript}

## Instructions
Create a warm, encouraging summary that:
1. Acknowledges the client by their first name
2. Highlights what was discussed in accessible language
3. Celebrates any progress or insights
4. Clearly lists any homework or action items
5. Ends with encouragement for the week ahead

Remember:
- Keep it simple and easy to read
- Focus on positives and progress
- Make them feel heard and supported
- Don't use clinical terms
- Use "you" language (second person)

Format with:
- A warm opening sentence
- Key points as short paragraphs or bullets
- Clear "Your Action Items" section if applicable
- An encouraging closing`;

  return prompt;
}

// =============================================================================
// SUMMARY FORMATTING HELPERS
// =============================================================================

/**
 * Format a date for display in summaries
 */
export function formatSessionDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Extract action items from a client summary
 */
export function extractActionItems(summary: string): string[] {
  const actionItems: string[] = [];
  
  // Look for common action item patterns
  const patterns = [
    /(?:action items?|homework|to.?do|try this week|your tasks?):\s*\n?((?:[-•*]\s*.+\n?)+)/gi,
    /(?:^|\n)[-•*]\s*(.+?)(?=\n[-•*]|\n\n|$)/gm,
  ];
  
  // Check for action items section
  const actionMatch = summary.match(patterns[0]);
  if (actionMatch) {
    const itemsSection = actionMatch[1];
    const items = itemsSection.match(/[-•*]\s*(.+)/g);
    if (items) {
      items.forEach(item => {
        const cleaned = item.replace(/^[-•*]\s*/, '').trim();
        if (cleaned) actionItems.push(cleaned);
      });
    }
  }
  
  return actionItems;
}

/**
 * Get a summary of changes between sessions
 */
export function getProgressIndicators(
  currentSummary: string,
  previousSummary?: string
): string[] {
  const indicators: string[] = [];
  
  // Positive progress keywords
  const positivePatterns = [
    /progress(?:ed|ing)?/gi,
    /improv(?:ed|ing|ement)/gi,
    /better/gi,
    /growth/gi,
    /insight/gi,
    /breakthrough/gi,
    /success(?:ful)?/gi,
    /accomplish(?:ed|ment)/gi,
  ];
  
  positivePatterns.forEach(pattern => {
    if (pattern.test(currentSummary)) {
      const match = currentSummary.match(pattern);
      if (match) {
        indicators.push(`Shows ${match[0].toLowerCase()}`);
      }
    }
  });
  
  // Deduplicate
  return Array.from(new Set(indicators));
}

/**
 * Validate summary content
 */
export function validateSummary(summary: string, type: 'therapist' | 'client'): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check minimum length
  const wordCount = summary.split(/\s+/).length;
  const minWords = type === 'therapist' ? 100 : 50;
  const maxWords = type === 'therapist' ? 500 : 300;
  
  if (wordCount < minWords) {
    issues.push(`Summary is too short (${wordCount} words, minimum ${minWords})`);
  }
  
  if (wordCount > maxWords) {
    issues.push(`Summary is too long (${wordCount} words, maximum ${maxWords})`);
  }
  
  // Check for inappropriate content in client summaries
  if (type === 'client') {
    const clinicalTerms = [
      'diagnosis', 'disorder', 'pathology', 'symptomatology',
      'dsm', 'icd', 'prognosis', 'etiology', 'comorbid',
    ];
    
    const foundTerms = clinicalTerms.filter(term => 
      summary.toLowerCase().includes(term)
    );
    
    if (foundTerms.length > 0) {
      issues.push(`Client summary contains clinical terms: ${foundTerms.join(', ')}`);
    }
  }
  
  // Check for PHI-like content
  const phiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone number
  ];
  
  phiPatterns.forEach(pattern => {
    if (pattern.test(summary)) {
      issues.push('Summary may contain sensitive identifiable information');
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// SUMMARY TEMPLATES
// =============================================================================

/**
 * Default templates for when AI generation fails
 */
export const FALLBACK_TEMPLATES = {
  therapist: (sessionNumber: number, date: string) => `
## Session ${sessionNumber} Summary
**Date:** ${date}

### Session Overview
[Session content to be documented]

### Client Presentation
[Client's emotional state and presentation]

### Topics Discussed
- [Key theme 1]
- [Key theme 2]

### Interventions Used
- [Intervention]

### Progress Notes
[Progress toward treatment goals]

### Homework Assigned
- [Homework item]

### Plan for Next Session
[Plans and focus areas]
`.trim(),

  client: (sessionNumber: number, firstName: string) => `
Hi ${firstName}! 👋

Thank you for your session today (Session ${sessionNumber}). Here's a quick recap:

**What We Talked About:**
We covered some important topics today and made good progress together.

**Key Takeaways:**
- You showed up and did the work - that takes courage
- Every session is a step forward on your journey

**Your Action Items:**
- [Your therapist will add specific action items]

Keep up the great work! See you next time. 💪
`.trim(),
};

