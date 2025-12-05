import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ClientNavbar } from '@/components/client/ClientNavbar';
import { PrivacyBanner } from '@/components/shared/PrivacyBanner';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  // Allow clients and admins (for testing)
  if (session.user.role !== 'CLIENT' && session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PrivacyBanner />
      <ClientNavbar />
      
      {/* Main content area - offset for desktop sidebar, bottom nav for mobile */}
      <main className="flex-1 md:ml-64">
        <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}

