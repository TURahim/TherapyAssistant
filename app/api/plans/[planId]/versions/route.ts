import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as versionService from '@/lib/services/versionService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ planId: string }>;
}

/**
 * GET /api/plans/[planId]/versions
 * Get version history for a plan
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
    const params_page = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    const result = await versionService.getVersions(
      planId,
      therapist.id,
      params_page
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/plans/[planId]/versions error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

