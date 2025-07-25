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
  try {
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
  } catch (error) {
    // Temporary error logging for production debugging
    console.error('Dashboard Error:', error);
    console.error('Error Details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Return error page instead of crashing
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-900 mb-2">
              Dashboard Error
            </h1>
            <p className="text-red-700 mb-4">
              There was an error loading your dashboard. Please check the
              console logs.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Error Details
              </summary>
              <pre className="mt-2 bg-red-100 p-2 rounded text-xs overflow-auto">
                {error instanceof Error ? error.message : String(error)}
              </pre>
            </details>
          </div>
        </div>
      </DashboardLayout>
    );
  }
}
