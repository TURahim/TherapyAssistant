'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '@prisma/client';
import { getRedirectPath } from '@/lib/auth/session';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Client-side authentication guard
 * Use this for client components that need auth protection
 * For server components, use requireAuth() from lib/auth/session.ts
 */
export function AuthGuard({
  children,
  allowedRoles,
  redirectTo,
  fallback,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    // Not authenticated - redirect to login
    if (status === 'unauthenticated') {
      router.push(redirectTo || '/login');
      return;
    }

    // Check role if specified
    if (
      allowedRoles &&
      session?.user &&
      !allowedRoles.includes(session.user.role)
    ) {
      // Redirect to appropriate dashboard based on actual role
      router.push(getRedirectPath(session.user.role));
    }
  }, [status, session, allowedRoles, redirectTo, router]);

  // Show loading state
  if (status === 'loading') {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Not authenticated
  if (status === 'unauthenticated') {
    return null;
  }

  // Wrong role
  if (
    allowedRoles &&
    session?.user &&
    !allowedRoles.includes(session.user.role)
  ) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version of AuthGuard
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    allowedRoles?: UserRole[];
    redirectTo?: string;
    fallback?: React.ReactNode;
  }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard
        allowedRoles={options?.allowedRoles}
        redirectTo={options?.redirectTo}
        fallback={options?.fallback}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };
}

