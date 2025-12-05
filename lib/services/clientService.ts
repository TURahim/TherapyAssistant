import { hash } from 'bcryptjs';
import * as clientQueries from '@/lib/db/queries/clients';
import * as auditService from '@/lib/services/auditService';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { CreateClientInput, UpdateClientInput, ClientFilterParams } from '@/types';

const BCRYPT_ROUNDS = 12;

/**
 * Get all clients for a therapist
 */
export async function getTherapistClients(
  therapistId: string,
  userId: string,
  params: ClientFilterParams = {}
) {
  // Log the access
  await auditService.logAudit({
    userId,
    action: 'READ',
    entityType: 'ClientList',
    entityId: therapistId,
  });

  return clientQueries.getClientsByTherapist(therapistId, params);
}

/**
 * Get a single client with access control
 */
export async function getClient(
  clientId: string,
  therapistId: string,
  userId: string
) {
  const client = await clientQueries.getClientById(clientId);

  if (!client) {
    throw new NotFoundError('Client not found');
  }

  // Verify therapist owns this client
  if (client.therapistId !== therapistId) {
    throw new ForbiddenError('You do not have access to this client');
  }

  // Log the access
  await auditService.logClientViewed(userId, clientId);

  return client;
}

/**
 * Create a new client
 */
export async function createClient(
  input: CreateClientInput,
  userId: string
) {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  // Validate therapist exists
  const therapist = await prisma.therapist.findUnique({
    where: { id: input.therapistId },
  });

  if (!therapist) {
    throw new NotFoundError('Therapist not found');
  }

  // Hash the password
  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  // Create the client
  const result = await clientQueries.createClient({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    therapistId: input.therapistId,
    preferredName: input.preferredName,
    dateOfBirth: input.dateOfBirth,
    pronouns: input.pronouns,
    emergencyContact: input.emergencyContact,
    emergencyPhone: input.emergencyPhone,
    notes: input.notes,
  });

  // Log the creation
  await auditService.logClientCreated(userId, result.client!.id, {
    email: input.email,
    therapistId: input.therapistId,
  } as Prisma.InputJsonValue);

  return result;
}

/**
 * Update a client
 */
export async function updateClient(
  clientId: string,
  therapistId: string,
  userId: string,
  input: UpdateClientInput
) {
  // Verify access
  const isOwner = await clientQueries.isClientOfTherapist(clientId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this client');
  }

  // Update the client
  const updated = await clientQueries.updateClient(clientId, input);

  // Log the update
  await auditService.logClientUpdated(userId, clientId, input as Prisma.InputJsonValue);

  return updated;
}

/**
 * Deactivate a client (soft delete)
 */
export async function deactivateClient(
  clientId: string,
  therapistId: string,
  userId: string
) {
  // Verify access
  const isOwner = await clientQueries.isClientOfTherapist(clientId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this client');
  }

  const result = await clientQueries.deactivateClient(clientId);

  // Log the deactivation
  await auditService.logClientDeleted(userId, clientId, false);

  return result;
}

/**
 * Permanently delete a client
 * Use with extreme caution - this removes all data
 */
export async function deleteClientPermanently(
  clientId: string,
  therapistId: string,
  userId: string
) {
  // Verify access
  const isOwner = await clientQueries.isClientOfTherapist(clientId, therapistId);
  if (!isOwner) {
    throw new ForbiddenError('You do not have access to this client');
  }

  // Check if client has any sessions or plans
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      _count: {
        select: {
          sessions: true,
          treatmentPlans: true,
        },
      },
    },
  });

  if (client && (client._count.sessions > 0 || client._count.treatmentPlans > 0)) {
    throw new ValidationError(
      'Cannot delete client with existing sessions or treatment plans. Deactivate instead.'
    );
  }

  const result = await clientQueries.deleteClient(clientId);

  // Log the deletion
  await auditService.logClientDeleted(userId, clientId, true);

  return result;
}

/**
 * Get client dashboard stats for a therapist
 */
export async function getClientStats(therapistId: string) {
  return clientQueries.getClientStats(therapistId);
}

/**
 * Search clients by name or email
 */
export async function searchClients(
  therapistId: string,
  query: string,
  limit: number = 10
) {
  return clientQueries.getClientsByTherapist(therapistId, {
    search: query,
    limit,
    isActive: true,
  });
}

/**
 * Validate client creation input
 */
export function validateCreateClientInput(input: Partial<CreateClientInput>): {
  valid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};

  if (!input.email) {
    errors.email = ['Email is required'];
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = ['Invalid email format'];
  }

  if (!input.password) {
    errors.password = ['Password is required'];
  } else if (input.password.length < 8) {
    errors.password = ['Password must be at least 8 characters'];
  }

  if (!input.firstName) {
    errors.firstName = ['First name is required'];
  }

  if (!input.lastName) {
    errors.lastName = ['Last name is required'];
  }

  if (!input.therapistId) {
    errors.therapistId = ['Therapist ID is required'];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

