import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProfileManager } from '@/components/profile/ProfileManager';
import { AuthorProfileService } from '@/lib/services/author-profile.service';

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const authorService = new AuthorProfileService();

  // Get or create the complete author profile
  const profile = await authorService.getOrCreateProfile(userId);

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

        {/* Profile Content */}
        <div className="max-w-2xl">
          <ProfileManager initialProfile={profile} isOwnProfile={true} />
        </div>
      </div>
    </DashboardLayout>
  );
}
