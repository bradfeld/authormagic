import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PrimaryBook } from '@/lib/types/primary-book';

interface BookCardProps {
  book: PrimaryBook;
}

export function BookCard({ book }: BookCardProps) {
  // Calculate edition and binding counts
  const editionCount = book.editions?.length || 0;
  const bindingCount =
    book.editions?.reduce(
      (total, edition) => total + (edition.bindings?.length || 0),
      0,
    ) || 0;

  // Get primary edition info (selected edition, most recent by publication year, or first)
  const primaryEdition =
    book.editions?.find(e => e.id === book.selected_edition_id) ||
    book.editions?.sort(
      (a, b) => (b.publication_year || 0) - (a.publication_year || 0),
    )?.[0];

  // Get cover image from first binding with an image, or use placeholder
  const coverImage = book.editions
    ?.flatMap(e => e.bindings || [])
    ?.find(b => b.cover_image_url)?.cover_image_url;

  // Format the added date
  const addedDate = formatDistanceToNow(new Date(book.created_at), {
    addSuffix: true,
  });

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 h-full w-full">
      <CardHeader className="pb-4">
        <div className="flex gap-6">
          {/* Book Cover */}
          <div className="flex-shrink-0">
            <div className="w-20 h-28 relative bg-gray-100 rounded-md overflow-hidden shadow-sm">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={`Cover of ${book.title}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">📚</span>
                </div>
              )}
            </div>
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xl leading-tight mb-2 line-clamp-2">
              {book.title}
            </h3>
            <p className="text-gray-600 text-base mb-3">by {book.author}</p>

            {/* Edition Info */}
            {primaryEdition && (
              <p className="text-sm text-gray-500 mb-3">
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
        <div className="flex flex-wrap gap-3 mb-4">
          {editionCount > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {editionCount} {editionCount === 1 ? 'edition' : 'editions'}
            </Badge>
          )}
          {bindingCount > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {bindingCount} {bindingCount === 1 ? 'format' : 'formats'}
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
