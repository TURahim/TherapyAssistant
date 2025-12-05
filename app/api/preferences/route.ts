import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { formatErrorResponse } from '@/lib/utils/errors';
import * as preferenceService from '@/lib/services/preferenceService';
import { z } from 'zod';

// =============================================================================
// Schema
// =============================================================================

const PreferenceSchema = z.object({
  modality: z.string().max(100).optional(),
  tone: z.string().max(200).optional(),
  styleNotes: z.string().max(1000).optional(),
  languageLevel: z.enum(['professional', 'conversational', 'simple']).optional(),
  includeIcdCodes: z.boolean().optional(),
});

// =============================================================================
// GET
// =============================================================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prefs = await preferenceService.getPreferences(session.user.id);
    return NextResponse.json(prefs);
  } catch (error) {
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// =============================================================================
// PUT (upsert)
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = PreferenceSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const prefs = await preferenceService.upsertPreferences(session.user.id, parsed.data);
    return NextResponse.json(prefs);
  } catch (error) {
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}


