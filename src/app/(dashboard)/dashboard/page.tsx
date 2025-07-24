import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { BookLibraryGrid } from '@/components/dashboard/BookLibraryGrid';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthorProfilePreview } from '@/components/profile/AuthorProfilePreview';
import { AuthorProfileService } from '@/lib/services/author-profile.service';
import { PrimaryBookService } from '@/lib/services/primary-book.service';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  // Get complete author profile data
  const authorService = new AuthorProfileService();
  const completeProfile = await authorService.getOrCreateProfile(userId);

  // Get user's primary books
  const userBooks = await PrimaryBookService.getUserPrimaryBooks(userId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {completeProfile.name}! Here&apos;s your author
            overview.
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <AuthorProfilePreview profile={completeProfile} />
          </div>

          {/* Book Library Section */}
          <div className="lg:col-span-2">
            <BookLibraryGrid books={userBooks} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
