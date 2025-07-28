'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BookLibraryGrid } from '@/components/dashboard/BookLibraryGrid';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SimplifiedBook } from '@/lib/types/book';

export default function DashboardPage() {
  // Always call useUser to satisfy React Hooks rules
  const clerkHookData = useUser();

  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  // Use mock data in CI, real data otherwise
  const { user, isLoaded } = isCI
    ? { user: null, isLoaded: true }
    : clerkHookData;

  const router = useRouter();
  const [books, setBooks] = useState<SimplifiedBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCI && isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router, isCI]);

  // Fetch books when user is loaded (skip in CI)
  useEffect(() => {
    if (!isCI && user && isLoaded) {
      fetchBooks();
    }
  }, [user, isLoaded, isCI]);

  const fetchBooks = async () => {
    setBooksLoading(true);
    setBooksError(null);

    try {
      const response = await fetch('/api/books/user');

      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      setBooks(data.books || []);
    } catch (error) {
      setBooksError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBooksLoading(false);
    }
  };

  // Show placeholder content during CI builds
  if (isCI) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, Author! Here&apos;s your author overview.
            </p>
          </div>
          <div className="w-full">
            <BookLibraryGrid books={[]} onRefresh={() => {}} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="mb-4 h-8 rounded bg-gray-200"></div>
            <div className="mb-2 h-4 rounded bg-gray-200"></div>
            <div className="h-4 w-2/3 rounded bg-gray-200"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  const userName =
    user.fullName ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    'Author';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {userName}! Here&apos;s your author overview.
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="w-full">
          {booksError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-700">
                ❌ Error loading books: {booksError}
                <button
                  onClick={fetchBooks}
                  className="ml-2 text-red-600 underline hover:text-red-800"
                >
                  Retry
                </button>
              </p>
            </div>
          )}

          {booksLoading ? (
            <div className="p-6">
              <div className="animate-pulse">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 rounded-lg bg-gray-200"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <BookLibraryGrid books={books} onRefresh={fetchBooks} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
