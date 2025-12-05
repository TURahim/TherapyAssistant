import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as planService from '@/lib/services/planService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';
import type { PlanStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ planId: string }>;
}

/**
 * GET /api/plans/[planId]
 * Get a single treatment plan
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { planId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both therapist and client access
    if (session.user.role === 'CLIENT') {
      // Client can only view their own published plan
      const client = await prisma.client.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!client) {
        return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
      }

      const result = await planService.getClientPlan(client.id, session.user.id);
      return NextResponse.json(result);
    }

    // Therapist access
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

    const result = await planService.getPlan(
      planId,
      therapist.id,
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/plans/[planId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * PUT /api/plans/[planId]
 * Update a treatment plan
 */
export async function PUT(
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
    const { action } = body;

    switch (action) {
      case 'updateStatus': {
        const { status } = body as { status: PlanStatus };
        if (!status || !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 422 }
          );
        }
        const result = await planService.updatePlanStatus(
          planId,
          therapist.id,
          session.user.id,
          status
        );
        return NextResponse.json(result);
      }

      case 'publish': {
        const result = await planService.publishPlan(
          planId,
          therapist.id,
          session.user.id
        );
        return NextResponse.json(result);
      }

      case 'archive': {
        const result = await planService.archivePlan(
          planId,
          therapist.id,
          session.user.id
        );
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 422 }
        );
    }
  } catch (error) {
    console.error('PUT /api/plans/[planId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/plans/[planId]
 * Delete a treatment plan
 */
export async function DELETE(
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

    const result = await planService.deletePlan(
      planId,
      therapist.id,
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('DELETE /api/plans/[planId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

