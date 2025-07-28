'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BookLibraryGrid } from '@/components/dashboard/BookLibraryGrid';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SimplifiedBook } from '@/lib/types/book';

// CI-safe wrapper component
function BooksPageContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [books, setBooks] = useState<SimplifiedBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Fetch books when user is loaded
  useEffect(() => {
    if (user && isLoaded) {
      fetchBooks();
    }
  }, [user, isLoaded]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Books</h1>
            <p className="text-gray-600">
              Manage your book collection, add new books, and track your
              collection.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </div>
        </div>

        {/* Error State */}
        {booksError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
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

        {/* Loading State */}
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
          /* Book Collection Grid */
          <BookLibraryGrid books={books} onRefresh={fetchBooks} />
        )}
      </div>
    </DashboardLayout>
  );
}

export default function BooksPage() {
  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  if (isCI) {
    // Return CI-safe version without Clerk hooks
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Books</h1>
              <p className="text-gray-600">
                Manage your book collection, add new books, and track your
                collection.
              </p>
            </div>
            <div className="text-sm text-gray-500">0 books</div>
          </div>
          <BookLibraryGrid books={[]} onRefresh={() => {}} />
        </div>
      </DashboardLayout>
    );
  }

  // Return normal component with Clerk hooks for non-CI builds
  return <BooksPageContent />;
}
