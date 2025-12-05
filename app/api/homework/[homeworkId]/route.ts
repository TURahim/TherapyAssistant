import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as homeworkService from '@/lib/services/homeworkService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ homeworkId: string }>;
}

const UpdateSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).optional(),
  clientNotes: z.string().optional().nullable(),
  therapistNotes: z.string().optional().nullable(),
  completed: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { homeworkId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hw = await homeworkService.getHomework(homeworkId, session.user.id);
    return NextResponse.json(hw);
  } catch (error) {
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { homeworkId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = UpdateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const updated = await homeworkService.updateHomeworkStatus(homeworkId, session.user.id, parsed.data);

    return NextResponse.json(updated);
  } catch (error) {
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

