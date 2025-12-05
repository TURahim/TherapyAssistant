import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup'];

// Routes for therapists only
const therapistRoutes = ['/dashboard', '/clients', '/sessions', '/plans', '/settings'];

// Routes for clients only
const clientRoutes = ['/home', '/plan', '/homework'];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public routes, API routes, and static files
  if (
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get the token using JWT (edge-compatible)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated - redirect to login
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const userRole = token.role as string;

  // Check therapist routes
  if (therapistRoutes.some((route) => pathname.startsWith(route))) {
    if (userRole !== 'THERAPIST' && userRole !== 'ADMIN') {
      // Redirect clients to their home
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  // Check client routes
  if (clientRoutes.some((route) => pathname.startsWith(route))) {
    if (userRole !== 'CLIENT') {
      // Redirect therapists to their dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
