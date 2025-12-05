import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as sessionService from '@/lib/services/sessionService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/sessions
 * Get all sessions for the authenticated therapist
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'THERAPIST' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const params = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      clientId: searchParams.get('clientId') || undefined,
      status: searchParams.get('status') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      hasCrisis: searchParams.get('hasCrisis') === 'true' ? true : undefined,
      sortBy: searchParams.get('sortBy') || 'scheduledAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const result = await sessionService.getTherapistSessions(
      therapist.id,
      session.user.id,
      params
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/sessions error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/sessions
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'THERAPIST' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate input
    const validation = sessionService.validateCreateSessionInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 422 }
      );
    }

    const result = await sessionService.createSession(
      {
        clientId: body.clientId,
        scheduledAt: new Date(body.scheduledAt),
        durationMinutes: body.durationMinutes,
        notes: body.notes,
      },
      therapist.id,
      session.user.id
    );

    const clientName = result.client.preferredName ||
      `${result.client.user.firstName} ${result.client.user.lastName}`;

    return NextResponse.json(
      {
        id: result.id,
        sessionNumber: result.sessionNumber,
        clientId: result.clientId,
        clientName,
        scheduledAt: result.scheduledAt,
        status: result.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/sessions error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

