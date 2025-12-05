/**
 * Preference Service
 *
 * Stores and retrieves therapist preferences (modality, tone, style)
 * and exposes helpers to apply them to AI prompt stages.
 */

import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { NotFoundError } from '@/lib/utils/errors';

// =============================================================================
// TYPES
// =============================================================================

export interface TherapistPreferencesInput {
  modality?: string; // e.g., CBT, DBT, ACT
  tone?: string; // e.g., collaborative, direct, supportive
  styleNotes?: string; // free text
  languageLevel?: 'professional' | 'conversational' | 'simple';
  includeIcdCodes?: boolean;
}

export interface TherapistPreferences {
  modality: string | null;
  tone: string | null;
  styleNotes: string | null;
  languageLevel: 'professional' | 'conversational' | 'simple';
  includeIcdCodes: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

async function getTherapistId(userId: string): Promise<string> {
  const therapist = await prisma.therapist.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!therapist) throw new NotFoundError('Therapist profile not found');
  return therapist.id;
}

// =============================================================================
// CRUD
// =============================================================================

export async function getPreferences(userId: string): Promise<TherapistPreferences> {
  const therapistId = await getTherapistId(userId);

  const prefs = await prisma.therapistPreferences.findUnique({
    where: { therapistId },
  });

  return {
    modality: prefs?.preferredModality || null,
    tone: prefs?.therapyStyle || null,
    styleNotes: prefs?.narrativeVoice || null,
    languageLevel: (prefs?.preferLanguageLevel as TherapistPreferences['languageLevel']) || 'professional',
    includeIcdCodes: prefs?.includeIcdCodes ?? true,
  };
}

export async function upsertPreferences(
  userId: string,
  input: TherapistPreferencesInput
): Promise<TherapistPreferences> {
  const therapistId = await getTherapistId(userId);

  const data: Prisma.TherapistPreferencesUpsertArgs['create'] = {
    therapistId,
    preferredModality: input.modality ?? null,
    therapyStyle: input.tone ?? null,
    narrativeVoice: input.styleNotes ?? null,
    preferLanguageLevel: input.languageLevel || 'professional',
    includeIcdCodes: input.includeIcdCodes ?? true,
  };

  const updateData: Prisma.TherapistPreferencesUpdateInput = {
    preferredModality: input.modality ?? null,
    therapyStyle: input.tone ?? null,
    narrativeVoice: input.styleNotes ?? null,
    preferLanguageLevel: input.languageLevel || 'professional',
    includeIcdCodes: input.includeIcdCodes ?? true,
  };

  const prefs = await prisma.therapistPreferences.upsert({
    where: { therapistId },
    create: data,
    update: updateData,
  });

  return {
    modality: prefs.preferredModality,
    tone: prefs.therapyStyle,
    styleNotes: prefs.narrativeVoice,
    languageLevel: prefs.preferLanguageLevel as TherapistPreferences['languageLevel'],
    includeIcdCodes: prefs.includeIcdCodes,
  };
}

// =============================================================================
// AI PROMPT HELPERS
// =============================================================================

export function applyPreferencesToPrompt(base: string, prefs: Partial<TherapistPreferences>): string {
  const lines: string[] = [base, '', '### Therapist Preferences'];

  if (prefs.modality) lines.push(`- Preferred modality: ${prefs.modality}`);
  if (prefs.tone) lines.push(`- Tone/style: ${prefs.tone}`);
  if (prefs.styleNotes) lines.push(`- Narrative voice notes: ${prefs.styleNotes}`);
  if (prefs.languageLevel) lines.push(`- Preferred language level: ${prefs.languageLevel}`);
  if (prefs.includeIcdCodes !== undefined) {
    lines.push(`- Include ICD codes: ${prefs.includeIcdCodes ? 'Yes' : 'No'}`);
  }

  return lines.join('\n');
}


