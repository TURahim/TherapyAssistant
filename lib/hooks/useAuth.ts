'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { UserRole } from '@prisma/client';
import { getRedirectPath } from '@/lib/auth/session';

interface UseAuthReturn {
  // Session state
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    image?: string | null;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Role checks
  isTherapist: boolean;
  isClient: boolean;
  isAdmin: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  
  // Utilities
  redirectToDashboard: () => void;
}

/**
 * Custom hook for authentication state and actions
 * Use this in client components
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user ?? null;
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!user;

  // Role checks
  const isTherapist = user?.role === UserRole.THERAPIST || user?.role === UserRole.ADMIN;
  const isClient = user?.role === UserRole.CLIENT;
  const isAdmin = user?.role === UserRole.ADMIN;

  // Login action
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          return {
            success: false,
            error:
              result.error === 'CredentialsSignin'
                ? 'Invalid email or password'
                : result.error,
          };
        }

        return { success: true };
      } catch {
        return {
          success: false,
          error: 'An unexpected error occurred',
        };
      }
    },
    []
  );

  // Logout action
  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/login');
  }, [router]);

  // Redirect to appropriate dashboard
  const redirectToDashboard = useCallback(() => {
    if (user) {
      router.push(getRedirectPath(user.role));
    } else {
      router.push('/login');
    }
  }, [user, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
    isTherapist,
    isClient,
    isAdmin,
    login,
    logout,
    redirectToDashboard,
  };
}

/**
 * Hook to check if user has a specific role
 */
export function useRequireRole(allowedRoles: UserRole[]) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const hasAccess = user && allowedRoles.includes(user.role);

  useCallback(() => {
    if (!isLoading && isAuthenticated && !hasAccess) {
      router.push(getRedirectPath(user!.role));
    }
  }, [isLoading, isAuthenticated, hasAccess, user, router]);

  return {
    hasAccess,
    isLoading,
  };
}

