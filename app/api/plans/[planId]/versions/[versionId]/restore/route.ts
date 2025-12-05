import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as versionService from '@/lib/services/versionService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ planId: string; versionId: string }>;
}

/**
 * POST /api/plans/[planId]/versions/[versionId]/restore
 * Restore a plan to a previous version
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { planId, versionId } = await params;
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

    const versionNumber = parseInt(versionId, 10);
    if (isNaN(versionNumber)) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    const result = await versionService.restoreVersion(
      planId,
      versionNumber,
      therapist.id,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      newVersionNumber: result.newVersionNumber,
      message: `Plan restored to version ${versionNumber}`,
    });
  } catch (error) {
    console.error('POST /api/plans/[planId]/versions/[versionId]/restore error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

