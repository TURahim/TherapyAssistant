/**
 * Canonical Plan Extraction Prompts
 * 
 * These prompts guide the AI in extracting structured clinical information
 * from therapy session transcripts to build/update canonical treatment plans.
 */

import type { CanonicalPlan, TherapistPreferencesInput } from '../types';
import { applyPreferencesToPrompt } from '@/lib/services/preferenceService';

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert clinical documentation specialist assisting mental health professionals.

## Your Role
Extract structured clinical information from therapy session transcripts to build comprehensive treatment plans.

## Extraction Guidelines

### What to Extract:
1. **Presenting Concerns**: Issues the client is struggling with
   - Description, severity (mild/moderate/severe), duration, impact on functioning

2. **Clinical Impressions**: Professional observations about the client
   - Cognitive, Emotional, Behavioral, Interpersonal, or Physiological categories

3. **Suggested Diagnoses**: Potential diagnoses based on presented symptoms
   - Include ICD-10 codes when confident, mark as provisional/confirmed/rule_out

4. **Treatment Goals**: Objectives for therapy
   - Short-term (4-8 weeks) and long-term (3-6 months)
   - Make them SMART: Specific, Measurable, Achievable, Relevant, Time-bound

5. **Interventions**: Therapeutic techniques being used or recommended
   - Include modality, name, description, frequency, rationale

6. **Strengths**: Client resources and protective factors
   - Personal, social, environmental, and coping strengths

7. **Risk Factors**: Safety concerns identified
   - Type, description, severity, mitigating factors

8. **Homework**: Therapeutic assignments
   - Title, description, rationale, connected goals

### Extraction Rules:
- Extract information EXPLICITLY stated or CLEARLY implied in the transcript
- Use clinical language appropriate for medical records
- Include specific quotes when relevant (in quotation marks)
- Assign unique IDs to each extracted item (use format: type_timestamp_index)
- Mark all sourceSessionIds with the current session ID
- Be conservative with diagnoses - mark as "provisional" unless clearly established

### Quality Standards:
- Accuracy: Only extract what's supported by the transcript
- Completeness: Capture all relevant clinical information
- Clarity: Use precise, professional language
- Actionability: Goals and interventions should be specific and measurable

## Output Format
Respond with a valid JSON object matching the extraction schema. Do not include any text outside the JSON.`;

// =============================================================================
// USER PROMPTS
// =============================================================================

export function getExtractionPrompt(params: {
  transcript: string;
  sessionId: string;
  sessionNumber: number;
  existingPlan?: CanonicalPlan | null;
  preferences?: TherapistPreferencesInput;
  clientContext?: string;
}): string {
  const { transcript, sessionId, sessionNumber, existingPlan, preferences, clientContext } = params;

  let prompt = `## Session Information
- Session ID: ${sessionId}
- Session Number: ${sessionNumber}
${clientContext ? `- Client Context: ${clientContext}` : ''}

## Transcript
\`\`\`
${transcript}
\`\`\`

`;

  if (existingPlan) {
    prompt += `## Existing Treatment Plan Context
This client has an existing treatment plan. Consider how this session updates or adds to it:

### Current Goals:
${existingPlan.goals.map(g => `- [${g.status}] ${g.description} (${g.progress}% progress)`).join('\n') || 'None yet'}

### Current Concerns:
${existingPlan.presentingConcerns.map(c => `- ${c.description} (${c.severity})`).join('\n') || 'None documented'}

### Previous Diagnoses:
${existingPlan.diagnoses.map(d => `- ${d.name} (${d.status})`).join('\n') || 'None documented'}

`;
  }

  if (preferences) {
    prompt = applyPreferencesToPrompt(prompt, {
      modality: preferences.preferredModalities?.join(', ') || null,
      tone: preferences.languageLevel,
      styleNotes: preferences.customInstructions || null,
      readingLevel: preferences.targetReadingLevel ?? null,
      includePsychoeducation: preferences.includePsychoeducation ?? false,
    });
  }

  prompt += `## Extraction Task
Analyze the transcript and extract clinical information into the following JSON structure:

{
  "concerns": [
    {
      "id": "concern_${Date.now()}_0",
      "description": "string - clear description of the presenting concern",
      "severity": "mild" | "moderate" | "severe",
      "duration": "string - how long this has been an issue",
      "impact": "string - how this affects the client's functioning",
      "sourceSessionIds": ["${sessionId}"]
    }
  ],
  "impressions": [
    {
      "id": "impression_${Date.now()}_0",
      "observation": "string - clinical observation",
      "category": "Cognitive" | "Emotional" | "Behavioral" | "Interpersonal" | "Physiological",
      "sourceSessionIds": ["${sessionId}"]
    }
  ],
  "suggestedDiagnoses": [
    {
      "id": "diagnosis_${Date.now()}_0",
      "icdCode": "string - ICD-10 code if confident (e.g., 'F41.1')",
      "name": "string - diagnosis name",
      "status": "provisional" | "confirmed" | "rule_out",
      "notes": "string - supporting evidence or clinical reasoning"
    }
  ],
  "goals": [
    {
      "id": "goal_${Date.now()}_0",
      "type": "short_term" | "long_term",
      "description": "string - goal description",
      "measurableOutcome": "string - how progress will be measured",
      "targetDate": "string - ISO date (optional)",
      "status": "not_started" | "in_progress",
      "progress": 0,
      "interventionIds": [],
      "sourceSessionIds": ["${sessionId}"]
    }
  ],
  "interventions": [
    {
      "id": "intervention_${Date.now()}_0",
      "modality": "string - e.g., 'CBT', 'DBT', 'Psychodynamic'",
      "name": "string - technique name",
      "description": "string - how it will be applied",
      "frequency": "string - e.g., 'Weekly practice', 'Daily'",
      "rationale": "string - why this intervention is appropriate"
    }
  ],
  "strengths": [
    {
      "id": "strength_${Date.now()}_0",
      "category": "personal" | "social" | "environmental" | "coping",
      "description": "string - identified strength",
      "sourceSessionIds": ["${sessionId}"]
    }
  ],
  "risks": [
    {
      "id": "risk_${Date.now()}_0",
      "type": "suicidal_ideation" | "self_harm" | "substance_use" | "violence" | "other",
      "description": "string - risk description",
      "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "mitigatingFactors": ["string"],
      "sourceSessionIds": ["${sessionId}"]
    }
  ],
  "homework": [
    {
      "id": "homework_${Date.now()}_0",
      "title": "string - brief title",
      "description": "string - detailed description",
      "rationale": "string - therapeutic purpose",
      "goalIds": ["string - linked goal IDs"],
      "status": "assigned",
      "dueDate": "string - ISO date (optional)"
    }
  ]
}

Extract all relevant information from the transcript. If a category has no relevant information, use an empty array [].`;

  return prompt;
}

// =============================================================================
// MERGE PROMPTS
// =============================================================================

export function getMergePlanPrompt(params: {
  existingPlan: CanonicalPlan;
  newExtractions: unknown;
  sessionId: string;
}): string {
  const { existingPlan, newExtractions, sessionId } = params;

  return `## Task: Merge New Session Data into Existing Treatment Plan

### Existing Plan (v${existingPlan.version})
\`\`\`json
${JSON.stringify(existingPlan, null, 2)}
\`\`\`

### New Extractions from Session ${sessionId}
\`\`\`json
${JSON.stringify(newExtractions, null, 2)}
\`\`\`

## Merge Instructions
1. **Update existing items**: If an existing concern, goal, or intervention is discussed, update its status/progress
2. **Add new items**: Add newly identified concerns, goals, interventions, etc.
3. **Deduplicate**: Don't create duplicates of existing items
4. **Track sources**: Add the new session ID to sourceSessionIds arrays
5. **Update progress**: If goals were worked on, update progress percentage
6. **Maintain history**: Keep all session references

Return the merged plan as a complete JSON object matching the canonical plan schema.
Increment the version number by 1.`;
}

// =============================================================================
// VALIDATION PROMPTS
// =============================================================================

export function getValidationPrompt(plan: unknown): string {
  return `## Task: Validate and Correct Treatment Plan

Review the following treatment plan for:
1. Internal consistency (goals link to interventions, homework links to goals)
2. Clinical accuracy (diagnoses match symptoms, interventions match diagnoses)
3. Completeness (all required fields present)
4. Professional language (appropriate clinical terminology)

### Plan to Validate
\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

If corrections are needed, return the corrected plan as JSON.
If the plan is valid, return it unchanged.
Include a "validationNotes" field with any observations.`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique IDs for extracted items
 */
export function generateItemId(type: string, index: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${type}_${timestamp}_${index}_${random}`;
}

/**
 * Get extraction instructions for specific modalities
 */
export function getModalitySpecificInstructions(modality: string): string {
  const instructions: Record<string, string> = {
    CBT: `Focus on identifying cognitive distortions, automatic thoughts, behavioral patterns, and opportunities for cognitive restructuring.`,
    DBT: `Look for emotion regulation difficulties, interpersonal effectiveness issues, distress tolerance needs, and mindfulness opportunities.`,
    Psychodynamic: `Attend to transference, defense mechanisms, early experiences, and unconscious patterns in relationships.`,
    ACT: `Identify psychological inflexibility, values clarification opportunities, and committed action possibilities.`,
    EMDR: `Note trauma memories, negative cognitions, body sensations, and potential targets for processing.`,
    MI: `Track change talk, sustain talk, readiness to change, and ambivalence expressions.`,
  };

  return instructions[modality] || '';
}

/**
 * Format extraction results for logging
 */
export function formatExtractionSummary(extraction: {
  concerns: unknown[];
  impressions: unknown[];
  suggestedDiagnoses: unknown[];
  goals: unknown[];
  interventions: unknown[];
  strengths: unknown[];
  risks: unknown[];
  homework: unknown[];
}): string {
  return `Extraction Summary:
  - Concerns: ${extraction.concerns.length}
  - Impressions: ${extraction.impressions.length}
  - Diagnoses: ${extraction.suggestedDiagnoses.length}
  - Goals: ${extraction.goals.length}
  - Interventions: ${extraction.interventions.length}
  - Strengths: ${extraction.strengths.length}
  - Risks: ${extraction.risks.length}
  - Homework: ${extraction.homework.length}`;
}

