'use client';

import {
  BookOpen,
  Calendar,
  Users,
  Building,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UIBook } from '@/lib/types/ui-book';

interface BookCardProps {
  book: UIBook;
  onView?: (book: UIBook) => void;
  onEdit?: (book: UIBook) => void;
  onDelete?: (book: UIBook) => void;
}

export function BookCard({ book, onView, onEdit, onDelete }: BookCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Author */}
          {book.authors && book.authors.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {book.authors.join(', ')}
              </span>
            </div>
          )}

          {/* Publisher */}
          {book.publisher && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{book.publisher}</span>
            </div>
          )}

          {/* Published Date */}
          {book.published_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {book.published_date}
              </span>
            </div>
          )}

          {/* ISBN */}
          {book.isbn && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-mono text-gray-600">
                {book.isbn}
              </span>
            </div>
          )}

          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1">
                {book.categories.slice(0, 3).map((category, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                ))}
                {book.categories.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{book.categories.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {book.description && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {book.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(book)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            )}

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(book)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}

            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(book)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
