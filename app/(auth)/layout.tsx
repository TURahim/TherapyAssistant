import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getRedirectPath } from '@/lib/auth/session';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is already authenticated
  const session = await auth();

  // If authenticated, redirect to appropriate dashboard
  if (session?.user) {
    redirect(getRedirectPath(session.user.role));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <svg
            className="h-7 w-7 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground">Tava Health</span>
      </div>

      {/* Auth content */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Disclaimer */}
      <p className="mt-8 max-w-md text-center text-xs text-muted-foreground">
        ⚠️ This is a demonstration application for educational purposes only.
        Not intended for clinical use. No real patient data should be entered.
      </p>
    </div>
  );
}

