'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProfileManager } from '@/components/profile/ProfileManager';
import { CompleteAuthorProfile } from '@/lib/services/author-profile.service';

// CI-safe wrapper component
function ProfilePageContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<CompleteAuthorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Fetch profile when user is loaded
  useEffect(() => {
    if (user && isLoaded) {
      fetchProfile();
    }
  }, [user, isLoaded]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);

    try {
      const response = await fetch('/api/profile/user');

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data.profile);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProfileLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="mb-4 h-8 rounded bg-gray-200"></div>
            <div className="mb-2 h-4 rounded bg-gray-200"></div>
            <div className="h-4 w-2/3 rounded bg-gray-200"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">
            Manage your author profile and connect with readers
          </p>
        </div>

        {/* Error State */}
        {profileError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-700">
              ❌ Error loading profile: {profileError}
              <button
                onClick={fetchProfile}
                className="ml-2 text-red-600 underline hover:text-red-800"
              >
                Retry
              </button>
            </p>
          </div>
        )}

        {/* Loading State */}
        {profileLoading ? (
          <div className="max-w-2xl">
            <div className="animate-pulse">
              <div className="mb-4 h-32 rounded-lg bg-gray-200"></div>
              <div className="mb-2 h-8 rounded bg-gray-200"></div>
              <div className="h-4 w-3/4 rounded bg-gray-200"></div>
            </div>
          </div>
        ) : profile ? (
          /* Profile Content */
          <div className="max-w-2xl">
            <ProfileManager initialProfile={profile} isOwnProfile={true} />
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  if (isCI) {
    // Return CI-safe version without Clerk hooks
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600">
              Manage your author profile and connect with readers
            </p>
          </div>
          <div className="max-w-2xl">
            {/* Show placeholder ProfileManager with empty data during CI */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <p className="text-gray-500">Profile content (CI placeholder)</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Return normal component with Clerk hooks for non-CI builds
  return <ProfilePageContent />;
}
