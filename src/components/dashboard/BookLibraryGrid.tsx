'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AddBookDialog } from '@/components/book-management/AddBookDialog';
import { Button } from '@/components/ui/button';
import { PrimaryBook } from '@/lib/types/primary-book';

import { BookCard } from './BookCard';

interface BookLibraryGridProps {
  books: PrimaryBook[];
  isLoading?: boolean;
}

export function BookLibraryGrid({ books, isLoading }: BookLibraryGridProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  const handleBookAdded = () => {
    // Refresh the page to show the new book
    router.refresh();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 rounded-lg animate-pulse"
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
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">📚</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            No books in your collection yet
          </h3>
          <p className="text-gray-600 mb-6 max-w-md">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {books.map(book => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}
