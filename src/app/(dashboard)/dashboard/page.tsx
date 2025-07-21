import { auth, currentUser } from '@clerk/nextjs/server';
import { BookOpen } from 'lucide-react';
import { redirect } from 'next/navigation';

import { CustomUserButton } from '@/components/ui/custom-user-button';
import { AuthorProfileService } from '@/lib/services/author-profile.service';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    // Test 1: Basic auth (✅ WORKING)
    const { userId } = await auth();
    if (!userId) {
      redirect('/sign-in');
    }

    // Test 2: Get user info (✅ WORKING)
    const user = await currentUser();
    if (!user) {
      redirect('/sign-in');
    }

    // Test 3: Add Author Profile Service (🧪 TESTING)
    let profileResult = null;
    let profileError = null;

    try {
      const authorService = new AuthorProfileService();
      profileResult = await authorService.getOrCreateProfile(userId);
    } catch (error) {
      profileError = error;
    }

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
          <div className="space-y-6">
            {/* Auth Status - WORKING */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                ✅ Authentication Status
              </h2>
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
            </div>

            {/* Profile Service Test */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                🧪 Profile Service Test
              </h2>

              {profileError ? (
                <div className="p-4 bg-red-50 rounded border border-red-200">
                  <h3 className="font-semibold text-red-800 mb-2">
                    ❌ Profile Service Failed
                  </h3>
                  <div className="space-y-2 text-sm text-red-700">
                    <p>
                      <strong>Error:</strong>{' '}
                      {profileError instanceof Error
                        ? profileError.message
                        : 'Unknown error'}
                    </p>
                    <p>
                      <strong>Type:</strong>{' '}
                      {profileError instanceof Error
                        ? profileError.name
                        : 'Unknown'}
                    </p>
                  </div>
                  <div className="mt-3 p-3 bg-red-100 rounded text-red-800 text-xs">
                    <pre className="whitespace-pre-wrap">
                      {profileError instanceof Error
                        ? profileError.stack
                        : 'No stack trace'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">
                    ✅ Profile Service Success
                  </h3>
                  <p className="text-sm text-green-700">
                    Profile data loaded successfully
                  </p>
                  {profileResult && (
                    <div className="mt-2 text-xs text-green-600">
                      <p>
                        <strong>Profile ID:</strong> {profileResult.id || 'N/A'}
                      </p>
                      <p>
                        <strong>Name:</strong> {profileResult.name || 'N/A'}
                      </p>
                      <p>
                        <strong>Status:</strong> {profileResult.status || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
