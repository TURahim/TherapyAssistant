/**
 * Homework Service
 *
 * Business logic for homework retrieval and status updates.
 */

import { prisma } from '@/lib/db/prisma';
import * as auditService from './auditService';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/utils/errors';
import type { HomeworkStatus, Prisma } from '@prisma/client';

// =============================================================================
// HELPERS
// =============================================================================

async function verifyPlanAccess(planId: string, userId: string): Promise<'THERAPIST' | 'CLIENT'> {
  // Therapist ownership
  const therapist = await prisma.therapist.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (therapist) {
    const isOwner = await prisma.treatmentPlan.findFirst({
      where: {
        id: planId,
        client: { therapistId: therapist.id },
      },
      select: { id: true },
    });
    if (isOwner) return 'THERAPIST';
  }

  // Client ownership
  const client = await prisma.client.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (client) {
    const hasAccess = await prisma.treatmentPlan.findFirst({
      where: {
        id: planId,
        clientId: client.id,
        status: 'ACTIVE',
        publishedAt: { not: null },
      },
      select: { id: true },
    });
    if (hasAccess) return 'CLIENT';
  }

  throw new ForbiddenError('You do not have access to this plan');
}

// =============================================================================
// PUBLIC API
// =============================================================================

export async function getHomeworkForPlan(planId: string, userId: string) {
  await verifyPlanAccess(planId, userId);

  return prisma.homework.findMany({
    where: { planId },
    orderBy: [{ order: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getHomework(homeworkId: string, userId: string) {
  const hw = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { planId: true },
  });
  if (!hw) throw new NotFoundError('Homework not found');

  await verifyPlanAccess(hw.planId, userId);

  return prisma.homework.findUnique({
    where: { id: homeworkId },
  });
}

export async function updateHomeworkStatus(
  homeworkId: string,
  userId: string,
  input: {
    status?: HomeworkStatus;
    clientNotes?: string | null;
    therapistNotes?: string | null;
    completed?: boolean;
  }
) {
  const hw = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { planId: true, status: true },
  });

  if (!hw) throw new NotFoundError('Homework not found');

  const role = await verifyPlanAccess(hw.planId, userId);

  const data: Prisma.HomeworkUpdateInput = {};

  if (input.status) data.status = input.status;
  if (input.clientNotes !== undefined) data.clientNotes = input.clientNotes;
  if (input.therapistNotes !== undefined) {
    if (role !== 'THERAPIST') throw new ForbiddenError('Only therapist can add therapist notes');
    data.therapistNotes = input.therapistNotes;
  }

  if (input.completed !== undefined) {
    data.status = input.completed ? 'COMPLETED' : 'ASSIGNED';
    data.completedAt = input.completed ? new Date() : null;
  }

  const updated = await prisma.homework.update({
    where: { id: homeworkId },
    data,
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'Homework',
    entityId: homeworkId,
    metadata: {
      planId: hw.planId,
      status: updated.status,
    } as Prisma.InputJsonValue,
  });

  return updated;
}

export async function reorderHomework(
  planId: string,
  userId: string,
  order: Array<{ id: string; order: number }>
) {
  // Only therapist can reorder
  const role = await verifyPlanAccess(planId, userId);
  if (role !== 'THERAPIST') throw new ForbiddenError('Only therapist can reorder homework');

  const updates = order.map((item) =>
    prisma.homework.update({
      where: { id: item.id },
      data: { order: item.order },
    })
  );

  await prisma.$transaction(updates);

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'Homework',
    entityId: planId,
    metadata: { type: 'reorder', count: order.length } as Prisma.InputJsonValue,
  });
}

