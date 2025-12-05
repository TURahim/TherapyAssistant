import * as planQueries from '@/lib/db/queries/plans';
import * as clientQueries from '@/lib/db/queries/clients';
import * as sessionQueries from '@/lib/db/queries/sessions';
import * as auditService from '@/lib/services/auditService';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';
import { runPipeline, createPipelineContext } from '@/lib/ai/pipeline';
import type { PlanStatus, Prisma } from '@prisma/client';
import type { PipelineProgress, CanonicalPlan, TherapistView, ClientView } from '@/lib/ai/types';

// =============================================================================
// TYPES
// =============================================================================

export interface PlanGenerationOptions {
  sessionId: string;
  clientId: string;
  therapistId: string;
  userId: string;
  transcript: string;
  onProgress?: (progress: PipelineProgress) => void;
}

export interface PlanGenerationResult {
  success: boolean;
  planId?: string;
  versionNumber?: number;
  crisisDetected: boolean;
  crisisSeverity?: string;
  warnings: string[];
  errors: string[];
  processingTime: number;
}

// =============================================================================
// PLAN RETRIEVAL
// =============================================================================

/**
 * Get all plans for a therapist's clients
 */
export async function getTherapistPlans(
  therapistId: string,
  userId: string,
  params: { page?: number; limit?: number; status?: PlanStatus; clientId?: string } = {}
) {
  await auditService.logAudit({
    userId,
    action: 'READ',
    entityType: 'PlanList',
    entityId: therapistId,
  });

  const where: Prisma.TreatmentPlanWhereInput = {
    client: {
      therapistId,
      ...(params.clientId && { id: params.clientId }),
    },
    ...(params.status && { status: params.status }),
  };

  const [plans, total] = await Promise.all([
    prisma.treatmentPlan.findMany({
      where,
      skip: ((params.page || 1) - 1) * (params.limit || 20),
      take: params.limit || 20,
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
    items: plans.map(plan => ({
      id: plan.id,
      clientId: plan.clientId,
      clientName: plan.client.preferredName || 
        `${plan.client.user.firstName} ${plan.client.user.lastName}`,
      status: plan.status,
      currentVersion: plan.currentVersion,
      lastGeneratedAt: plan.lastGeneratedAt,
      publishedAt: plan.publishedAt,
      versionCount: plan._count.versions,
      homeworkCount: plan._count.homework,
      updatedAt: plan.updatedAt,
    })),
    pagination: {
      page: params.page || 1,
      limit: params.limit || 20,
      total,
      totalPages: Math.ceil(total / (params.limit || 20)),
      hasNext: (params.page || 1) * (params.limit || 20) < total,
      hasPrev: (params.page || 1) > 1,
    },
  };
}

/**
 * Get a single plan with access control
 */
export async function getPlan(
  planId: string,
  therapistId: string,
  userId: string
) {
  const plan = await planQueries.getPlanById(planId);

  if (!plan) {
    throw new NotFoundError('Treatment plan not found');
  }

  if (plan.client.therapist?.id !== therapistId) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  await auditService.logAudit({
    userId,
    action: 'READ',
    entityType: 'TreatmentPlan',
    entityId: planId,
  });

  return {
    id: plan.id,
    clientId: plan.clientId,
    clientName: plan.client.preferredName || 
      `${plan.client.user.firstName} ${plan.client.user.lastName}`,
    status: plan.status,
    currentVersion: plan.currentVersion,
    isLocked: plan.isLocked,
    canonicalPlan: plan.canonicalPlan,
    therapistView: plan.therapistView,
    clientView: plan.clientView,
    lastGeneratedAt: plan.lastGeneratedAt,
    publishedAt: plan.publishedAt,
    versions: plan.versions,
    homework: plan.homework,
    counts: plan._count,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

/**
 * Get plan for client view
 */
export async function getClientPlan(
  clientId: string,
  userId: string
) {
  const plan = await planQueries.getActivePlanForClient(clientId);

  if (!plan) {
    throw new NotFoundError('No active treatment plan found');
  }

  if (!plan.publishedAt) {
    throw new ForbiddenError('Treatment plan has not been shared yet');
  }

  await auditService.logAudit({
    userId,
    action: 'READ',
    entityType: 'ClientPlanView',
    entityId: plan.id,
  });

  return {
    id: plan.id,
    clientView: plan.clientView,
    lastUpdated: plan.updatedAt,
    publishedAt: plan.publishedAt,
  };
}

// =============================================================================
// PLAN GENERATION
// =============================================================================

/**
 * Generate or update treatment plan from session transcript
 */
export async function generatePlan(
  options: PlanGenerationOptions
): Promise<PlanGenerationResult> {
  const { sessionId, clientId, therapistId, userId, transcript, onProgress } = options;

  // Verify session belongs to client and therapist
  const session = await sessionQueries.getSessionById(sessionId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (session.therapistId !== therapistId || session.clientId !== clientId) {
    throw new ForbiddenError('You do not have access to this session');
  }

  // Get or create plan
  let plan = await planQueries.getOrCreatePlan(clientId);

  // Check if plan is locked
  if (plan.isLocked) {
    throw new ConflictError('Plan is currently being generated. Please wait.');
  }

  // Lock the plan during generation
  await planQueries.lockPlan(plan.id);

  try {
    // Get existing canonical plan if any
    const existingCanonical = plan.canonicalPlan && 
      Object.keys(plan.canonicalPlan as object).length > 0
        ? plan.canonicalPlan as unknown as CanonicalPlan
        : null;

    // Get client name for views
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const clientName = client?.preferredName || 
      `${client?.user.firstName} ${client?.user.lastName}`;
    const clientFirstName = client?.preferredName?.split(' ')[0] || 
      client?.user.firstName || 'there';

    // Get therapist preferences
    const therapist = await prisma.therapist.findUnique({
      where: { id: therapistId },
      include: { preferences: true },
    });

    // Run the AI pipeline
    const pipelineContext = createPipelineContext({
      sessionId,
      clientId,
      therapistId,
      userId,
      transcript,
      existingPlan: existingCanonical,
    });

    // Add client name info to context
    (pipelineContext as { clientName?: string; clientFirstName?: string }).clientName = clientName;
    (pipelineContext as { clientName?: string; clientFirstName?: string }).clientFirstName = clientFirstName;

    // Add preferences if available
    if (therapist?.preferences) {
      pipelineContext.preferences = {
        preferredModalities: therapist.preferences.preferredModalities,
        languageLevel: therapist.preferences.preferLanguageLevel as 'professional' | 'conversational' | 'simple',
        includeIcdCodes: therapist.preferences.includeIcdCodes,
        customInstructions: therapist.preferences.customInstructions || undefined,
      };
    }

    const result = await runPipeline(
      { ...pipelineContext, existingPlan: existingCanonical },
      onProgress
    );

    // If crisis was detected and pipeline halted, update session and return
    if (result.crisisDetected && !result.success) {
      await sessionQueries.updateSession(sessionId, {
        crisisSeverity: result.crisisSeverity,
      });

      await planQueries.unlockPlan(plan.id);

      await auditService.logAudit({
        userId,
        action: 'GENERATE_PLAN',
        entityType: 'TreatmentPlan',
        entityId: plan.id,
        metadata: {
          crisisDetected: true,
          crisisSeverity: result.crisisSeverity,
          pipelineHalted: true,
        } as Prisma.InputJsonValue,
      });

      return {
        success: false,
        planId: plan.id,
        crisisDetected: true,
        crisisSeverity: result.crisisSeverity,
        warnings: result.warnings,
        errors: ['Pipeline halted due to crisis detection'],
        processingTime: result.processingTime,
      };
    }

    // Pipeline succeeded - save the plan
    if (result.success && result.planId) {
      const nextVersion = await planQueries.getLatestVersionNumber(plan.id) + 1;

      // Update plan with new data
      // Note: The pipeline saves results, but we may need to fetch them
      // For now, we'll update based on the result
      plan = await planQueries.updatePlan(plan.id, {
        status: 'ACTIVE',
        currentVersion: nextVersion,
        lastGeneratedAt: new Date(),
      });

      // Update session with crisis severity if any
      if (result.crisisSeverity) {
        await sessionQueries.updateSession(sessionId, {
          crisisSeverity: result.crisisSeverity,
        });
      }

      await auditService.logPlanGenerated(userId, plan.id, sessionId, nextVersion);
    }

    // Unlock plan
    await planQueries.unlockPlan(plan.id);

    return {
      success: result.success,
      planId: plan.id,
      versionNumber: result.versionNumber,
      crisisDetected: result.crisisDetected,
      crisisSeverity: result.crisisSeverity,
      warnings: result.warnings,
      errors: result.errors,
      processingTime: result.processingTime,
    };
  } catch (error) {
    // Always unlock on error
    await planQueries.unlockPlan(plan.id);
    throw error;
  }
}

/**
 * Save generated plan data
 */
export async function savePlanData(
  planId: string,
  sessionId: string,
  userId: string,
  data: {
    canonicalPlan: CanonicalPlan;
    therapistView: TherapistView;
    clientView: ClientView;
    changeType: string;
    changeSummary?: string;
  }
) {
  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new NotFoundError('Plan not found');
  }

  const nextVersion = await planQueries.getLatestVersionNumber(planId) + 1;

  // Update the plan
  await planQueries.updatePlan(planId, {
    canonicalPlan: data.canonicalPlan as unknown as Prisma.InputJsonValue,
    therapistView: data.therapistView as unknown as Prisma.InputJsonValue,
    clientView: data.clientView as unknown as Prisma.InputJsonValue,
    currentVersion: nextVersion,
    status: 'ACTIVE',
    lastGeneratedAt: new Date(),
  });

  // Create version snapshot
  await planQueries.createPlanVersion({
    planId,
    versionNumber: nextVersion,
    sessionId,
    canonicalPlan: data.canonicalPlan as unknown as Prisma.InputJsonValue,
    therapistView: data.therapistView as unknown as Prisma.InputJsonValue,
    clientView: data.clientView as unknown as Prisma.InputJsonValue,
    changeType: data.changeType,
    changeSummary: data.changeSummary,
    createdBy: userId,
  });

  return {
    planId,
    versionNumber: nextVersion,
  };
}

// =============================================================================
// PLAN MANAGEMENT
// =============================================================================

/**
 * Update plan status
 */
export async function updatePlanStatus(
  planId: string,
  therapistId: string,
  userId: string,
  status: PlanStatus
) {
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const plan = await planQueries.updatePlan(planId, { status });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: { statusChange: status } as Prisma.InputJsonValue,
  });

  return plan;
}

/**
 * Publish plan to client
 */
export async function publishPlan(
  planId: string,
  therapistId: string,
  userId: string
) {
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const plan = await planQueries.getPlanById(planId);
  if (!plan) {
    throw new NotFoundError('Plan not found');
  }

  if (plan.status !== 'ACTIVE') {
    throw new ValidationError('Only active plans can be published');
  }

  const updated = await planQueries.updatePlan(planId, {
    publishedAt: new Date(),
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: { action: 'published' } as Prisma.InputJsonValue,
  });

  return updated;
}

/**
 * Archive a plan
 */
export async function archivePlan(
  planId: string,
  therapistId: string,
  userId: string
) {
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const plan = await planQueries.updatePlan(planId, {
    status: 'ARCHIVED',
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: { action: 'archived' } as Prisma.InputJsonValue,
  });

  return plan;
}

/**
 * Delete a plan
 */
export async function deletePlan(
  planId: string,
  therapistId: string,
  userId: string
) {
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  await planQueries.deletePlan(planId);

  await auditService.logAudit({
    userId,
    action: 'DELETE',
    entityType: 'TreatmentPlan',
    entityId: planId,
  });

  return { deleted: true };
}

// =============================================================================
// VERSION MANAGEMENT
// =============================================================================

/**
 * Get plan versions
 */
export async function getPlanVersions(
  planId: string,
  therapistId: string,
  userId: string,
  params: { page?: number; limit?: number } = {}
) {
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  return planQueries.getPlanVersions(planId, params);
}

/**
 * Get a specific version
 */
export async function getPlanVersion(
  planId: string,
  versionNumber: number,
  therapistId: string,
  userId: string
) {
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const version = await planQueries.getPlanVersion(planId, versionNumber);

  if (!version) {
    throw new NotFoundError('Version not found');
  }

  return version;
}

/**
 * Restore a previous version
 */
export async function restorePlanVersion(
  planId: string,
  versionNumber: number,
  therapistId: string,
  userId: string
) {
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const version = await planQueries.getPlanVersion(planId, versionNumber);
  if (!version) {
    throw new NotFoundError('Version not found');
  }

  const nextVersion = await planQueries.getLatestVersionNumber(planId) + 1;

  // Update plan with restored data
  await planQueries.updatePlan(planId, {
    canonicalPlan: version.canonicalPlan as Prisma.InputJsonValue,
    therapistView: version.therapistView as Prisma.InputJsonValue,
    clientView: version.clientView as Prisma.InputJsonValue,
    currentVersion: nextVersion,
  });

  // Create restore version
  await planQueries.createPlanVersion({
    planId,
    versionNumber: nextVersion,
    canonicalPlan: version.canonicalPlan as Prisma.InputJsonValue,
    therapistView: version.therapistView as Prisma.InputJsonValue,
    clientView: version.clientView as Prisma.InputJsonValue,
    changeType: 'restore',
    changeSummary: `Restored from version ${versionNumber}`,
    createdBy: userId,
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: {
      action: 'restored',
      fromVersion: versionNumber,
      toVersion: nextVersion,
    } as Prisma.InputJsonValue,
  });

  return { versionNumber: nextVersion };
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Get plan stats for dashboard
 */
export async function getPlanStats(therapistId: string) {
  return planQueries.getPlanStats(therapistId);
}

/**
 * Get recent plans for dashboard
 */
export async function getRecentPlans(therapistId: string, limit: number = 5) {
  const plans = await planQueries.getRecentPlans(therapistId, limit);

  return plans.map(plan => ({
    id: plan.id,
    clientId: plan.clientId,
    clientName: plan.client.preferredName || 
      `${plan.client.user.firstName} ${plan.client.user.lastName}`,
    status: plan.status,
    currentVersion: plan.currentVersion,
    updatedAt: plan.updatedAt,
  }));
}

