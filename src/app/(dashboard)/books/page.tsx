import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { BookLibraryGrid } from '@/components/dashboard/BookLibraryGrid';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PrimaryBookService } from '@/lib/services/primary-book.service';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default async function BooksPage() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      redirect('/sign-in');
    }

    // Get user's primary books using the existing service
    const userBooks = await PrimaryBookService.getUserPrimaryBooks(userId);

    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Book Library
            </h1>
            <p className="text-gray-600">
              Manage your book collection, add new books, and track your
              library.
            </p>
          </div>

          {/* Book Library Grid - uses existing component with full functionality */}
          <BookLibraryGrid books={userBooks} />
        </div>
      </DashboardLayout>
    );
  } catch (error) {
    // Return error page instead of crashing
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-900 mb-2">
              Books Page Error
            </h1>
            <p className="text-red-700 mb-4">
              There was an error loading your book library. Please check the
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
