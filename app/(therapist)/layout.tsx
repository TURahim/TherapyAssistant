import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Navbar } from '@/components/shared/Navbar';
import { PrivacyBanner } from '@/components/shared/PrivacyBanner';

export default async function TherapistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  // Redirect if not a therapist
  if (session.user.role !== 'THERAPIST' && session.user.role !== 'ADMIN') {
    redirect('/home');
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PrivacyBanner />
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <footer className="border-t py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Tava Health. AI-generated content requires clinical review.
          </p>
        </div>
      </footer>
    </div>
  );
}

