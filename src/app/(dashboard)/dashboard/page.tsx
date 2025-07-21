import { auth, currentUser } from '@clerk/nextjs/server';
import { BookOpen } from 'lucide-react';
import { redirect } from 'next/navigation';

import { CustomUserButton } from '@/components/ui/custom-user-button';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    // Test 1: Basic auth
    const { userId } = await auth();
    if (!userId) {
      redirect('/sign-in');
    }

    // Test 2: Get user info
    const user = await currentUser();
    if (!user) {
      redirect('/sign-in');
    }

    // Return minimal dashboard with just auth info
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Dashboard Status</h2>
            <div className="space-y-2">
              <p>
                <strong>User ID:</strong> {userId}
              </p>
              <p>
                <strong>Email:</strong>{' '}
                {user.emailAddresses[0]?.emailAddress || 'N/A'}
              </p>
              <p>
                <strong>Name:</strong> {user.firstName} {user.lastName}
              </p>
              <p>
                <strong>Auth Status:</strong> ✅ Successfully authenticated
              </p>
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded">
              <p className="text-green-800">
                🎉 <strong>Success!</strong> Basic authentication is working.
              </p>
              <p className="text-sm text-green-600 mt-1">
                If you see this message, the auth issue is resolved. The
                previous error was likely in the profile or book services.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    // Return error page instead of throwing
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            Dashboard Error
          </h1>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Error:</strong>{' '}
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <p>
              <strong>Type:</strong>{' '}
              {error instanceof Error ? error.name : 'Unknown'}
            </p>
          </div>
          <div className="mt-4 p-3 bg-red-100 rounded text-red-800 text-xs">
            <pre>{error instanceof Error ? error.stack : 'No stack trace'}</pre>
          </div>
        </div>
      </div>
    );
  }
}
