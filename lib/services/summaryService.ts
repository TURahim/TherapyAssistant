/**
 * Summary Service
 * 
 * Business logic for session summary generation, storage, and management.
 */

import { prisma } from '@/lib/db/prisma';
import * as auditService from './auditService';
import {
  generateSessionSummaries,
  generateTherapistSummaryOnly,
  generateClientSummaryOnly,
  type SummaryGenerationResult,
  type SummaryGenerationInput,
  type TherapistSummary,
  type ClientSummary,
} from '@/lib/ai/stages/summaryGeneration';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/utils/errors';
import type { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface SessionSummaryData {
  id: string;
  sessionId: string;
  therapistSummary: string;
  clientSummary: string;
  keyTopics: string[];
  progressNotes: string | null;
  moodAssessment: string | null;
  isEdited: boolean;
  editedAt: Date | null;
  generatedAt: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a session belongs to a therapist
 */
async function isSessionOfTherapist(
  sessionId: string,
  therapistId: string
): Promise<boolean> {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      client: {
        therapistId,
      },
    },
    select: { id: true },
  });
  return session !== null;
}

/**
 * Get session with required data for summary generation
 */
async function getSessionForSummary(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      client: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          therapist: {
            select: {
              id: true,
            },
          },
        },
      },
      summary: true,
    },
  });
}

/**
 * Extract key topics from summaries
 */
function extractKeyTopics(therapistSummary: TherapistSummary): string[] {
  return therapistSummary.topicsDiscussed.map(t => t.topic);
}

// =============================================================================
// SUMMARY GENERATION
// =============================================================================

/**
 * Generate summaries for a session
 */
export async function generateSummary(
  sessionId: string,
  therapistId: string,
  userId: string
): Promise<SummaryGenerationResult> {
  // Verify access
  const hasAccess = await isSessionOfTherapist(sessionId, therapistId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this session');
  }

  // Get session data
  const session = await getSessionForSummary(sessionId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (!session.transcript) {
    throw new ValidationError('Session has no transcript to summarize');
  }

  // Get client name
  const clientName = session.client.user
    ? `${session.client.user.firstName} ${session.client.user.lastName}`
    : undefined;

  // Get previous session summary for context
  const previousSession = await prisma.session.findFirst({
    where: {
      clientId: session.clientId,
      sessionNumber: session.sessionNumber - 1,
    },
    include: {
      summary: {
        select: {
          therapistSummary: true,
        },
      },
    },
  });

  // Prepare input
  const input: SummaryGenerationInput = {
    sessionId,
    sessionNumber: session.sessionNumber,
    sessionDate: session.scheduledAt,
    transcript: session.transcript,
    clientName,
    previousSummary: previousSession?.summary?.therapistSummary || undefined,
  };

  // Generate summaries
  const result = await generateSessionSummaries(input);

  // Extract key topics
  const keyTopics = extractKeyTopics(result.therapistSummary);

  // Save or update SessionSummary
  await prisma.sessionSummary.upsert({
    where: { sessionId },
    create: {
      sessionId,
      therapistSummary: result.therapistText,
      clientSummary: result.clientText,
      keyTopics,
      progressNotes: result.therapistSummary.progressNotes,
      generatedAt: new Date(),
    },
    update: {
      therapistSummary: result.therapistText,
      clientSummary: result.clientText,
      keyTopics,
      progressNotes: result.therapistSummary.progressNotes,
      generatedAt: new Date(),
      isEdited: false,
      editedAt: null,
    },
  });

  // Log audit
  await auditService.logAudit({
    userId,
    action: 'CREATE',
    entityType: 'SessionSummary',
    entityId: sessionId,
    metadata: {
      sessionNumber: session.sessionNumber,
      wordCounts: result.metadata.wordCounts,
    } as Prisma.InputJsonValue,
  });

  return result;
}

/**
 * Regenerate only the therapist summary
 */
export async function regenerateTherapistSummary(
  sessionId: string,
  therapistId: string,
  userId: string
): Promise<{ summary: TherapistSummary; text: string }> {
  const hasAccess = await isSessionOfTherapist(sessionId, therapistId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const session = await getSessionForSummary(sessionId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (!session.transcript) {
    throw new ValidationError('Session has no transcript');
  }

  const clientName = session.client.user
    ? `${session.client.user.firstName} ${session.client.user.lastName}`
    : undefined;

  const result = await generateTherapistSummaryOnly({
    sessionId,
    sessionNumber: session.sessionNumber,
    sessionDate: session.scheduledAt,
    transcript: session.transcript,
    clientName,
  });

  const keyTopics = extractKeyTopics(result.summary);

  // Update or create summary
  await prisma.sessionSummary.upsert({
    where: { sessionId },
    create: {
      sessionId,
      therapistSummary: result.text,
      clientSummary: '', // Will be filled when client summary is generated
      keyTopics,
      progressNotes: result.summary.progressNotes,
      generatedAt: new Date(),
    },
    update: {
      therapistSummary: result.text,
      keyTopics,
      progressNotes: result.summary.progressNotes,
      generatedAt: new Date(),
    },
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'SessionSummary',
    entityId: sessionId,
    metadata: { type: 'therapist_regenerate' } as Prisma.InputJsonValue,
  });

  return result;
}

/**
 * Regenerate only the client summary
 */
export async function regenerateClientSummary(
  sessionId: string,
  therapistId: string,
  userId: string
): Promise<{ summary: ClientSummary; text: string }> {
  const hasAccess = await isSessionOfTherapist(sessionId, therapistId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const session = await getSessionForSummary(sessionId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (!session.transcript) {
    throw new ValidationError('Session has no transcript');
  }

  const clientName = session.client.user
    ? `${session.client.user.firstName} ${session.client.user.lastName}`
    : undefined;

  const result = await generateClientSummaryOnly({
    sessionId,
    sessionNumber: session.sessionNumber,
    sessionDate: session.scheduledAt,
    transcript: session.transcript,
    clientName,
  });

  // Update or create summary
  await prisma.sessionSummary.upsert({
    where: { sessionId },
    create: {
      sessionId,
      therapistSummary: '', // Will be filled when therapist summary is generated
      clientSummary: result.text,
      keyTopics: [],
      generatedAt: new Date(),
    },
    update: {
      clientSummary: result.text,
      generatedAt: new Date(),
    },
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'SessionSummary',
    entityId: sessionId,
    metadata: { type: 'client_regenerate' } as Prisma.InputJsonValue,
  });

  return result;
}

// =============================================================================
// SUMMARY RETRIEVAL
// =============================================================================

/**
 * Get summary for a session
 */
export async function getSummary(
  sessionId: string,
  therapistId: string
): Promise<SessionSummaryData | null> {
  const hasAccess = await isSessionOfTherapist(sessionId, therapistId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const summary = await prisma.sessionSummary.findUnique({
    where: { sessionId },
  });

  return summary;
}

/**
 * Get client summary for client portal
 */
export async function getClientSummaryForClient(
  sessionId: string,
  clientId: string
): Promise<{ summary: string; sessionNumber: number } | null> {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      clientId,
    },
    include: {
      summary: {
        select: {
          clientSummary: true,
        },
      },
    },
  });

  if (!session?.summary?.clientSummary) {
    return null;
  }

  return {
    summary: session.summary.clientSummary,
    sessionNumber: session.sessionNumber,
  };
}

// =============================================================================
// SUMMARY EDITING
// =============================================================================

/**
 * Update therapist summary
 */
export async function updateTherapistSummary(
  sessionId: string,
  therapistId: string,
  userId: string,
  summaryText: string,
  keyTopics?: string[]
): Promise<void> {
  const hasAccess = await isSessionOfTherapist(sessionId, therapistId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const existingSummary = await prisma.sessionSummary.findUnique({
    where: { sessionId },
  });

  if (!existingSummary) {
    throw new NotFoundError('No summary exists for this session');
  }

  await prisma.sessionSummary.update({
    where: { sessionId },
    data: {
      therapistSummary: summaryText,
      ...(keyTopics && { keyTopics }),
      isEdited: true,
      editedAt: new Date(),
    },
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'SessionSummary',
    entityId: sessionId,
    metadata: { type: 'therapist_edit' } as Prisma.InputJsonValue,
  });
}

/**
 * Update client summary
 */
export async function updateClientSummary(
  sessionId: string,
  therapistId: string,
  userId: string,
  summaryText: string
): Promise<void> {
  const hasAccess = await isSessionOfTherapist(sessionId, therapistId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const existingSummary = await prisma.sessionSummary.findUnique({
    where: { sessionId },
  });

  if (!existingSummary) {
    throw new NotFoundError('No summary exists for this session');
  }

  await prisma.sessionSummary.update({
    where: { sessionId },
    data: {
      clientSummary: summaryText,
      isEdited: true,
      editedAt: new Date(),
    },
  });

  await auditService.logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'SessionSummary',
    entityId: sessionId,
    metadata: { type: 'client_edit' } as Prisma.InputJsonValue,
  });
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Get all sessions needing summaries for a client
 */
export async function getSessionsNeedingSummaries(
  clientId: string,
  therapistId: string
): Promise<Array<{ id: string; sessionNumber: number; scheduledAt: Date }>> {
  // Verify therapist has access to client
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      therapistId,
    },
    select: { id: true },
  });

  if (!client) {
    throw new ForbiddenError('You do not have access to this client');
  }

  const sessions = await prisma.session.findMany({
    where: {
      clientId,
      transcript: { not: null },
      summary: null,
      status: 'COMPLETED',
    },
    select: {
      id: true,
      sessionNumber: true,
      scheduledAt: true,
    },
    orderBy: { sessionNumber: 'asc' },
  });

  return sessions;
}

/**
 * Get summary stats for a therapist
 */
export async function getSummaryStats(therapistId: string): Promise<{
  totalSummaries: number;
  editedCount: number;
  pendingCount: number;
}> {
  const [totalSummaries, editedCount, pendingCount] = await Promise.all([
    prisma.sessionSummary.count({
      where: {
        session: {
          client: { therapistId },
        },
      },
    }),
    prisma.sessionSummary.count({
      where: {
        session: {
          client: { therapistId },
        },
        isEdited: true,
      },
    }),
    prisma.session.count({
      where: {
        client: { therapistId },
        transcript: { not: null },
        summary: null,
        status: 'COMPLETED',
      },
    }),
  ]);

  return {
    totalSummaries,
    editedCount,
    pendingCount,
  };
}
