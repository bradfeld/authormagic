import { auth, currentUser } from '@clerk/nextjs/server';
import { BookOpen } from 'lucide-react';
import { redirect } from 'next/navigation';

import { BookLibraryGrid } from '@/components/dashboard/BookLibraryGrid';
import { AuthorProfilePreview } from '@/components/profile/AuthorProfilePreview';
import { CustomUserButton } from '@/components/ui/custom-user-button';
import { AuthorProfileService } from '@/lib/services/author-profile.service';
import { PrimaryBookService } from '@/lib/services/primary-book.service';

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">
                AuthorMagic
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <CustomUserButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
    </div>
  );
}
