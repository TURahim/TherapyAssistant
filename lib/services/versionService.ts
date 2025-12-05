/**
 * Version Service
 * 
 * Provides version management, comparison, and restore functionality
 * for treatment plans.
 */

import * as planQueries from '@/lib/db/queries/plans';
import * as auditService from '@/lib/services/auditService';
import { 
  diffCanonicalPlans, 
  diffTherapistViews, 
  generateChangeSummary,
  type DiffResult 
} from './diffService';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/utils/errors';
import type { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface VersionInfo {
  id: string;
  versionNumber: number;
  changeType: string;
  changeSummary: string | null;
  createdAt: Date;
  createdBy: string;
  sessionId?: string | null;
  session?: {
    id: string;
    sessionNumber: number;
    scheduledAt: Date;
  } | null;
}

export interface VersionDetail extends VersionInfo {
  canonicalPlan: Record<string, unknown>;
  therapistView: Record<string, unknown>;
  clientView: Record<string, unknown>;
  diffFromPrevious?: DiffResult;
}

export interface VersionComparison {
  oldVersion: VersionInfo;
  newVersion: VersionInfo;
  canonicalDiff: DiffResult;
  therapistViewDiff: DiffResult;
  summary: string;
}

export interface MergeResult {
  success: boolean;
  mergedPlan: Record<string, unknown>;
  conflicts: MergeConflict[];
  summary: string;
}

export interface MergeConflict {
  path: string;
  section: string;
  description: string;
  baseValue: unknown;
  incomingValue: unknown;
  currentValue: unknown;
  resolution?: 'keep_current' | 'use_incoming' | 'merged';
}

// =============================================================================
// VERSION RETRIEVAL
// =============================================================================

/**
 * Get all versions for a plan
 */
export async function getVersions(
  planId: string,
  therapistId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ versions: VersionInfo[]; total: number; hasMore: boolean }> {
  // Verify access
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const result = await planQueries.getPlanVersions(planId, params);

  return {
    versions: result.items.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      changeType: v.changeType,
      changeSummary: v.changeSummary,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      sessionId: v.sessionId,
      session: v.session,
    })),
    total: result.pagination.total,
    hasMore: result.pagination.hasNext,
  };
}

/**
 * Get a specific version with full details
 */
export async function getVersion(
  planId: string,
  versionNumber: number,
  therapistId: string,
  includeDiff: boolean = false
): Promise<VersionDetail> {
  // Verify access
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const version = await planQueries.getPlanVersion(planId, versionNumber);
  if (!version) {
    throw new NotFoundError('Version not found');
  }

  let diffFromPrevious: DiffResult | undefined;

  if (includeDiff && versionNumber > 1) {
    const previousVersion = await planQueries.getPlanVersion(planId, versionNumber - 1);
    if (previousVersion) {
      diffFromPrevious = diffCanonicalPlans(
        previousVersion.canonicalPlan as Record<string, unknown>,
        version.canonicalPlan as Record<string, unknown>
      );
    }
  }

  return {
    id: version.id,
    versionNumber: version.versionNumber,
    changeType: version.changeType,
    changeSummary: version.changeSummary,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    sessionId: version.sessionId,
    session: version.session,
    canonicalPlan: version.canonicalPlan as Record<string, unknown>,
    therapistView: version.therapistView as Record<string, unknown>,
    clientView: version.clientView as Record<string, unknown>,
    diffFromPrevious,
  };
}

/**
 * Get the current (latest) version
 */
export async function getCurrentVersion(
  planId: string,
  therapistId: string
): Promise<VersionDetail | null> {
  const plan = await planQueries.getPlanById(planId);
  if (!plan) {
    throw new NotFoundError('Plan not found');
  }

  if (plan.client.therapist?.id !== therapistId) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  if (plan.currentVersion === 0) {
    return null;
  }

  return getVersion(planId, plan.currentVersion, therapistId, false);
}

// =============================================================================
// VERSION COMPARISON
// =============================================================================

/**
 * Compare two versions of a plan
 */
export async function compareVersions(
  planId: string,
  oldVersionNum: number,
  newVersionNum: number,
  therapistId: string
): Promise<VersionComparison> {
  // Verify access
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  // Validate version numbers
  if (oldVersionNum >= newVersionNum) {
    throw new ValidationError('Old version must be less than new version');
  }

  const [oldVersion, newVersion] = await Promise.all([
    planQueries.getPlanVersion(planId, oldVersionNum),
    planQueries.getPlanVersion(planId, newVersionNum),
  ]);

  if (!oldVersion) {
    throw new NotFoundError(`Version ${oldVersionNum} not found`);
  }
  if (!newVersion) {
    throw new NotFoundError(`Version ${newVersionNum} not found`);
  }

  const canonicalDiff = diffCanonicalPlans(
    oldVersion.canonicalPlan as Record<string, unknown>,
    newVersion.canonicalPlan as Record<string, unknown>
  );

  const therapistViewDiff = diffTherapistViews(
    oldVersion.therapistView as Record<string, unknown>,
    newVersion.therapistView as Record<string, unknown>
  );

  const summary = generateChangeSummary(canonicalDiff);

  return {
    oldVersion: {
      id: oldVersion.id,
      versionNumber: oldVersion.versionNumber,
      changeType: oldVersion.changeType,
      changeSummary: oldVersion.changeSummary,
      createdAt: oldVersion.createdAt,
      createdBy: oldVersion.createdBy,
      sessionId: oldVersion.sessionId,
      session: oldVersion.session,
    },
    newVersion: {
      id: newVersion.id,
      versionNumber: newVersion.versionNumber,
      changeType: newVersion.changeType,
      changeSummary: newVersion.changeSummary,
      createdAt: newVersion.createdAt,
      createdBy: newVersion.createdBy,
      sessionId: newVersion.sessionId,
      session: newVersion.session,
    },
    canonicalDiff,
    therapistViewDiff,
    summary,
  };
}

// =============================================================================
// VERSION RESTORE
// =============================================================================

/**
 * Restore a plan to a previous version
 */
export async function restoreVersion(
  planId: string,
  versionNumber: number,
  therapistId: string,
  userId: string
): Promise<{ newVersionNumber: number }> {
  // Verify access
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  // Get the version to restore
  const versionToRestore = await planQueries.getPlanVersion(planId, versionNumber);
  if (!versionToRestore) {
    throw new NotFoundError('Version not found');
  }

  // Get current plan
  const plan = await planQueries.getPlanById(planId);
  if (!plan) {
    throw new NotFoundError('Plan not found');
  }

  // Check if plan is locked
  if (plan.isLocked) {
    throw new ValidationError('Cannot restore version while plan is locked');
  }

  const nextVersion = await planQueries.getLatestVersionNumber(planId) + 1;

  // Update the plan with restored data
  await planQueries.updatePlan(planId, {
    canonicalPlan: versionToRestore.canonicalPlan as Prisma.InputJsonValue,
    therapistView: versionToRestore.therapistView as Prisma.InputJsonValue,
    clientView: versionToRestore.clientView as Prisma.InputJsonValue,
    currentVersion: nextVersion,
  });

  // Create a new version snapshot for the restore
  await planQueries.createPlanVersion({
    planId,
    versionNumber: nextVersion,
    canonicalPlan: versionToRestore.canonicalPlan as Prisma.InputJsonValue,
    therapistView: versionToRestore.therapistView as Prisma.InputJsonValue,
    clientView: versionToRestore.clientView as Prisma.InputJsonValue,
    changeType: 'restore',
    changeSummary: `Restored from version ${versionNumber}`,
    createdBy: userId,
  });

  // Log audit
  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: {
      action: 'restore',
      fromVersion: versionNumber,
      toVersion: nextVersion,
    } as Prisma.InputJsonValue,
  });

  return { newVersionNumber: nextVersion };
}

// =============================================================================
// MERGE STRATEGY
// =============================================================================

/**
 * Merge incoming changes with existing plan data
 * Uses a three-way merge strategy when possible
 */
export function mergePlans(
  basePlan: Record<string, unknown>,
  currentPlan: Record<string, unknown>,
  incomingChanges: Record<string, unknown>
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const merged: Record<string, unknown> = { ...currentPlan };

  // Array sections that need special merge handling
  const arraySections = [
    'presentingConcerns',
    'clinicalImpressions',
    'diagnoses',
    'goals',
    'interventions',
    'strengths',
    'riskFactors',
    'homework',
  ];

  for (const section of arraySections) {
    const baseArray = (basePlan[section] || []) as Array<{ id: string; [key: string]: unknown }>;
    const currentArray = (currentPlan[section] || []) as Array<{ id: string; [key: string]: unknown }>;
    const incomingArray = (incomingChanges[section] || []) as Array<{ id: string; [key: string]: unknown }>;

    const mergeResult = mergeArrays(baseArray, currentArray, incomingArray, section);
    merged[section] = mergeResult.mergedArray;
    conflicts.push(...mergeResult.conflicts);
  }

  // Handle non-array sections
  const scalarSections = ['crisisAssessment'];
  for (const section of scalarSections) {
    if (incomingChanges[section] !== undefined) {
      const baseValue = basePlan[section];
      const currentValue = currentPlan[section];
      const incomingValue = incomingChanges[section];

      // If current matches base, take incoming
      if (JSON.stringify(baseValue) === JSON.stringify(currentValue)) {
        merged[section] = incomingValue;
      }
      // If current was modified and incoming was also modified, conflict
      else if (JSON.stringify(baseValue) !== JSON.stringify(incomingValue)) {
        conflicts.push({
          path: section,
          section,
          description: `Both versions modified ${section}`,
          baseValue,
          incomingValue,
          currentValue,
        });
        // Default to keeping current
        merged[section] = currentValue;
      }
    }
  }

  // Update metadata
  merged.updatedAt = new Date().toISOString();
  merged.version = ((currentPlan.version as number) || 0) + 1;

  // Add new session references if present
  if (incomingChanges.sessionReferences) {
    const currentRefs = (merged.sessionReferences || []) as Array<{ sessionId: string }>;
    const incomingRefs = incomingChanges.sessionReferences as Array<{ sessionId: string }>;
    const existingIds = new Set(currentRefs.map(r => r.sessionId));
    
    for (const ref of incomingRefs) {
      if (!existingIds.has(ref.sessionId)) {
        currentRefs.push(ref);
      }
    }
    merged.sessionReferences = currentRefs;
  }

  const summary = conflicts.length > 0
    ? `Merge completed with ${conflicts.length} conflict(s)`
    : 'Merge completed successfully';

  return {
    success: conflicts.length === 0,
    mergedPlan: merged,
    conflicts,
    summary,
  };
}

/**
 * Merge two arrays with ID-based items
 */
function mergeArrays(
  baseArray: Array<{ id: string; [key: string]: unknown }>,
  currentArray: Array<{ id: string; [key: string]: unknown }>,
  incomingArray: Array<{ id: string; [key: string]: unknown }>,
  section: string
): { mergedArray: Array<{ id: string; [key: string]: unknown }>; conflicts: MergeConflict[] } {
  const conflicts: MergeConflict[] = [];
  const mergedArray: Array<{ id: string; [key: string]: unknown }> = [];
  
  // Create maps for efficient lookup
  const baseMap = new Map(baseArray.map(item => [item.id, item]));
  const currentMap = new Map(currentArray.map(item => [item.id, item]));
  const incomingMap = new Map(incomingArray.map(item => [item.id, item]));
  
  // Get all unique IDs
  const allIds = Array.from(new Set([
    ...baseArray.map(i => i.id),
    ...currentArray.map(i => i.id),
    ...incomingArray.map(i => i.id),
  ]));
  
  for (const id of allIds) {
    const baseItem = baseMap.get(id);
    const currentItem = currentMap.get(id);
    const incomingItem = incomingMap.get(id);
    
    // New item in incoming (not in base or current)
    if (!baseItem && !currentItem && incomingItem) {
      mergedArray.push(incomingItem);
      continue;
    }
    
    // New item in current (not in base)
    if (!baseItem && currentItem && !incomingItem) {
      mergedArray.push(currentItem);
      continue;
    }
    
    // Item deleted in current (was in base, not in current)
    if (baseItem && !currentItem && !incomingItem) {
      // Deleted in both - keep deleted
      continue;
    }
    
    // Item exists in all three - check for conflicts
    if (baseItem && currentItem && incomingItem) {
      const baseJson = JSON.stringify(baseItem);
      const currentJson = JSON.stringify(currentItem);
      const incomingJson = JSON.stringify(incomingItem);
      
      // No changes
      if (currentJson === incomingJson) {
        mergedArray.push(currentItem);
      }
      // Only incoming changed
      else if (baseJson === currentJson) {
        mergedArray.push(incomingItem);
      }
      // Only current changed
      else if (baseJson === incomingJson) {
        mergedArray.push(currentItem);
      }
      // Both changed - conflict
      else {
        conflicts.push({
          path: `${section}[${id}]`,
          section,
          description: `Item "${id}" modified in both versions`,
          baseValue: baseItem,
          incomingValue: incomingItem,
          currentValue: currentItem,
        });
        // Default to keeping current
        mergedArray.push(currentItem);
      }
      continue;
    }
    
    // Item only in current
    if (currentItem) {
      mergedArray.push(currentItem);
    }
    // Item only in incoming
    else if (incomingItem) {
      mergedArray.push(incomingItem);
    }
  }
  
  return { mergedArray, conflicts };
}

/**
 * Create a new version from merged data
 */
export async function createMergedVersion(
  planId: string,
  sessionId: string,
  mergeResult: MergeResult,
  therapistId: string,
  userId: string
): Promise<{ versionNumber: number }> {
  // Verify access
  const isOwner = await planQueries.isPlanOfTherapist(planId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this plan');
  }

  const plan = await planQueries.getPlanById(planId);
  if (!plan) {
    throw new NotFoundError('Plan not found');
  }

  if (plan.isLocked) {
    throw new ValidationError('Cannot update plan while locked');
  }

  const nextVersion = await planQueries.getLatestVersionNumber(planId) + 1;

  // Update plan
  await planQueries.updatePlan(planId, {
    canonicalPlan: mergeResult.mergedPlan as Prisma.InputJsonValue,
    currentVersion: nextVersion,
    lastGeneratedAt: new Date(),
  });

  // Create version
  const changeSummary = mergeResult.conflicts.length > 0
    ? `Session update with ${mergeResult.conflicts.length} resolved conflict(s)`
    : 'Session update merged successfully';

  await planQueries.createPlanVersion({
    planId,
    versionNumber: nextVersion,
    sessionId,
    canonicalPlan: mergeResult.mergedPlan as Prisma.InputJsonValue,
    therapistView: plan.therapistView as Prisma.InputJsonValue,
    clientView: plan.clientView as Prisma.InputJsonValue,
    changeType: 'session_update',
    changeSummary,
    createdBy: userId,
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: {
      action: 'session_update',
      sessionId,
      versionNumber: nextVersion,
      hasConflicts: mergeResult.conflicts.length > 0,
    } as Prisma.InputJsonValue,
  });

  return { versionNumber: nextVersion };
}

