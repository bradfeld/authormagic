'use client';

import { Search, Filter, Grid, List, BookOpen } from 'lucide-react';
import { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UIBook } from '@/lib/types/ui-book';

import { BookCard } from './BookCard';

interface BookLibraryProps {
  books: UIBook[];
  onViewBook?: (book: UIBook) => void;
  onEditBook?: (book: UIBook) => void;
  onDeleteBook?: (book: UIBook) => void;
}

export function BookLibrary({
  books,
  onViewBook,
  onEditBook,
  onDeleteBook,
}: BookLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get all unique categories from books
  const categories = useMemo(() => {
    const allCategories = books.flatMap(book => book.categories || []);
    return Array.from(new Set(allCategories)).sort();
  }, [books]);

  // Filter books based on search query and category
  const filteredBooks = useMemo(() => {
    let filtered = books;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        book =>
          book.title.toLowerCase().includes(query) ||
          book.authors?.some(author => author.toLowerCase().includes(query)) ||
          book.publisher?.toLowerCase().includes(query) ||
          book.isbn?.toLowerCase().includes(query),
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(book =>
        book.categories?.includes(selectedCategory),
      );
    }

    return filtered;
  }, [books, searchQuery, selectedCategory]);

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  if (books.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No books in your library
        </h3>
        <p className="text-gray-600 mb-4">
          Start building your library by adding your first book!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search books, authors, or ISBN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Filter by category:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge
                key={category}
                variant={
                  selectedCategory === category ? 'default' : 'secondary'
                }
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => handleCategoryFilter(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredBooks.length} of {books.length} books
          {searchQuery && ` matching "${searchQuery}"`}
          {selectedCategory && ` in "${selectedCategory}"`}
        </p>

        {(searchQuery || selectedCategory) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Books Grid/List */}
      {filteredBooks.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }
        >
          {filteredBooks.map((book, index) => (
            <BookCard
              key={book.id || book.isbn || book.title || index}
              book={book}
              onView={onViewBook}
              onEdit={onEditBook}
              onDelete={onDeleteBook}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No books found
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? `No books match "${searchQuery}"`
              : 'No books in this category'}
          </p>
        </div>
      )}
    </div>
  );
}
