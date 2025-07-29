import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { DeleteBookDialog } from '@/components/book-management/DeleteBookDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimplifiedBook } from '@/lib/types/book';

interface BookCardProps {
  book: SimplifiedBook;
  onBookDeleted?: () => void;
}

export function BookCard({ book, onBookDeleted }: BookCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Use the simplified structure directly
  const editionCount = book.total_editions;
  const bindingCount = book.total_books;
  const primaryEdition = book.primary_edition;
  const coverImage = book.cover_image;

  // Format the added date
  const addedDate = formatDistanceToNow(new Date(book.created_at), {
    addSuffix: true,
  });

  const handleDeleteBook = async () => {
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete book');
      }

      // Call the callback to refresh the book list
      if (onBookDeleted) {
        onBookDeleted();
      }
    } catch {
      // Silent error handling - could add toast notification here
    }
  };

  return (
    <>
      <Card className="group relative h-full w-full transition-shadow duration-200 hover:shadow-lg">
        {/* Action Menu */}
        <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={e => e.preventDefault()} // Prevent card click when menu is clicked
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={e => {
                  e.preventDefault();
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Book
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Make the entire card clickable */}
        <Link href={`/books/${book.id}`} className="block h-full">
          <CardHeader className="pb-4">
            <div className="flex gap-6">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                <div className="relative h-28 w-20 overflow-hidden rounded-md bg-gray-100 shadow-sm">
                  {coverImage ? (
                    <Image
                      src={coverImage}
                      alt={`Cover of ${book.title}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                      <span className="text-sm font-medium text-blue-600">
                        📚
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Book Info */}
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 line-clamp-2 text-xl leading-tight font-semibold transition-colors group-hover:text-blue-600">
                  {book.title}
                </h3>
                <p className="mb-3 text-base text-gray-600">by {book.author}</p>

                {/* Edition Info */}
                {primaryEdition && (
                  <p className="mb-3 text-sm text-gray-500">
                    {primaryEdition.edition_number &&
                    primaryEdition.publication_year
                      ? `${primaryEdition.edition_number}${getOrdinalSuffix(primaryEdition.edition_number)} Edition, ${primaryEdition.publication_year}`
                      : primaryEdition.publication_year
                        ? `Published ${primaryEdition.publication_year}`
                        : 'Edition info unavailable'}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Stats Badges */}
            <div className="mb-4 flex flex-wrap gap-3">
              {editionCount > 0 && (
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  {editionCount} {editionCount === 1 ? 'edition' : 'editions'}
                </Badge>
              )}
              {bindingCount > 0 && (
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  {bindingCount} {bindingCount === 1 ? 'book' : 'books'}
                </Badge>
              )}
            </div>

            {/* Added Date */}
            <p className="text-sm text-gray-400">Added {addedDate}</p>
          </CardContent>
        </Link>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteBookDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteBook}
        bookTitle={book.title}
      />
    </>
  );
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }

  switch (lastDigit) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
