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
    const debugInfo: any = {};

    try {
      debugInfo.step = 'Creating AuthorProfileService instance';
      const authorService = new AuthorProfileService();

      debugInfo.step = 'Calling getOrCreateProfile';
      debugInfo.userId = userId;

      profileResult = await authorService.getOrCreateProfile(userId);
      debugInfo.step = 'Profile service completed successfully';
    } catch (error) {
      debugInfo.step = `Failed at: ${debugInfo.step}`;
      debugInfo.errorType = typeof error;
      debugInfo.errorConstructor = error?.constructor?.name;
      debugInfo.errorString = String(error);
      debugInfo.errorKeys = error ? Object.keys(error) : [];

      if (error instanceof Error) {
        debugInfo.isError = true;
        debugInfo.message = error.message;
        debugInfo.name = error.name;
        debugInfo.stack = error.stack;
      } else {
        debugInfo.isError = false;
        debugInfo.rawError = error;
      }

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

                  {/* Debug Information */}
                  <div className="mb-4 p-3 bg-red-100 rounded">
                    <h4 className="font-semibold text-red-800 mb-2">
                      🔍 Debug Information:
                    </h4>
                    <div className="space-y-1 text-xs text-red-700">
                      <p>
                        <strong>Failed at step:</strong> {debugInfo.step}
                      </p>
                      <p>
                        <strong>User ID:</strong> {debugInfo.userId}
                      </p>
                      <p>
                        <strong>Error type:</strong> {debugInfo.errorType}
                      </p>
                      <p>
                        <strong>Error constructor:</strong>{' '}
                        {debugInfo.errorConstructor}
                      </p>
                      <p>
                        <strong>Is Error object:</strong>{' '}
                        {String(debugInfo.isError)}
                      </p>
                      <p>
                        <strong>Error keys:</strong>{' '}
                        {debugInfo.errorKeys?.join(', ') || 'none'}
                      </p>
                    </div>
                  </div>

                  {/* Standard Error Info */}
                  <div className="space-y-2 text-sm text-red-700">
                    <p>
                      <strong>Message:</strong>{' '}
                      {debugInfo.message || 'No message'}
                    </p>
                    <p>
                      <strong>Name:</strong> {debugInfo.name || 'No name'}
                    </p>
                    <p>
                      <strong>String representation:</strong>{' '}
                      {debugInfo.errorString}
                    </p>
                  </div>

                  {/* Stack Trace */}
                  {debugInfo.stack && (
                    <div className="mt-3 p-3 bg-red-100 rounded text-red-800 text-xs">
                      <strong>Stack Trace:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {debugInfo.stack}
                      </pre>
                    </div>
                  )}

                  {/* Raw Error for non-Error objects */}
                  {!debugInfo.isError && debugInfo.rawError && (
                    <div className="mt-3 p-3 bg-red-100 rounded text-red-800 text-xs">
                      <strong>Raw Error Object:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {JSON.stringify(debugInfo.rawError, null, 2)}
                      </pre>
                    </div>
                  )}
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
    // Return error page for top-level errors
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            Top-Level Dashboard Error
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
            <pre>
              {error instanceof Error
                ? error.stack
                : JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}
