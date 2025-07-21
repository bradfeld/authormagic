import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
  // Skip API routes - they handle their own authentication
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next(), req);
  }

  // Skip public pages (home, sign-in, sign-up)
  if (
    req.nextUrl.pathname === '/' ||
    req.nextUrl.pathname.startsWith('/sign-')
  ) {
    return addSecurityHeaders(NextResponse.next(), req);
  }

  // Handle admin routes (admin-only access)
  if (req.nextUrl.pathname.startsWith('/admin')) {
    try {
      auth.protect();

      // Check if user is admin (will be handled by the admin pages themselves)
      // Just ensure they're authenticated here
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Admin auth middleware error:', error);
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  // Handle waitlist page (authenticated but waitlisted users only)
  if (req.nextUrl.pathname === '/waitlist') {
    try {
      auth.protect();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Waitlist auth middleware error:', error);
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  // Protect authenticated pages (dashboard, profile) with status check
  if (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/profile')
  ) {
    try {
      auth.protect();
      const { userId } = await auth();

      if (userId) {
        // Check user status and redirect if waitlisted
        try {
          const { WaitlistService } = await import(
            '@/lib/services/waitlist.service'
          );
          const waitlistService = new WaitlistService();
          const userStatus = await waitlistService.getUserStatus(userId);

          if (userStatus?.status === 'waitlisted') {
            return addSecurityHeaders(
              NextResponse.redirect(new URL('/waitlist', req.url)),
              req,
            );
          }

          if (userStatus?.status === 'blocked') {
            return addSecurityHeaders(
              NextResponse.redirect(new URL('/sign-in', req.url)),
              req,
            );
          }
        } catch (statusError) {
          // If we can't check status, log error but allow access
          // eslint-disable-next-line no-console
          console.error('Error checking user status:', statusError);
        }
      }
    } catch (error) {
      // Graceful error handling - redirect to sign-in instead of throwing
      // eslint-disable-next-line no-console
      console.error('Auth middleware error:', error);
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  // Allow all other routes to pass through with security headers
  return addSecurityHeaders(NextResponse.next(), req);
});

// Add security headers to all responses
function addSecurityHeaders(
  response: NextResponse,
  req: NextRequest,
): NextResponse {
  // Content Security Policy - optimized for Clerk authentication
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev https://js.clerk.com https://clerk.com https://clerk.authormagic.com https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://clerk.com https://clerk.authormagic.com https://api2.isbndb.com https://www.googleapis.com https://vercel.live wss://ws-us3.pusher.com",
    "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://js.clerk.com https://clerk.com https://clerk.authormagic.com https://vercel.live",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  // Security headers
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
  }

  // CORS headers for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://authormagic.com',
      'https://www.authormagic.com',
      process.env.NEXT_PUBLIC_APP_URL,
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS',
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With',
    );
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
