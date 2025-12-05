import { prisma } from '@/lib/db/prisma';
import type { AuditAction, Prisma } from '@prisma/client';

interface AuditLogData {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAudit(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ?? {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Don't throw on audit failures - log to console instead
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log client creation
 */
export async function logClientCreated(
  userId: string,
  clientId: string,
  metadata?: Prisma.InputJsonValue
) {
  return logAudit({
    userId,
    action: 'CREATE',
    entityType: 'Client',
    entityId: clientId,
    metadata,
  });
}

/**
 * Log client read/view
 */
export async function logClientViewed(
  userId: string,
  clientId: string
) {
  return logAudit({
    userId,
    action: 'READ',
    entityType: 'Client',
    entityId: clientId,
  });
}

/**
 * Log client update
 */
export async function logClientUpdated(
  userId: string,
  clientId: string,
  changes?: Prisma.InputJsonValue
) {
  return logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'Client',
    entityId: clientId,
    metadata: changes ? { changes } : undefined,
  });
}

/**
 * Log client deletion/deactivation
 */
export async function logClientDeleted(
  userId: string,
  clientId: string,
  hardDelete: boolean = false
) {
  return logAudit({
    userId,
    action: 'DELETE',
    entityType: 'Client',
    entityId: clientId,
    metadata: { hardDelete },
  });
}

/**
 * Log session events
 */
export async function logSessionCreated(
  userId: string,
  sessionId: string,
  clientId: string
) {
  return logAudit({
    userId,
    action: 'CREATE',
    entityType: 'Session',
    entityId: sessionId,
    metadata: { clientId },
  });
}

export async function logSessionUpdated(
  userId: string,
  sessionId: string,
  changes?: Prisma.InputJsonValue
) {
  return logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'Session',
    entityId: sessionId,
    metadata: changes ? { changes } : undefined,
  });
}

/**
 * Log plan generation
 */
export async function logPlanGenerated(
  userId: string,
  planId: string,
  sessionId: string,
  version: number
) {
  return logAudit({
    userId,
    action: 'GENERATE_PLAN',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: { sessionId, version },
  });
}

/**
 * Log plan update
 */
export async function logPlanUpdated(
  userId: string,
  planId: string,
  changes?: Prisma.InputJsonValue
) {
  return logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'TreatmentPlan',
    entityId: planId,
    metadata: changes ? { changes } : undefined,
  });
}

/**
 * Log data export
 */
export async function logDataExport(
  userId: string,
  entityType: string,
  entityId: string,
  exportFormat: string
) {
  return logAudit({
    userId,
    action: 'EXPORT',
    entityType,
    entityId,
    metadata: { format: exportFormat },
  });
}

/**
 * Log user login
 */
export async function logUserLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return logAudit({
    userId,
    action: 'LOGIN',
    entityType: 'User',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log user logout
 */
export async function logUserLogout(userId: string) {
  return logAudit({
    userId,
    action: 'LOGOUT',
    entityType: 'User',
    entityId: userId,
  });
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Get audit logs for a user's actions
 */
export async function getUserAuditLogs(userId: string, limit: number = 50) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

