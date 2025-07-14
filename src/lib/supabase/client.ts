import { createBrowserClient } from '@supabase/ssr';

// TypeScript declaration for window.Clerk
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken(): Promise<string | null>;
      };
    };
  }
}

export function createClient() {
  return createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      accessToken: async () => {
        // Get token from window.Clerk if available
        if (typeof window !== 'undefined' && window.Clerk) {
          const session = window.Clerk.session;
          if (session) {
            return await session.getToken();
          }
        }
        return null;
      },
    },
  );
}
