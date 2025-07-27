// To analyze your bundle, run: ANALYZE=true npm run build
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
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
          // Note: CSP intentionally flexible for Clerk and development
          // Tighten in production as needed
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
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
