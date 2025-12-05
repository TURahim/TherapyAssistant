import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import type { Session } from 'next-auth';

/**
 * Get the current session on the server
 */
export async function getSession(): Promise<Session | null> {
  return await auth();
}

/**
 * Get the current user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/login');
  }

  return session.user;
}

/**
 * Require a specific role - redirects if not authorized
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === UserRole.THERAPIST) {
      redirect('/dashboard');
    } else if (user.role === UserRole.CLIENT) {
      redirect('/home');
    } else {
      redirect('/');
    }
  }

  return user;
}

/**
 * Require therapist role
 */
export async function requireTherapist() {
  return requireRole([UserRole.THERAPIST, UserRole.ADMIN]);
}

/**
 * Require client role
 */
export async function requireClient() {
  return requireRole([UserRole.CLIENT]);
}

/**
 * Get redirect path based on user role
 */
export function getRedirectPath(role: UserRole): string {
  switch (role) {
    case UserRole.THERAPIST:
    case UserRole.ADMIN:
      return '/dashboard';
    case UserRole.CLIENT:
      return '/home';
    default:
      return '/';
  }
}

/**
 * Check if user is authenticated (for client components)
 */
export function isAuthenticated(session: Session | null): session is Session {
  return session !== null && session.user !== undefined;
}

/**
 * Check if user has a specific role
 */
export function hasRole(session: Session | null, roles: UserRole[]): boolean {
  if (!isAuthenticated(session)) return false;
  return roles.includes(session.user.role);
}

/**
 * Check if user is a therapist
 */
export function isTherapist(session: Session | null): boolean {
  return hasRole(session, [UserRole.THERAPIST, UserRole.ADMIN]);
}

/**
 * Check if user is a client
 */
export function isClient(session: Session | null): boolean {
  return hasRole(session, [UserRole.CLIENT]);
}

