'use client';

import { Search, Loader2 } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UIBook } from '@/lib/types/ui-book';

interface AddBookDialogProps {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAdded?: () => void;
  userId?: string;
}

export function AddBookDialog({
  children,
  isOpen,
  onOpenChange,
  onBookAdded,
  userId,
}: AddBookDialogProps) {
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [searchResults, setSearchResults] = useState<UIBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'title-author' | 'isbn'>(
    'title-author',
  );
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnifiedSearch();
    }
  };

  const handleUnifiedSearch = async () => {
    if (!bookTitle.trim() && !author.trim()) {
      setSearchError('Please enter a book title or author name');
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      // Auto-detect if input looks like ISBN
      const isISBN =
        /^(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-\s])*[0-9X]$)(?:[0-9]{1,5}[-\s]?){1,7}[0-9X]$)/i.test(
          bookTitle.trim(),
        );

      if (isISBN) {
        setSearchType('isbn');
        const response = await fetch(
          `/api/books/isbn/${encodeURIComponent(bookTitle.trim())}`,
        );

        if (!response.ok) {
          throw new Error('Failed to search by ISBN');
        }

        const result = await response.json();
        setSearchResults(result.books || []);
      } else {
        setSearchType('title-author');
        const queryParams = new URLSearchParams();
        if (bookTitle.trim()) queryParams.append('title', bookTitle.trim());
        if (author.trim()) queryParams.append('author', author.trim());

        const response = await fetch(`/api/books/title-author?${queryParams}`);

        if (!response.ok) {
          throw new Error('Failed to search books');
        }

        const result = await response.json();
        setSearchResults(result.books || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Search failed. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBook = async (book: UIBook) => {
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          book: {
            title: book.title,
            authors: book.authors,
            isbn: book.isbn,
            publisher: book.publisher,
            published_date: book.published_date,
            description: book.description,
            categories: book.categories,
            thumbnail: book.thumbnail,
            page_count: book.page_count,
            binding: book.binding,
            format: book.format,
            edition: book.edition,
            subtitle: book.subtitle,
            language: book.language,
            dimensions: book.dimensions,
            weight: book.weight,
            msrp: book.msrp,
            price: book.price,
            currency: book.currency,
            date_created: book.date_created,
            dewey_decimal: book.dewey_decimal,
            overview: book.overview,
            excerpt: book.excerpt,
            synopsys: book.synopsys,
            image: book.image,
            title_long: book.title_long,
            related_isbns: book.related_isbns,
            subjects: book.subjects,
            reviews: book.reviews,
            prices: book.prices,
            other_isbns: book.other_isbns,
            book_id: book.book_id,
            other_isbns_bindings: book.other_isbns_bindings,
            coverUrl: book.coverUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add book');
      }

      await response.json();

      // Clear search results and close dialog
      setSearchResults([]);
      setBookTitle('');
      setAuthor('');
      setSearchError(null);
      onOpenChange(false);

      // Refresh the book list
      if (onBookAdded) {
        onBookAdded();
      }
    } catch (error) {
      console.error('Error adding book:', error);
      setSearchError('Failed to add book. Please try again.');
    }
  };

  const clearSearch = () => {
    setBookTitle('');
    setAuthor('');
    setSearchResults([]);
    setSearchError(null);
    setSearchType('title-author');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Unified Search Interface */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Search for Book</h3>
            </div>

            {/* Search Error Display */}
            {searchError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{searchError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Book Title Field */}
              <div className="space-y-2">
                <label htmlFor="bookTitle" className="text-sm font-medium">
                  Book Title
                </label>
                <input
                  id="bookTitle"
                  type="text"
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter book title or ISBN"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter book title or ISBN number
                </p>
              </div>

              {/* Author Field */}
              <div className="space-y-2">
                <label htmlFor="author" className="text-sm font-medium">
                  Author
                </label>
                <input
                  id="author"
                  type="text"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter author name"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Author name helps improve search accuracy
                </p>
              </div>
            </div>

            {/* Search Button with Loading State */}
            <div className="flex justify-end">
              <button
                onClick={handleUnifiedSearch}
                disabled={isLoading || (!bookTitle.trim() && !author.trim())}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search Books
                  </>
                )}
              </button>
            </div>

            {/* Search Type Indicator */}
            {searchResults.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-full">
                  {searchType === 'isbn'
                    ? 'ISBN Search'
                    : 'Title & Author Search'}
                </span>
                <span>Found {searchResults.length} results</span>
              </div>
            )}
          </div>

          {/* Search Results Display */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Search Results</h3>
                <button
                  onClick={clearSearch}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear Search
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map(book => (
                  <div
                    key={book.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{book.title}</h4>
                        {book.subtitle && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {book.subtitle}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          by {book.authors?.join(', ') || 'Unknown Author'}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          {book.isbn && <span>ISBN: {book.isbn}</span>}
                          {book.published_date && (
                            <span>Published: {book.published_date}</span>
                          )}
                          {book.publisher && (
                            <span>Publisher: {book.publisher}</span>
                          )}
                          {book.binding && <span>Format: {book.binding}</span>}
                          {book.edition && <span>Edition: {book.edition}</span>}
                        </div>
                        {book.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {book.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddBook(book)}
                        className="ml-4 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm flex-shrink-0"
                      >
                        Add Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {!isLoading &&
            searchResults.length === 0 &&
            (bookTitle.trim() || author.trim()) &&
            !searchError && (
              <div className="border rounded-lg p-8 text-center">
                <div className="text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg mb-2">No books found</p>
                  <p className="text-sm">
                    Try adjusting your search terms or check spelling
                  </p>
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
