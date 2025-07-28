'use client';

import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export function CustomUserButton() {
  // Always call Clerk hooks to satisfy React Hooks rules
  const authData = useAuth();
  const userData = useUser();

  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  // Use mock data in CI, real data otherwise
  const { isLoaded: authLoaded } = isCI ? { isLoaded: true } : authData;
  const { user } = isCI ? { user: null } : userData;

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoaded, setAdminCheckLoaded] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isCI || !user?.id) {
        setAdminCheckLoaded(true);
        return;
      }

      try {
        // Check admin status by calling our users API (which still exists)
        const response = await fetch('/api/admin/users?limit=1');
        setIsAdmin(response.ok && response.status === 200);
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminCheckLoaded(true);
      }
    };

    if (authLoaded && (user || isCI)) {
      checkAdminStatus();
    }
  }, [authLoaded, user, isCI]);

  // Show placeholder during CI builds
  if (isCI) {
    return <div className="h-10 w-10 rounded-full bg-gray-200" />;
  }

  if (!authLoaded || !adminCheckLoaded) {
    return <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />;
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'h-10 w-10',
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="Profile"
          href="/profile"
          labelIcon={<span>👤</span>}
        />
        {isAdmin && (
          <UserButton.Link
            label="Admin Dashboard"
            href="/admin/dashboard"
            labelIcon={<span>⚙️</span>}
          />
        )}
        {isAdmin && (
          <UserButton.Link
            label="User Management"
            href="/admin/users"
            labelIcon={<span>👥</span>}
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  );
}
