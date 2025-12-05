import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as planService from '@/lib/services/planService';
import { formatErrorResponse, ValidationError } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ planId: string }>;
}

/**
 * POST /api/plans/[planId]/generate
 * Generate/update treatment plan from session transcript
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { planId } = await params;
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
    const { sessionId, transcript } = body;

    // Validate input
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (!transcript || transcript.trim().length < 100) {
      throw new ValidationError('Transcript must be at least 100 characters');
    }

    // Get the session to verify client
    const sessionData = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { clientId: true, therapistId: true },
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (sessionData.therapistId !== therapist.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify plan belongs to this client (if planId is not 'new')
    if (planId !== 'new') {
      const plan = await prisma.treatmentPlan.findUnique({
        where: { id: planId },
        select: { clientId: true },
      });

      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      if (plan.clientId !== sessionData.clientId) {
        return NextResponse.json(
          { error: 'Plan does not belong to this session\'s client' },
          { status: 422 }
        );
      }
    }

    // Generate the plan
    const result = await planService.generatePlan({
      sessionId,
      clientId: sessionData.clientId,
      therapistId: therapist.id,
      userId: session.user.id,
      transcript: transcript.trim(),
    });

    if (result.crisisDetected && !result.success) {
      // Return 200 but with crisis flag - let client handle appropriately
      return NextResponse.json({
        ...result,
        message: 'Plan generation halted due to crisis detection. Please review immediately.',
      });
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Plan generation failed',
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/plans/[planId]/generate error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

