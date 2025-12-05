import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as sessionService from '@/lib/services/sessionService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]
 * Get a single session by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authSession = await auth();
    const { sessionId } = await params;

    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authSession.user.role !== 'THERAPIST' && authSession.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: authSession.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    const session = await sessionService.getSession(
      sessionId,
      therapist.id,
      authSession.user.id
    );

    const clientName = session.client.preferredName ||
      `${session.client.user.firstName} ${session.client.user.lastName}`;

    return NextResponse.json({
      id: session.id,
      sessionNumber: session.sessionNumber,
      clientId: session.clientId,
      clientName,
      clientEmail: session.client.user.email,
      therapistName: `${session.therapist.user.firstName} ${session.therapist.user.lastName}`,
      scheduledAt: session.scheduledAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      status: session.status,
      durationMinutes: session.durationMinutes,
      transcript: session.transcript,
      notes: session.notes,
      crisisSeverity: session.crisisSeverity,
      crisisIndicators: session.crisisIndicators,
      summary: session.summary,
      mediaUploads: session.mediaUploads,
      hasGeneratedPlan: session.planVersions && session.planVersions.length > 0,
      latestPlanId: session.planVersions?.[0]?.plan?.id || null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch (error) {
    console.error('GET /api/sessions/[sessionId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * PUT /api/sessions/[sessionId]
 * Update a session
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authSession = await auth();
    const { sessionId } = await params;

    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authSession.user.role !== 'THERAPIST' && authSession.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: authSession.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    const body = await request.json();

    // Handle special actions
    if (body.action) {
      switch (body.action) {
        case 'start':
          const started = await sessionService.startSession(
            sessionId,
            therapist.id,
            authSession.user.id
          );
          return NextResponse.json({
            id: started.id,
            status: started.status,
            startedAt: started.startedAt,
          });

        case 'complete':
          const completed = await sessionService.completeSession(
            sessionId,
            therapist.id,
            authSession.user.id,
            body.durationMinutes
          );
          return NextResponse.json({
            id: completed.id,
            status: completed.status,
            endedAt: completed.endedAt,
            durationMinutes: completed.durationMinutes,
          });

        case 'cancel':
          const cancelled = await sessionService.cancelSession(
            sessionId,
            therapist.id,
            authSession.user.id
          );
          return NextResponse.json({
            id: cancelled.id,
            status: cancelled.status,
          });

        case 'addTranscript':
          if (!body.transcript) {
            return NextResponse.json(
              { error: 'Transcript is required' },
              { status: 422 }
            );
          }
          const withTranscript = await sessionService.addTranscript(
            sessionId,
            therapist.id,
            authSession.user.id,
            body.transcript,
            body.source || 'paste'
          );
          return NextResponse.json({
            id: withTranscript.id,
            hasTranscript: !!withTranscript.transcript,
            transcriptLength: withTranscript.transcript?.length || 0,
          });

        default:
          return NextResponse.json(
            { error: `Unknown action: ${body.action}` },
            { status: 400 }
          );
      }
    }

    // Regular update
    const allowedFields = [
      'scheduledAt',
      'durationMinutes',
      'notes',
      'status',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await sessionService.updateSession(
      sessionId,
      therapist.id,
      authSession.user.id,
      updateData
    );

    return NextResponse.json({
      id: updated.id,
      sessionNumber: updated.sessionNumber,
      status: updated.status,
      scheduledAt: updated.scheduledAt,
    });
  } catch (error) {
    console.error('PUT /api/sessions/[sessionId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 * Delete a session
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authSession = await auth();
    const { sessionId } = await params;

    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authSession.user.role !== 'THERAPIST' && authSession.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: authSession.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    await sessionService.deleteSession(
      sessionId,
      therapist.id,
      authSession.user.id
    );

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/sessions/[sessionId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

