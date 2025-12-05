import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { ClientListItem, ClientFilterParams } from '@/types';

/**
 * Get all clients for a therapist with pagination and filtering
 */
export async function getClientsByTherapist(
  therapistId: string,
  params: ClientFilterParams = {}
) {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    sortBy = 'intakeDate',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ClientWhereInput = {
    therapistId,
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { preferredName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Build orderBy
  const orderBy: Prisma.ClientOrderByWithRelationInput = {};
  if (sortBy === 'name') {
    orderBy.user = { firstName: sortOrder };
  } else if (sortBy === 'intakeDate') {
    orderBy.intakeDate = sortOrder;
  } else if (sortBy === 'lastSession') {
    // Will need to handle this separately
    orderBy.updatedAt = sortOrder;
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        sessions: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
        treatmentPlans: {
          where: { status: 'ACTIVE' },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: { sessions: true },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  // Transform to ClientListItem format
  const items: ClientListItem[] = clients.map((client) => ({
    id: client.id,
    firstName: client.user.firstName,
    lastName: client.user.lastName,
    preferredName: client.preferredName,
    pronouns: client.pronouns,
    email: client.user.email,
    intakeDate: client.intakeDate,
    isActive: client.isActive,
    lastSessionDate: client.sessions[0]?.scheduledAt ?? null,
    activePlanId: client.treatmentPlans[0]?.id ?? null,
    sessionCount: client._count.sessions,
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
 * Get a single client by ID
 */
export async function getClientById(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          image: true,
          createdAt: true,
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
      sessions: {
        orderBy: { scheduledAt: 'desc' },
        take: 10,
        include: {
          summary: {
            select: {
              id: true,
              keyTopics: true,
            },
          },
        },
      },
      treatmentPlans: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          sessions: true,
          treatmentPlans: true,
        },
      },
    },
  });
}

/**
 * Get client by user ID
 */
export async function getClientByUserId(userId: string) {
  return prisma.client.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
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
    },
  });
}

/**
 * Create a new client (with user account)
 */
export async function createClient(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  therapistId: string;
  preferredName?: string;
  dateOfBirth?: Date;
  pronouns?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}) {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'CLIENT',
      client: {
        create: {
          therapistId: data.therapistId,
          preferredName: data.preferredName,
          dateOfBirth: data.dateOfBirth,
          pronouns: data.pronouns,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          notes: data.notes,
        },
      },
    },
    include: {
      client: true,
    },
  });
}

/**
 * Update a client's information
 */
export async function updateClient(
  clientId: string,
  data: {
    preferredName?: string;
    dateOfBirth?: Date;
    pronouns?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
    isActive?: boolean;
  }
) {
  return prisma.client.update({
    where: { id: clientId },
    data,
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
 * Soft delete a client (set isActive to false)
 */
export async function deactivateClient(clientId: string) {
  return prisma.client.update({
    where: { id: clientId },
    data: { isActive: false },
  });
}

/**
 * Hard delete a client and associated user
 * Use with caution - only for cleanup purposes
 */
export async function deleteClient(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { userId: true },
  });

  if (!client) return null;

  // Delete user (cascades to client)
  return prisma.user.delete({
    where: { id: client.userId },
  });
}

/**
 * Check if a client belongs to a therapist
 */
export async function isClientOfTherapist(
  clientId: string,
  therapistId: string
): Promise<boolean> {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      therapistId,
    },
    select: { id: true },
  });

  return client !== null;
}

/**
 * Get client stats for dashboard
 */
export async function getClientStats(therapistId: string) {
  const [totalClients, activeClients, recentSessions] = await Promise.all([
    prisma.client.count({
      where: { therapistId },
    }),
    prisma.client.count({
      where: { therapistId, isActive: true },
    }),
    prisma.session.count({
      where: {
        therapistId,
        scheduledAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    }),
  ]);

  return {
    totalClients,
    activeClients,
    inactiveClients: totalClients - activeClients,
    recentSessions,
  };
}

