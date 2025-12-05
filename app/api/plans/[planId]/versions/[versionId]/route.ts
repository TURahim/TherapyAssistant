import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as versionService from '@/lib/services/versionService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ planId: string; versionId: string }>;
}

/**
 * GET /api/plans/[planId]/versions/[versionId]
 * Get a specific version or compare two versions
 */
export async function GET(
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const compareWith = searchParams.get('compare');
    const includeDiff = searchParams.get('includeDiff') === 'true';

    const versionNumber = parseInt(versionId, 10);
    if (isNaN(versionNumber)) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    // If comparing two versions
    if (compareWith) {
      const compareVersionNumber = parseInt(compareWith, 10);
      if (isNaN(compareVersionNumber)) {
        return NextResponse.json({ error: 'Invalid compare version number' }, { status: 400 });
      }

      const comparison = await versionService.compareVersions(
        planId,
        Math.min(versionNumber, compareVersionNumber),
        Math.max(versionNumber, compareVersionNumber),
        therapist.id
      );

      return NextResponse.json(comparison);
    }

    // Get single version
    const version = await versionService.getVersion(
      planId,
      versionNumber,
      therapist.id,
      includeDiff
    );

    return NextResponse.json(version);
  } catch (error) {
    console.error('GET /api/plans/[planId]/versions/[versionId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

