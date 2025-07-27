import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import type { NextFetchEvent } from 'next/server';

// Create middleware that conditionally enables Clerk
export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  // Skip Clerk middleware in CI environments for security scanning
  if (process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true') {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('🔧 CI Mode: Skipping Clerk authentication');
    }
    return NextResponse.next();
  }

  // Use Clerk middleware in normal environments
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
