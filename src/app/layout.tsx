import { ClerkProvider } from '@clerk/nextjs';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

// Metadata configuration for AuthorMagic application
export const metadata: Metadata = {
  title: 'AuthorMagic - Join the Waitlist | AI-Powered Book Marketing Platform',
  description:
    'Join the waitlist for AuthorMagic - the AI-powered book marketing platform authors have been waiting for. Get early access, 50% launch discount, and priority support.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export const viewport = {
  themeColor: '#2563eb',
};

// Conditional wrapper for CI builds
function ConditionalClerkProvider({ children }: { children: React.ReactNode }) {
  // Disable Clerk during CI builds to prevent validation errors
  if (process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true') {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConditionalClerkProvider>
      <html lang="en">
        <body
          className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        >
          {children}
          <Toaster richColors />
        </body>
      </html>
    </ConditionalClerkProvider>
  );
}
