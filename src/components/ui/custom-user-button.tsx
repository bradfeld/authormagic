'use client';

import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

// CI-safe wrapper component
function CustomUserButtonContent() {
  const { isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoaded, setAdminCheckLoaded] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
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

    if (authLoaded && user) {
      checkAdminStatus();
    }
  }, [authLoaded, user]);

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

export function CustomUserButton() {
  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  if (isCI) {
    // Show placeholder during CI builds
    return <div className="h-10 w-10 rounded-full bg-gray-200" />;
  }

  // Return normal component with Clerk hooks for non-CI builds
  return <CustomUserButtonContent />;
}
