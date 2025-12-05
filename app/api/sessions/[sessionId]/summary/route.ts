import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as summaryService from '@/lib/services/summaryService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// =============================================================================
// SCHEMAS
// =============================================================================

const UpdateSummarySchema = z.object({
  type: z.enum(['therapist', 'client']),
  summary: z.string().min(1),
  keyTopics: z.array(z.string()).optional(),
});

const RegenerateSchema = z.object({
  type: z.enum(['therapist', 'client', 'both']),
});

// =============================================================================
// GET - Get summary for session
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get therapist
    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    const summary = await summaryService.getSummary(sessionId, therapist.id);

    if (!summary) {
      return NextResponse.json({ summary: null, exists: false });
    }

    return NextResponse.json({
      summary,
      exists: true,
    });
  } catch (error) {
    console.error('GET /api/sessions/[sessionId]/summary error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// =============================================================================
// POST - Generate new summary
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    // Check if regenerating specific type
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parseResult = RegenerateSchema.safeParse(body);
    const type = parseResult.success ? parseResult.data.type : 'both';

    let result;

    if (type === 'therapist') {
      result = await summaryService.regenerateTherapistSummary(
        sessionId,
        therapist.id,
        session.user.id
      );
      return NextResponse.json({
        success: true,
        type: 'therapist',
        summary: result.text,
      });
    }

    if (type === 'client') {
      result = await summaryService.regenerateClientSummary(
        sessionId,
        therapist.id,
        session.user.id
      );
      return NextResponse.json({
        success: true,
        type: 'client',
        summary: result.text,
      });
    }

    // Generate both
    result = await summaryService.generateSummary(
      sessionId,
      therapist.id,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      type: 'both',
      therapistSummary: result.therapistText,
      clientSummary: result.clientText,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('POST /api/sessions/[sessionId]/summary error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// =============================================================================
// PUT - Update summary
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const parseResult = UpdateSummarySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { type, summary, keyTopics } = parseResult.data;

    if (type === 'therapist') {
      await summaryService.updateTherapistSummary(
        sessionId,
        therapist.id,
        session.user.id,
        summary,
        keyTopics
      );
    } else {
      await summaryService.updateClientSummary(
        sessionId,
        therapist.id,
        session.user.id,
        summary
      );
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'therapist' ? 'Therapist' : 'Client'} summary updated`,
    });
  } catch (error) {
    console.error('PUT /api/sessions/[sessionId]/summary error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

