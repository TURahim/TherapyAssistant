import * as sessionQueries from '@/lib/db/queries/sessions';
import * as clientQueries from '@/lib/db/queries/clients';
import * as auditService from '@/lib/services/auditService';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { CreateSessionInput, UpdateSessionInput, SessionFilterParams } from '@/types';

/**
 * Get all sessions for a therapist
 */
export async function getTherapistSessions(
  therapistId: string,
  userId: string,
  params: SessionFilterParams = {}
) {
  await auditService.logAudit({
    userId,
    action: 'READ',
    entityType: 'SessionList',
    entityId: therapistId,
  });

  return sessionQueries.getSessionsByTherapist(therapistId, params);
}

/**
 * Get sessions for a specific client
 */
export async function getClientSessions(
  clientId: string,
  therapistId: string,
  userId: string,
  params: { page?: number; limit?: number } = {}
) {
  // Verify client belongs to therapist
  const isOwner = await clientQueries.isClientOfTherapist(clientId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this client');
  }

  return sessionQueries.getSessionsByClient(clientId, therapistId, params);
}

/**
 * Get a single session with access control
 */
export async function getSession(
  sessionId: string,
  therapistId: string,
  userId: string
) {
  const session = await sessionQueries.getSessionById(sessionId);

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (session.therapistId !== therapistId) {
    throw new ForbiddenError('You do not have access to this session');
  }

  await auditService.logAudit({
    userId,
    action: 'READ',
    entityType: 'Session',
    entityId: sessionId,
  });

  return session;
}

/**
 * Create a new session
 */
export async function createSession(
  input: CreateSessionInput,
  therapistId: string,
  userId: string
) {
  // Verify client belongs to therapist
  const isOwner = await clientQueries.isClientOfTherapist(input.clientId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this client');
  }

  // Validate scheduled date is not in the past (allow same day)
  const scheduledDate = new Date(input.scheduledAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (scheduledDate < today) {
    throw new ValidationError('Session cannot be scheduled in the past');
  }

  const session = await sessionQueries.createSession({
    clientId: input.clientId,
    therapistId,
    scheduledAt: scheduledDate,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
  });

  await auditService.logSessionCreated(userId, session.id, input.clientId);

  return session;
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  therapistId: string,
  userId: string,
  input: UpdateSessionInput
) {
  // Verify access
  const isOwner = await sessionQueries.isSessionOfTherapist(sessionId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const updateData: Prisma.SessionUpdateInput = {};

  if (input.scheduledAt) updateData.scheduledAt = new Date(input.scheduledAt);
  if (input.startedAt) updateData.startedAt = new Date(input.startedAt);
  if (input.endedAt) updateData.endedAt = new Date(input.endedAt);
  if (input.status) updateData.status = input.status;
  if (input.durationMinutes !== undefined) updateData.durationMinutes = input.durationMinutes;
  if (input.transcript !== undefined) updateData.transcript = input.transcript;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const updated = await sessionQueries.updateSession(sessionId, updateData as Parameters<typeof sessionQueries.updateSession>[1]);

  await auditService.logSessionUpdated(userId, sessionId, input as Prisma.InputJsonValue);

  return updated;
}

/**
 * Add transcript to a session
 */
export async function addTranscript(
  sessionId: string,
  therapistId: string,
  userId: string,
  transcript: string,
  source: 'paste' | 'upload' | 'transcription' = 'paste'
) {
  // Verify access
  const isOwner = await sessionQueries.isSessionOfTherapist(sessionId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this session');
  }

  if (!transcript || transcript.trim().length === 0) {
    throw new ValidationError('Transcript cannot be empty');
  }

  // Basic transcript validation - minimum length
  if (transcript.trim().length < 100) {
    throw new ValidationError('Transcript is too short. Please provide a more complete transcript.');
  }

  const updated = await sessionQueries.addTranscript(sessionId, transcript.trim(), transcript);

  await auditService.logSessionUpdated(userId, sessionId, { 
    transcriptAdded: true, 
    source,
    length: transcript.length 
  } as Prisma.InputJsonValue);

  return updated;
}

/**
 * Start a session
 */
export async function startSession(
  sessionId: string,
  therapistId: string,
  userId: string
) {
  const isOwner = await sessionQueries.isSessionOfTherapist(sessionId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const session = await sessionQueries.startSession(sessionId);

  await auditService.logSessionUpdated(userId, sessionId, { 
    action: 'started' 
  } as Prisma.InputJsonValue);

  return session;
}

/**
 * Complete a session
 */
export async function completeSession(
  sessionId: string,
  therapistId: string,
  userId: string,
  durationMinutes?: number
) {
  const isOwner = await sessionQueries.isSessionOfTherapist(sessionId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const session = await sessionQueries.completeSession(sessionId, durationMinutes);

  await auditService.logSessionUpdated(userId, sessionId, { 
    action: 'completed',
    durationMinutes: session.durationMinutes 
  } as Prisma.InputJsonValue);

  return session;
}

/**
 * Cancel a session
 */
export async function cancelSession(
  sessionId: string,
  therapistId: string,
  userId: string
) {
  const isOwner = await sessionQueries.isSessionOfTherapist(sessionId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this session');
  }

  const session = await sessionQueries.cancelSession(sessionId);

  await auditService.logSessionUpdated(userId, sessionId, { 
    action: 'cancelled' 
  } as Prisma.InputJsonValue);

  return session;
}

/**
 * Delete a session
 */
export async function deleteSession(
  sessionId: string,
  therapistId: string,
  userId: string
) {
  const isOwner = await sessionQueries.isSessionOfTherapist(sessionId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this session');
  }

  // Check if session has any associated data
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      summary: true,
      planVersions: true,
    },
  });

  if (session?.planVersions && session.planVersions.length > 0) {
    throw new ValidationError(
      'Cannot delete session that has been used to generate treatment plans'
    );
  }

  await sessionQueries.deleteSession(sessionId);

  await auditService.logAudit({
    userId,
    action: 'DELETE',
    entityType: 'Session',
    entityId: sessionId,
  });

  return { deleted: true };
}

/**
 * Get upcoming sessions for dashboard
 */
export async function getUpcomingSessions(therapistId: string, limit: number = 5) {
  const sessions = await sessionQueries.getUpcomingSessions(therapistId, limit);

  return sessions.map((session) => ({
    id: session.id,
    clientId: session.clientId,
    clientName: session.client.preferredName ||
      `${session.client.user.firstName} ${session.client.user.lastName}`,
    sessionNumber: session.sessionNumber,
    scheduledAt: session.scheduledAt,
    status: session.status,
  }));
}

/**
 * Get session stats for dashboard
 */
export async function getSessionStats(therapistId: string) {
  return sessionQueries.getSessionStats(therapistId);
}

/**
 * Validate session creation input
 */
export function validateCreateSessionInput(input: Partial<CreateSessionInput>): {
  valid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};

  if (!input.clientId) {
    errors.clientId = ['Client is required'];
  }

  if (!input.scheduledAt) {
    errors.scheduledAt = ['Scheduled date and time is required'];
  }

  if (input.durationMinutes !== undefined) {
    if (input.durationMinutes < 15 || input.durationMinutes > 180) {
      errors.durationMinutes = ['Duration must be between 15 and 180 minutes'];
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

