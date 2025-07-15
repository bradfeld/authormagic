import { auth } from '@clerk/nextjs/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ProfileManager } from '@/components/profile/ProfileManager';
import { CustomUserButton } from '@/components/ui/custom-user-button';
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <CustomUserButton />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your author profile and connect with readers
          </p>
        </div>

        <ProfileManager initialProfile={profile} isOwnProfile={true} />
      </div>
    </div>
  );
}
