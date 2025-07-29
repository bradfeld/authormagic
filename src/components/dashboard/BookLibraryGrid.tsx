'use client';

import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

import { AddBookDialog } from '@/components/book-management/AddBookDialog';
import { Button } from '@/components/ui/button';
import { SimplifiedBook } from '@/lib/types/book';

import { BookCard } from './BookCard';

interface BookLibraryGridProps {
  books: SimplifiedBook[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

// CI-safe wrapper component
function BookLibraryGridContent({
  books,
  isLoading,
  onRefresh,
}: BookLibraryGridProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { user } = useUser();

  const handleBookAdded = () => {
    // Refresh the book data to show the new book
    if (onRefresh) {
      onRefresh();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <AddBookDialog
            isOpen={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onBookAdded={handleBookAdded}
            userId={user?.id}
            firstName={user?.firstName ?? undefined}
            lastName={user?.lastName ?? undefined}
          >
            <Button onClick={() => setAddDialogOpen(true)}>Add Book</Button>
          </AddBookDialog>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!books || books.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <span className="text-4xl">📚</span>
          </div>
          <h3 className="mb-2 text-xl font-semibold">
            No books in your collection yet
          </h3>
          <p className="mb-6 max-w-md text-gray-600">
            Start building your book collection by searching for and adding your
            published works. Each book you add will help you track editions,
            formats, and marketing opportunities.
          </p>
          <AddBookDialog
            isOpen={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onBookAdded={handleBookAdded}
            userId={user?.id}
            firstName={user?.firstName ?? undefined}
            lastName={user?.lastName ?? undefined}
          >
            <Button onClick={() => setAddDialogOpen(true)} size="lg">
              Add Your First Book
            </Button>
          </AddBookDialog>
        </div>
      </div>
    );
  }

  // Books display
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </div>
        <AddBookDialog
          isOpen={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onBookAdded={handleBookAdded}
          userId={user?.id}
          firstName={user?.firstName ?? undefined}
          lastName={user?.lastName ?? undefined}
        >
          <Button onClick={() => setAddDialogOpen(true)}>Add Book</Button>
        </AddBookDialog>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {books.map(book => (
          <BookCard key={book.id} book={book} onBookDeleted={onRefresh} />
        ))}
      </div>
    </div>
  );
}

export function BookLibraryGrid({
  books,
  isLoading,
  onRefresh,
}: BookLibraryGridProps) {
  // Always call useState to satisfy React Hooks rules
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_addDialogOpen, _setAddDialogOpen] = useState(false);

  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  if (isCI) {
    // Return CI-safe version without Clerk hooks

    // Loading state
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <Button disabled>Add Book</Button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-lg bg-gray-100"
              />
            ))}
          </div>
        </div>
      );
    }

    // Empty state (CI version)
    if (!books || books.length === 0) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <span className="text-4xl">📚</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              No books in your collection yet
            </h3>
            <p className="mb-6 max-w-md text-gray-600">
              Start building your book collection by searching for and adding
              your published works. Each book you add will help you track
              editions, formats, and marketing opportunities.
            </p>
            <Button disabled size="lg">
              Add Your First Book
            </Button>
          </div>
        </div>
      );
    }

    // Books display (CI version)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </div>
          <Button disabled>Add Book</Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {books.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </div>
    );
  }

  // Return normal component with Clerk hooks for non-CI builds
  return (
    <BookLibraryGridContent
      books={books}
      isLoading={isLoading}
      onRefresh={onRefresh}
    />
  );
}
