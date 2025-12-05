import { UserRole } from '@prisma/client';
import type { Session } from 'next-auth';

/**
 * Permission types for the application
 */
export type Permission =
  // Client management
  | 'clients:read'
  | 'clients:create'
  | 'clients:update'
  | 'clients:delete'
  // Session management
  | 'sessions:read'
  | 'sessions:create'
  | 'sessions:update'
  | 'sessions:delete'
  // Treatment plans
  | 'plans:read'
  | 'plans:create'
  | 'plans:update'
  | 'plans:delete'
  | 'plans:generate'
  // Homework
  | 'homework:read'
  | 'homework:complete'
  | 'homework:create'
  | 'homework:update'
  // Settings
  | 'settings:read'
  | 'settings:update'
  // Admin
  | 'admin:access';

/**
 * Role-based permission mappings
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admin has all permissions
    'clients:read',
    'clients:create',
    'clients:update',
    'clients:delete',
    'sessions:read',
    'sessions:create',
    'sessions:update',
    'sessions:delete',
    'plans:read',
    'plans:create',
    'plans:update',
    'plans:delete',
    'plans:generate',
    'homework:read',
    'homework:complete',
    'homework:create',
    'homework:update',
    'settings:read',
    'settings:update',
    'admin:access',
  ],
  [UserRole.THERAPIST]: [
    'clients:read',
    'clients:create',
    'clients:update',
    // Therapists cannot delete clients
    'sessions:read',
    'sessions:create',
    'sessions:update',
    'sessions:delete',
    'plans:read',
    'plans:create',
    'plans:update',
    'plans:generate',
    'homework:read',
    'homework:create',
    'homework:update',
    'settings:read',
    'settings:update',
  ],
  [UserRole.CLIENT]: [
    // Clients can only read their own data
    'plans:read',
    'homework:read',
    'homework:complete',
    'settings:read',
    'settings:update',
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  session: Session | null,
  permission: Permission
): boolean {
  if (!session?.user) return false;

  const userPermissions = rolePermissions[session.user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  session: Session | null,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(session, permission));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  session: Session | null,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(session, permission));
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(session: Session | null): Permission[] {
  if (!session?.user) return [];
  return rolePermissions[session.user.role] || [];
}

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  constructor(
    message: string = 'You do not have permission to perform this action'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Require a permission - throws if not authorized
 */
export function requirePermission(
  session: Session | null,
  permission: Permission
): void {
  if (!hasPermission(session, permission)) {
    throw new AuthorizationError(
      `Missing required permission: ${permission}`
    );
  }
}

/**
 * Check if user can access a specific client's data
 * Therapists can only access their own clients
 * Clients can only access their own data
 */
export async function canAccessClient(
  session: Session | null,
  clientId: string,
  prismaClient: {
    client: {
      findUnique: (args: {
        where: { id: string };
        select: { therapistId: true; userId: true };
      }) => Promise<{ therapistId: string; userId: string } | null>;
    };
    therapist: {
      findUnique: (args: {
        where: { userId: string };
      }) => Promise<{ id: string } | null>;
    };
  }
): Promise<boolean> {
  if (!session?.user) return false;

  // Admins can access all clients
  if (session.user.role === UserRole.ADMIN) return true;

  // Get the client record
  const client = await prismaClient.client.findUnique({
    where: { id: clientId },
    select: { therapistId: true, userId: true },
  });

  if (!client) return false;

  // Clients can only access their own data
  if (session.user.role === UserRole.CLIENT) {
    return client.userId === session.user.id;
  }

  // Therapists can only access their own clients
  if (session.user.role === UserRole.THERAPIST) {
    const therapist = await prismaClient.therapist.findUnique({
      where: { userId: session.user.id },
    });
    return therapist?.id === client.therapistId;
  }

  return false;
}

