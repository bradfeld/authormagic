import { auth, currentUser } from '@clerk/nextjs/server';
import { BookOpen } from 'lucide-react';
import { redirect } from 'next/navigation';

import { BookManagementDashboard } from '@/components/book-management/BookManagementDashboard';
import { CustomUserButton } from '@/components/ui/custom-user-button';

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  // Extract only the serializable properties we need
  const userInfo = {
    firstName: user.firstName,
    lastName: user.lastName,
    userId: user.id,
  };

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
        <BookManagementDashboard userInfo={userInfo} />
      </div>
    </div>
  );
}
