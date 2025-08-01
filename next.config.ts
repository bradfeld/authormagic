// To analyze your bundle, run: ANALYZE=true npm run build
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  // Remove X-Powered-By header for security (StackHawk recommendation)
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Enhanced CSP: Added clerk.authormagic.com for production Clerk scripts
          // Next.js framework depends on inline scripts - removing breaks the app
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.authormagic.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://*.clerk.accounts.dev https://*.clerk.com https://clerk.authormagic.com https://books.googleapis.com https://covers.isbndb.com https://images.clerk.dev https://*.gravatar.com https://*.googleusercontent.com",
              "connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://clerk.authormagic.com https://books.googleapis.com https://api.isbndb.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Google Books API images
      {
        protocol: 'http',
        hostname: 'books.google.com',
        port: '',
        pathname: '/books/content/**',
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
        port: '',
        pathname: '/books/content/**',
      },
      // ISBNDB book cover images
      {
        protocol: 'https',
        hostname: 'images.isbndb.com',
        port: '',
        pathname: '/covers/**',
      },
      // Clerk user profile images
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withAnalyzer(nextConfig);
