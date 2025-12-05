import { prisma } from '@/lib/db/prisma';
import type { Prisma, SessionStatus } from '@prisma/client';
import type { SessionListItem, SessionFilterParams } from '@/types';

/**
 * Get all sessions for a therapist with pagination and filtering
 */
export async function getSessionsByTherapist(
  therapistId: string,
  params: SessionFilterParams = {}
) {
  const {
    page = 1,
    limit = 20,
    clientId,
    status,
    fromDate,
    toDate,
    hasCrisis,
    sortBy = 'scheduledAt',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.SessionWhereInput = {
    therapistId,
    ...(clientId && { clientId }),
    ...(status && { status: status as SessionStatus }),
    ...(fromDate && { scheduledAt: { gte: new Date(fromDate) } }),
    ...(toDate && { scheduledAt: { lte: new Date(toDate) } }),
    ...(hasCrisis && { crisisSeverity: { not: 'NONE' } }),
  };

  // Build orderBy
  const orderBy: Prisma.SessionOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
        summary: {
          select: { id: true },
        },
      },
    }),
    prisma.session.count({ where }),
  ]);

  // Transform to SessionListItem format
  const items: SessionListItem[] = sessions.map((session) => ({
    id: session.id,
    clientId: session.clientId,
    clientName: session.client.preferredName || 
      `${session.client.user.firstName} ${session.client.user.lastName}`,
    sessionNumber: session.sessionNumber,
    scheduledAt: session.scheduledAt,
    status: session.status,
    crisisSeverity: session.crisisSeverity,
    hasTranscript: !!session.transcript,
    hasSummary: !!session.summary,
  }));

  return {
    items,
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
 * Get sessions for a specific client
 */
export async function getSessionsByClient(
  clientId: string,
  therapistId: string,
  params: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where: { clientId, therapistId },
      skip,
      take: limit,
      orderBy: { scheduledAt: 'desc' },
      include: {
        summary: {
          select: {
            id: true,
            keyTopics: true,
          },
        },
        mediaUploads: {
          select: {
            id: true,
            mediaType: true,
            fileName: true,
          },
        },
      },
    }),
    prisma.session.count({ where: { clientId, therapistId } }),
  ]);

  return {
    items: sessions,
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
 * Get a single session by ID
 */
export async function getSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
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
        },
      },
      therapist: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      summary: true,
      mediaUploads: true,
      planVersions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          plan: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get the next session number for a client
 */
export async function getNextSessionNumber(clientId: string): Promise<number> {
  const lastSession = await prisma.session.findFirst({
    where: { clientId },
    orderBy: { sessionNumber: 'desc' },
    select: { sessionNumber: true },
  });

  return (lastSession?.sessionNumber ?? 0) + 1;
}

/**
 * Create a new session
 */
export async function createSession(data: {
  clientId: string;
  therapistId: string;
  scheduledAt: Date;
  durationMinutes?: number;
  notes?: string;
}) {
  const sessionNumber = await getNextSessionNumber(data.clientId);

  return prisma.session.create({
    data: {
      clientId: data.clientId,
      therapistId: data.therapistId,
      sessionNumber,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes,
      notes: data.notes,
      status: 'SCHEDULED',
    },
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

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  data: {
    scheduledAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    status?: SessionStatus;
    durationMinutes?: number;
    transcript?: string;
    transcriptRaw?: string;
    notes?: string;
    crisisSeverity?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    crisisIndicators?: Prisma.InputJsonValue;
  }
) {
  return prisma.session.update({
    where: { id: sessionId },
    data: data as Prisma.SessionUpdateInput,
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

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string) {
  return prisma.session.delete({
    where: { id: sessionId },
  });
}

/**
 * Start a session (set status to IN_PROGRESS and startedAt)
 */
export async function startSession(sessionId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });
}

/**
 * Complete a session
 */
export async function completeSession(sessionId: string, durationMinutes?: number) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { startedAt: true },
  });

  const endedAt = new Date();
  const calculatedDuration = session?.startedAt
    ? Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000)
    : durationMinutes;

  return prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endedAt,
      durationMinutes: durationMinutes ?? calculatedDuration,
    },
  });
}

/**
 * Cancel a session
 */
export async function cancelSession(sessionId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'CANCELLED',
    },
  });
}

/**
 * Add transcript to a session
 */
export async function addTranscript(
  sessionId: string,
  transcript: string,
  transcriptRaw?: string
) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      transcript,
      transcriptRaw: transcriptRaw || transcript,
    },
  });
}

/**
 * Check if a session belongs to a therapist
 */
export async function isSessionOfTherapist(
  sessionId: string,
  therapistId: string
): Promise<boolean> {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      therapistId,
    },
    select: { id: true },
  });

  return session !== null;
}

/**
 * Get upcoming sessions for a therapist
 */
export async function getUpcomingSessions(therapistId: string, limit: number = 5) {
  return prisma.session.findMany({
    where: {
      therapistId,
      status: 'SCHEDULED',
      scheduledAt: {
        gte: new Date(),
      },
    },
    orderBy: { scheduledAt: 'asc' },
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

/**
 * Get session stats for a therapist
 */
export async function getSessionStats(therapistId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalSessions, completedThisWeek, upcomingThisWeek, crisisSessions] = await Promise.all([
    prisma.session.count({
      where: { therapistId },
    }),
    prisma.session.count({
      where: {
        therapistId,
        status: 'COMPLETED',
        endedAt: {
          gte: weekAgo,
          lte: now,
        },
      },
    }),
    prisma.session.count({
      where: {
        therapistId,
        status: 'SCHEDULED',
        scheduledAt: {
          gte: now,
          lte: weekAhead,
        },
      },
    }),
    prisma.session.count({
      where: {
        therapistId,
        crisisSeverity: { not: 'NONE' },
      },
    }),
  ]);

  return {
    totalSessions,
    completedThisWeek,
    upcomingThisWeek,
    crisisSessions,
  };
}

