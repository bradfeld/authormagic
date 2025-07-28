import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SimplifiedBook } from '@/lib/types/primary-book';

interface BookCardProps {
  book: SimplifiedBook;
}

export function BookCard({ book }: BookCardProps) {
  // Use the simplified structure directly
  const editionCount = book.total_editions;
  const bindingCount = book.total_books;
  const primaryEdition = book.primary_edition;
  const coverImage = book.cover_image;

  // Format the added date
  const addedDate = formatDistanceToNow(new Date(book.created_at), {
    addSuffix: true,
  });

  return (
    <Card className="group h-full w-full transition-shadow duration-200 hover:shadow-lg">
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
                  <span className="text-sm font-medium text-blue-600">📚</span>
                </div>
              )}
            </div>
          </div>

          {/* Book Info */}
          <div className="min-w-0 flex-1">
            <h3 className="mb-2 line-clamp-2 text-xl leading-tight font-semibold">
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
    </Card>
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
