import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware((auth, req) => {
  // Allow public access to book search APIs
  if (req.nextUrl.pathname.startsWith('/api/books/')) {
    return;
  }

  // Allow public access to cache analytics for monitoring
  if (req.nextUrl.pathname.startsWith('/api/cache/')) {
    return;
  }

  // Protect all other routes with authentication
  auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
