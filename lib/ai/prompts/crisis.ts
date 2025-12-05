/**
 * Crisis Classification Prompts
 * 
 * These prompts are used to detect and assess crisis indicators in therapy transcripts.
 * Safety is the primary concern - the system should err on the side of caution.
 */

import { CrisisSeverity } from '@prisma/client';

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

export const CRISIS_SYSTEM_PROMPT = `You are a specialized mental health crisis assessment AI. Your role is to carefully analyze therapy session transcripts for indicators of risk.

## Your Primary Responsibilities:
1. DETECT any language indicating immediate safety concerns
2. CLASSIFY the severity of detected risks
3. IDENTIFY specific quotes that support your assessment
4. RECOMMEND appropriate follow-up actions

## Risk Indicators to Watch For:

### CRITICAL (Immediate danger):
- Explicit suicidal intent with plan and means
- Active self-harm in progress
- Homicidal ideation with specific target
- Psychotic break with dangerous behavior
- Medical emergency (overdose, severe injury)

### HIGH (Serious concern requiring urgent attention):
- Suicidal ideation with any planning
- Recent self-harm behavior
- Access to means of self-harm
- Severe hopelessness or desire to die
- Homicidal thoughts without specific plan
- Severe dissociation affecting safety

### MEDIUM (Significant concern requiring monitoring):
- Passive suicidal ideation (wishing to be dead)
- History of self-harm, no current behavior
- Significant substance use concerns
- Domestic violence or abuse disclosure
- Severe anxiety/panic affecting functioning

### LOW (Monitor in future sessions):
- Fleeting thoughts of death
- Mild self-destructive behaviors
- General expressions of hopelessness
- Non-specific safety concerns

### NONE (No immediate concerns):
- Normal therapeutic content
- General life stressors
- Typical emotional expressions

## Critical Rules:
1. NEVER minimize or dismiss potential safety concerns
2. When in doubt, escalate the severity level
3. Include EXACT QUOTES from the transcript
4. Consider context but prioritize explicit statements
5. False positives are acceptable; false negatives are NOT

## Output Format:
You must respond with a JSON object matching the expected schema. Do not include any text outside the JSON.`;

// =============================================================================
// USER PROMPTS
// =============================================================================

export function getCrisisAssessmentPrompt(transcript: string): string {
  return `Analyze the following therapy session transcript for crisis indicators.

## Transcript:
${transcript}

## Instructions:
1. Carefully read the entire transcript
2. Identify any statements indicating risk
3. For each indicator found, extract the exact quote
4. Assess the overall severity level
5. Determine if immediate intervention may be needed
6. List any protective factors that reduce risk
7. Recommend specific follow-up actions

Respond with a JSON object in this exact format:
{
  "overallSeverity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": <number 0-1>,
  "indicators": [
    {
      "type": "<indicator type>",
      "quote": "<exact quote from transcript>",
      "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "context": "<optional context>"
    }
  ],
  "immediateRisk": <boolean>,
  "recommendedActions": ["<action 1>", "<action 2>"],
  "protectiveFactors": ["<factor 1>", "<factor 2>"],
  "reasoning": "<explanation of your assessment>"
}`;
}

// =============================================================================
// SEVERITY DESCRIPTIONS
// =============================================================================

export const SEVERITY_DESCRIPTIONS: Record<CrisisSeverity, {
  label: string;
  description: string;
  action: string;
  color: string;
}> = {
  NONE: {
    label: 'No Concerns',
    description: 'No crisis indicators detected in the session',
    action: 'Continue with standard treatment',
    color: 'green',
  },
  LOW: {
    label: 'Low Risk',
    description: 'Minor concerns noted that should be monitored',
    action: 'Monitor in future sessions, document observations',
    color: 'yellow',
  },
  MEDIUM: {
    label: 'Moderate Risk',
    description: 'Significant concerns requiring clinical attention',
    action: 'Increase session frequency, develop safety plan',
    color: 'orange',
  },
  HIGH: {
    label: 'High Risk',
    description: 'Serious safety concerns requiring urgent intervention',
    action: 'Immediate clinical review, consider higher level of care',
    color: 'red',
  },
  CRITICAL: {
    label: 'Critical',
    description: 'Imminent danger requiring emergency response',
    action: 'Emergency protocols, consider hospitalization',
    color: 'red',
  },
};

// =============================================================================
// INDICATOR TYPE DESCRIPTIONS
// =============================================================================

export const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  suicidal_ideation: 'Thoughts of ending one\'s life',
  suicidal_plan: 'Specific plan for suicide',
  suicidal_intent: 'Expressed intention to act on suicidal thoughts',
  self_harm: 'Intentional self-injury',
  homicidal_ideation: 'Thoughts of harming others',
  psychotic_symptoms: 'Hallucinations, delusions, or severe disorganization',
  severe_dissociation: 'Significant disconnection from reality',
  substance_emergency: 'Dangerous substance use or overdose',
  abuse_disclosure: 'Disclosure of ongoing abuse or violence',
  severe_panic: 'Debilitating anxiety or panic',
  other_crisis: 'Other safety concern',
};

// =============================================================================
// RECOMMENDED ACTIONS BY SEVERITY
// =============================================================================

export const RECOMMENDED_ACTIONS: Record<CrisisSeverity, string[]> = {
  NONE: [
    'Continue standard treatment plan',
    'Document session as usual',
  ],
  LOW: [
    'Document the concern in session notes',
    'Plan to check in about this topic next session',
    'Consider adding to treatment goals if pattern emerges',
  ],
  MEDIUM: [
    'Conduct thorough risk assessment',
    'Develop or review safety plan with client',
    'Consider increasing session frequency',
    'Discuss concerns with clinical supervisor',
    'Document risk assessment and interventions',
  ],
  HIGH: [
    'Complete comprehensive suicide risk assessment',
    'Implement or review detailed safety plan',
    'Contact emergency contacts if appropriate',
    'Consider referral for psychiatric evaluation',
    'Consult with clinical supervisor immediately',
    'Document all interventions and rationale',
  ],
  CRITICAL: [
    'Do not end session until safety is established',
    'Call emergency services if client is in immediate danger',
    'Contact family/emergency contacts',
    'Arrange for immediate psychiatric evaluation',
    'Consider voluntary or involuntary hospitalization',
    'Document all actions taken with timestamps',
    'Follow organizational emergency protocols',
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get recommended actions for a severity level
 */
export function getRecommendedActions(severity: CrisisSeverity): string[] {
  return RECOMMENDED_ACTIONS[severity];
}

/**
 * Get severity description
 */
export function getSeverityDescription(severity: CrisisSeverity): {
  label: string;
  description: string;
  action: string;
  color: string;
} {
  return SEVERITY_DESCRIPTIONS[severity];
}

/**
 * Format crisis assessment for display
 */
export function formatCrisisAssessmentForDisplay(assessment: {
  overallSeverity: CrisisSeverity;
  indicators: Array<{ type: string; quote: string; severity: CrisisSeverity }>;
  recommendedActions: string[];
}): string {
  const severityInfo = getSeverityDescription(assessment.overallSeverity);
  
  let output = `## Crisis Assessment: ${severityInfo.label}\n\n`;
  output += `${severityInfo.description}\n\n`;
  
  if (assessment.indicators.length > 0) {
    output += `### Indicators Found:\n`;
    for (const indicator of assessment.indicators) {
      const typeDesc = INDICATOR_DESCRIPTIONS[indicator.type] || indicator.type;
      output += `- **${typeDesc}** (${indicator.severity})\n`;
      output += `  > "${indicator.quote}"\n`;
    }
    output += '\n';
  }
  
  output += `### Recommended Actions:\n`;
  for (const action of assessment.recommendedActions) {
    output += `- ${action}\n`;
  }
  
  return output;
}

