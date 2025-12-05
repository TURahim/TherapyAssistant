import { prisma } from '@/lib/db/prisma';
import type { Prisma, PlanStatus } from '@prisma/client';

// =============================================================================
// PLAN QUERIES
// =============================================================================

/**
 * Get all treatment plans for a client
 */
export async function getPlansByClient(
  clientId: string,
  params: { page?: number; limit?: number; status?: PlanStatus } = {}
) {
  const { page = 1, limit = 10, status } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.TreatmentPlanWhereInput = {
    clientId,
    ...(status && { status }),
  };

  const [plans, total] = await Promise.all([
    prisma.treatmentPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            changeType: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            versions: true,
            homework: true,
          },
        },
      },
    }),
    prisma.treatmentPlan.count({ where }),
  ]);

  return {
    items: plans,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get a single treatment plan by ID
 */
export async function getPlanById(planId: string) {
  return prisma.treatmentPlan.findUnique({
    where: { id: planId },
    include: {
      client: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 5,
        select: {
          id: true,
          versionNumber: true,
          changeType: true,
          changeSummary: true,
          createdAt: true,
          createdBy: true,
        },
      },
      homework: {
        where: {
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          versions: true,
          homework: true,
          edits: true,
        },
      },
    },
  });
}

/**
 * Get active plan for a client
 */
export async function getActivePlanForClient(clientId: string) {
  return prisma.treatmentPlan.findFirst({
    where: {
      clientId,
      status: 'ACTIVE',
    },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
    },
  });
}

/**
 * Get or create plan for a client
 */
export async function getOrCreatePlan(clientId: string) {
  // Check for existing active or draft plan
  const existingPlan = await prisma.treatmentPlan.findFirst({
    where: {
      clientId,
      status: { in: ['ACTIVE', 'DRAFT'] },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (existingPlan) {
    return existingPlan;
  }

  // Create new plan
  return prisma.treatmentPlan.create({
    data: {
      clientId,
      status: 'DRAFT',
      currentVersion: 0,
      canonicalPlan: {},
      therapistView: {},
      clientView: {},
    },
  });
}

/**
 * Create a new treatment plan
 */
export async function createPlan(data: {
  clientId: string;
  canonicalPlan?: Prisma.InputJsonValue;
  therapistView?: Prisma.InputJsonValue;
  clientView?: Prisma.InputJsonValue;
  status?: PlanStatus;
}) {
  return prisma.treatmentPlan.create({
    data: {
      clientId: data.clientId,
      status: data.status || 'DRAFT',
      currentVersion: 1,
      canonicalPlan: data.canonicalPlan || {},
      therapistView: data.therapistView || {},
      clientView: data.clientView || {},
      lastGeneratedAt: new Date(),
    },
  });
}

/**
 * Update a treatment plan
 */
export async function updatePlan(
  planId: string,
  data: {
    canonicalPlan?: Prisma.InputJsonValue;
    therapistView?: Prisma.InputJsonValue;
    clientView?: Prisma.InputJsonValue;
    status?: PlanStatus;
    currentVersion?: number;
    isLocked?: boolean;
    lastGeneratedAt?: Date;
    publishedAt?: Date;
  }
) {
  return prisma.treatmentPlan.update({
    where: { id: planId },
    data: data as Prisma.TreatmentPlanUpdateInput,
  });
}

/**
 * Lock a plan (during generation)
 */
export async function lockPlan(planId: string) {
  return prisma.treatmentPlan.update({
    where: { id: planId },
    data: { isLocked: true },
  });
}

/**
 * Unlock a plan
 */
export async function unlockPlan(planId: string) {
  return prisma.treatmentPlan.update({
    where: { id: planId },
    data: { isLocked: false },
  });
}

/**
 * Check if a plan belongs to a therapist's client
 */
export async function isPlanOfTherapist(
  planId: string,
  therapistId: string
): Promise<boolean> {
  const plan = await prisma.treatmentPlan.findFirst({
    where: {
      id: planId,
      client: {
        therapistId,
      },
    },
    select: { id: true },
  });

  return plan !== null;
}

/**
 * Check if user can view plan (as client)
 */
export async function isPlanOfClient(
  planId: string,
  clientId: string
): Promise<boolean> {
  const plan = await prisma.treatmentPlan.findFirst({
    where: {
      id: planId,
      clientId,
      status: 'ACTIVE',
      publishedAt: { not: null },
    },
    select: { id: true },
  });

  return plan !== null;
}

/**
 * Delete a treatment plan
 */
export async function deletePlan(planId: string) {
  return prisma.treatmentPlan.delete({
    where: { id: planId },
  });
}

// =============================================================================
// VERSION QUERIES
// =============================================================================

/**
 * Create a new plan version
 */
export async function createPlanVersion(data: {
  planId: string;
  versionNumber: number;
  sessionId?: string;
  canonicalPlan: Prisma.InputJsonValue;
  therapistView: Prisma.InputJsonValue;
  clientView: Prisma.InputJsonValue;
  changeType: string;
  changeSummary?: string;
  diffFromPrevious?: Prisma.InputJsonValue;
  createdBy: string;
}) {
  return prisma.treatmentPlanVersion.create({
    data: {
      planId: data.planId,
      versionNumber: data.versionNumber,
      sessionId: data.sessionId,
      canonicalPlan: data.canonicalPlan,
      therapistView: data.therapistView,
      clientView: data.clientView,
      changeType: data.changeType,
      changeSummary: data.changeSummary,
      diffFromPrevious: data.diffFromPrevious,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Get version history for a plan
 */
export async function getPlanVersions(
  planId: string,
  params: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const [versions, total] = await Promise.all([
    prisma.treatmentPlanVersion.findMany({
      where: { planId },
      skip,
      take: limit,
      orderBy: { versionNumber: 'desc' },
      include: {
        session: {
          select: {
            id: true,
            sessionNumber: true,
            scheduledAt: true,
          },
        },
      },
    }),
    prisma.treatmentPlanVersion.count({ where: { planId } }),
  ]);

  return {
    items: versions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get a specific version
 */
export async function getPlanVersion(planId: string, versionNumber: number) {
  return prisma.treatmentPlanVersion.findUnique({
    where: {
      planId_versionNumber: {
        planId,
        versionNumber,
      },
    },
    include: {
      session: {
        select: {
          id: true,
          sessionNumber: true,
          scheduledAt: true,
        },
      },
    },
  });
}

/**
 * Get the latest version number for a plan
 */
export async function getLatestVersionNumber(planId: string): Promise<number> {
  const latest = await prisma.treatmentPlanVersion.findFirst({
    where: { planId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  return latest?.versionNumber ?? 0;
}

// =============================================================================
// STATS & HELPERS
// =============================================================================

/**
 * Get plan stats for a therapist
 */
export async function getPlanStats(therapistId: string) {
  const [totalPlans, activePlans, draftPlans, recentUpdates] = await Promise.all([
    prisma.treatmentPlan.count({
      where: {
        client: { therapistId },
      },
    }),
    prisma.treatmentPlan.count({
      where: {
        client: { therapistId },
        status: 'ACTIVE',
      },
    }),
    prisma.treatmentPlan.count({
      where: {
        client: { therapistId },
        status: 'DRAFT',
      },
    }),
    prisma.treatmentPlan.count({
      where: {
        client: { therapistId },
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    }),
  ]);

  return {
    totalPlans,
    activePlans,
    draftPlans,
    recentUpdates,
  };
}

/**
 * Get recent plans for dashboard
 */
export async function getRecentPlans(therapistId: string, limit: number = 5) {
  return prisma.treatmentPlan.findMany({
    where: {
      client: { therapistId },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      client: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
}

