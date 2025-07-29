import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookEdition } from '@/lib/types/book';

interface EditionCardProps {
  edition: BookEdition;
}

export function EditionCard({ edition }: EditionCardProps) {
  const getOrdinalSuffix = (num: number): string => {
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
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {edition.edition_number
              ? `${edition.edition_number}${getOrdinalSuffix(edition.edition_number)} Edition`
              : 'Edition'}
          </span>
          {edition.publication_year && (
            <Badge variant="secondary">{edition.publication_year}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {edition.bindings && edition.bindings.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              Available Formats:
            </h4>
            <div className="grid gap-3">
              {edition.bindings.map(binding => (
                <div
                  key={binding.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium capitalize">
                        {binding.binding_type.replace('_', ' ')}
                      </div>
                      {binding.isbn && (
                        <div className="text-xs text-gray-500">
                          ISBN: {binding.isbn}
                        </div>
                      )}
                      {binding.publisher && (
                        <div className="text-xs text-gray-500">
                          Publisher: {binding.publisher}
                        </div>
                      )}
                    </div>
                    {binding.price && (
                      <div className="text-sm font-medium text-green-600">
                        ${binding.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {binding.pages && (
                    <div className="mt-1 text-xs text-gray-500">
                      {binding.pages} pages
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No format information available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
