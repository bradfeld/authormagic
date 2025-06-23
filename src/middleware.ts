import { NextResponse } from 'next/server'

export function middleware() {
  // Create response
  const response = NextResponse.next()

  // Content Security Policy - Fixes "Content Security Policy Header Not Set" (MEDIUM)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  // Permissions Policy - Fixes "Permissions Policy Header Not Set" (LOW)
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=()',
    'usb=()',
    'screen-wake-lock=()',
    'web-share=()',
    'xr-spatial-tracking=()'
  ].join(', ')

  response.headers.set('Permissions-Policy', permissionsPolicy)

  // Additional Security Headers - Helps with "Proxy Disclosure" (MEDIUM)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // Hide server information - Helps with "Proxy Disclosure" (MEDIUM)
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  response.headers.set('Server', 'AuthorMagic')

  // Prevent information disclosure
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  return response
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
} 