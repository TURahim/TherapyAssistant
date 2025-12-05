import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'Tava Health | AI-Assisted Treatment Plans',
    template: '%s | Tava Health',
  },
  description:
    'AI-powered mental health treatment planning that creates personalized, dual-view plans for therapists and clients.',
  keywords: [
    'mental health',
    'treatment plans',
    'therapy',
    'AI',
    'healthcare',
    'therapist tools',
    'client portal',
  ],
  authors: [{ name: 'Tava Health' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Tava Health',
    title: 'Tava Health | AI-Assisted Treatment Plans',
    description:
      'AI-powered mental health treatment planning that creates personalized, dual-view plans for therapists and clients.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
