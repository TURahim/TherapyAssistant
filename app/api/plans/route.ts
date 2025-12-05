import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as planService from '@/lib/services/planService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';
import type { PlanStatus } from '@prisma/client';

/**
 * GET /api/plans
 * Get all treatment plans for the authenticated therapist
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
      status: searchParams.get('status') as PlanStatus | undefined,
    };

    const result = await planService.getTherapistPlans(
      therapist.id,
      session.user.id,
      params
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/plans error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

