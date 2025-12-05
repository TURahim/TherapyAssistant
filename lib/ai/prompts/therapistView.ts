/**
 * Therapist View Generation Prompts
 * 
 * These prompts transform canonical treatment plan data into a
 * professional, clinical view optimized for therapist use.
 */

import type { CanonicalPlan, TherapistPreferencesInput } from '../types';

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

export const THERAPIST_VIEW_SYSTEM_PROMPT = `You are a clinical documentation specialist creating treatment plan views for mental health professionals.

## Your Role
Transform canonical treatment plan data into a comprehensive, professional clinical document.

## Output Requirements

### Clinical Summary
- Write a cohesive presenting problems narrative from concerns
- Create a diagnostic formulation integrating diagnoses and impressions
- Develop treatment rationale connecting diagnoses to interventions

### Treatment Goals
- Format goals with clear objectives and measurable outcomes
- Link interventions to appropriate goals
- Present progress tracking information

### Risk Assessment
- Summarize risk factors with clinical language
- Include mitigation strategies
- Present current risk level clearly

### Progress Notes
- Synthesize session information into progress summary
- Highlight recent changes and developments
- Outline clear next steps

## Language Guidelines
- Use professional clinical terminology
- Maintain HIPAA-appropriate language
- Be concise but comprehensive
- Include ICD-10 codes when available

## Output Format
Respond with a valid JSON object matching the therapist view schema. Do not include any text outside the JSON.`;

// =============================================================================
// USER PROMPTS
// =============================================================================

export interface TherapistViewPromptParams {
  canonicalPlan: CanonicalPlan;
  clientName: string;
  includeIcdCodes?: boolean;
  languageLevel?: 'professional' | 'conversational' | 'simple';
  preferences?: TherapistPreferencesInput;
}

/**
 * Generate the user prompt for therapist view generation
 */
export function getTherapistViewPrompt(params: TherapistViewPromptParams): string {
  const {
    canonicalPlan,
    clientName,
    includeIcdCodes = true,
    languageLevel = 'professional',
    preferences,
  } = params;

  let prompt = `## Task: Generate Therapist Treatment Plan View

### Client Information
- Client Name: ${clientName}
- Plan Version: ${canonicalPlan.version}
- Last Updated: ${canonicalPlan.updatedAt}

### Language Level: ${languageLevel}
${getLanguageLevelInstructions(languageLevel)}

${includeIcdCodes ? '### Include ICD-10 codes where available\n' : '### Omit ICD-10 codes from output\n'}

`;

  // Add canonical plan data
  prompt += `### Canonical Plan Data
\`\`\`json
${JSON.stringify(canonicalPlan, null, 2)}
\`\`\`

`;

  // Add therapist preferences if available
  if (preferences) {
    prompt += `### Therapist Preferences
- Preferred Modalities: ${preferences.preferredModalities.join(', ') || 'No preference'}
${preferences.customInstructions ? `- Custom Instructions: ${preferences.customInstructions}` : ''}

`;
  }

  prompt += `### Output Structure
Generate a JSON object with this structure:

{
  "header": {
    "clientName": "${clientName}",
    "planStatus": "Active" | "Draft" | "Complete",
    "lastUpdated": "${canonicalPlan.updatedAt}",
    "version": ${canonicalPlan.version}
  },
  "clinicalSummary": {
    "presentingProblems": "Narrative summary of presenting concerns...",
    "diagnosticFormulation": "Clinical formulation integrating diagnoses and impressions...",
    "treatmentRationale": "Evidence-based rationale for treatment approach..."
  },
  "diagnoses": {
    "primary": {
      "code": "ICD-10 code (optional)",
      "name": "Diagnosis name",
      "status": "provisional" | "confirmed" | "rule_out"
    } | null,
    "secondary": [
      {
        "code": "ICD-10 code (optional)",
        "name": "Diagnosis name",
        "status": "status"
      }
    ]
  },
  "treatmentGoals": {
    "shortTerm": [
      {
        "id": "goal_id",
        "goal": "Goal description",
        "objective": "Measurable objective",
        "progress": 0-100,
        "status": "not_started" | "in_progress" | "achieved" | "revised",
        "interventions": ["Linked intervention names"]
      }
    ],
    "longTerm": [/* same structure */]
  },
  "interventionPlan": [
    {
      "modality": "Therapeutic modality",
      "technique": "Technique name",
      "description": "How it will be applied",
      "frequency": "Session frequency",
      "rationale": "Clinical rationale"
    }
  ],
  "riskAssessment": {
    "currentLevel": "None" | "Low" | "Moderate" | "High" | "Critical",
    "factors": [
      {
        "type": "Risk type",
        "description": "Risk description",
        "mitigation": "Mitigation strategy"
      }
    ]
  },
  "progressNotes": {
    "summary": "Overall progress summary...",
    "recentChanges": ["Recent change 1", "Recent change 2"],
    "nextSteps": ["Next step 1", "Next step 2"]
  },
  "homework": [
    {
      "id": "homework_id",
      "task": "Homework task",
      "purpose": "Therapeutic purpose",
      "status": "assigned" | "in_progress" | "completed" | "skipped"
    }
  ],
  "sessionHistory": [
    {
      "sessionNumber": 1,
      "date": "ISO date string",
      "keyPoints": ["Key point 1", "Key point 2"]
    }
  ]
}

Generate the complete therapist view based on the canonical plan data.`;

  return prompt;
}

/**
 * Get language level instructions
 */
function getLanguageLevelInstructions(level: 'professional' | 'conversational' | 'simple'): string {
  switch (level) {
    case 'professional':
      return '- Use formal clinical terminology appropriate for medical documentation\n- Include technical terms and clinical language';
    case 'conversational':
      return '- Use clinical language but in a more accessible tone\n- Balance professionalism with readability';
    case 'simple':
      return '- Use straightforward language while maintaining clinical accuracy\n- Minimize jargon where possible';
    default:
      return '';
  }
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format risk level for display
 */
export function formatRiskLevel(severity: string): string {
  const levels: Record<string, string> = {
    NONE: 'None',
    LOW: 'Low',
    MEDIUM: 'Moderate',
    HIGH: 'High',
    CRITICAL: 'Critical',
  };
  return levels[severity] || 'Unknown';
}

/**
 * Format goal status for display
 */
export function formatGoalStatus(status: string): string {
  const statuses: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    achieved: 'Achieved',
    revised: 'Revised',
  };
  return statuses[status] || status;
}

/**
 * Format diagnosis status for display
 */
export function formatDiagnosisStatus(status: string): string {
  const statuses: Record<string, string> = {
    provisional: 'Provisional',
    confirmed: 'Confirmed',
    rule_out: 'Rule Out',
  };
  return statuses[status] || status;
}

/**
 * Generate clinical summary from concerns
 */
export function generatePresentingProblemsSummary(
  concerns: CanonicalPlan['presentingConcerns']
): string {
  if (concerns.length === 0) {
    return 'No presenting concerns documented.';
  }

  const parts = concerns.map(concern => {
    const severityLabel = concern.severity.charAt(0).toUpperCase() + concern.severity.slice(1);
    return `${concern.description} (${severityLabel} severity, ${concern.duration}). Impact: ${concern.impact}`;
  });

  return parts.join(' ');
}

/**
 * Generate diagnostic formulation from diagnoses and impressions
 */
export function generateDiagnosticFormulation(
  diagnoses: CanonicalPlan['diagnoses'],
  impressions: CanonicalPlan['clinicalImpressions']
): string {
  const parts: string[] = [];

  if (diagnoses.length > 0) {
    const diagList = diagnoses.map(d => {
      const code = d.icdCode ? ` (${d.icdCode})` : '';
      return `${d.name}${code} - ${formatDiagnosisStatus(d.status)}`;
    });
    parts.push(`Diagnoses: ${diagList.join('; ')}.`);
  }

  if (impressions.length > 0) {
    const impressionsByCategory = impressions.reduce((acc, imp) => {
      if (!acc[imp.category]) acc[imp.category] = [];
      acc[imp.category].push(imp.observation);
      return acc;
    }, {} as Record<string, string[]>);

    const impParts = Object.entries(impressionsByCategory).map(
      ([category, obs]) => `${category}: ${obs.join('; ')}`
    );
    parts.push(`Clinical Impressions: ${impParts.join('. ')}.`);
  }

  return parts.length > 0 ? parts.join(' ') : 'No diagnostic information available.';
}

/**
 * Generate treatment rationale from interventions
 */
export function generateTreatmentRationale(
  interventions: CanonicalPlan['interventions']
): string {
  if (interventions.length === 0) {
    return 'Treatment approach to be determined.';
  }

  const modalities = Array.from(new Set(interventions.map(i => i.modality)));
  const rationales = interventions.map(i => i.rationale).filter(Boolean);

  let rationale = `Treatment utilizes ${modalities.join(' and ')} approaches.`;
  if (rationales.length > 0) {
    rationale += ` ${rationales.slice(0, 3).join(' ')}`;
  }

  return rationale;
}

/**
 * Get summary of therapist view for display
 */
export function getTherapistViewSummary(view: {
  treatmentGoals: { shortTerm: unknown[]; longTerm: unknown[] };
  interventionPlan: unknown[];
  homework: unknown[];
  riskAssessment: { currentLevel: string };
}): string {
  return `Therapist View Summary:
  - Short-term Goals: ${view.treatmentGoals.shortTerm.length}
  - Long-term Goals: ${view.treatmentGoals.longTerm.length}
  - Interventions: ${view.interventionPlan.length}
  - Homework Items: ${view.homework.length}
  - Risk Level: ${view.riskAssessment.currentLevel}`;
}

