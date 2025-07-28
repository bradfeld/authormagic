'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  EditionDetectionService,
  EditionGroup,
} from '@/lib/services/edition-detection.service';
import { UIBook } from '@/lib/types/ui-book';

interface AddBookDialogProps {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAdded?: () => void;
  userId?: string;
  firstName?: string;
  lastName?: string;
}

export function AddBookDialog({
  children,
  isOpen,
  onOpenChange,
  onBookAdded,
  userId,
  firstName,
  lastName,
}: AddBookDialogProps) {
  const [bookTitle, setBookTitle] = useState('');
  const [editionGroups, setEditionGroups] = useState<EditionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset search state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasSearched(false);
      setEditionGroups([]);
      setBookTitle('');
    }
  }, [isOpen]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnifiedSearch();
    }
  };

  const handleUnifiedSearch = async () => {
    if (!bookTitle.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setEditionGroups([]); // Clear previous results immediately
    try {
      const isISBN =
        /^(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-\s])*[0-9X]$)(?:[0-9]{1,5}[-\s]?){1,7}[0-9X]$)/i.test(
          bookTitle.trim(),
        );
      if (isISBN) {
        const response = await fetch(
          `/api/books/isbn/${encodeURIComponent(bookTitle.trim())}`,
        );
        if (!response.ok) throw new Error('Failed to search by ISBN');
        const result = await response.json();
        // For ISBN search, group the results
        const books = result.books || [];
        const groups = EditionDetectionService.groupByEdition(books);
        setEditionGroups(groups);
      } else {
        const queryParams = new URLSearchParams();
        if (bookTitle.trim()) queryParams.append('title', bookTitle.trim());
        if (firstName || lastName)
          queryParams.append(
            'author',
            `${firstName || ''} ${lastName || ''}`.trim(),
          );
        // Add validation parameters to filter out phantom books
        queryParams.append('validate', 'true');
        const response = await fetch(`/api/books/title-author?${queryParams}`);
        if (!response.ok) throw new Error('Failed to search books');
        const result = await response.json();
        // Use editionGroups directly from API response
        setEditionGroups(result.editionGroups || []);
      }
    } catch {
      // Error handling removed - no state for error messages
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBook = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Detect THE primary book across all edition groups
      const primaryBook = detectGlobalPrimaryBook(editionGroups);
      if (!primaryBook) {
        throw new Error('No suitable primary book found');
      }

      // Normalize language codes to 2-character ISO codes for validation
      const normalizeLanguage = (lang?: string): string | undefined => {
        if (!lang) return undefined;
        // Convert common language names/codes to 2-character ISO codes
        const langMap: { [key: string]: string } = {
          english: 'en',
          'en-us': 'en',
          'en-gb': 'en',
          'english (united states)': 'en',
          spanish: 'es',
          french: 'fr',
          german: 'de',
          italian: 'it',
          portuguese: 'pt',
          russian: 'ru',
          chinese: 'zh',
          japanese: 'ja',
          korean: 'ko',
        };

        const normalized = lang.toLowerCase();
        if (langMap[normalized]) return langMap[normalized];

        // If already 2 characters, return as-is
        if (lang.length === 2) return lang.toLowerCase();

        // Extract first 2 characters for longer codes
        return lang.substring(0, 2).toLowerCase();
      };

      // Normalize language codes in edition groups (preserve structure)
      const normalizedEditionGroups = editionGroups.map(editionGroup => ({
        ...editionGroup,
        books: editionGroup.books.map(book => ({
          ...book,
          language: normalizeLanguage(book.language),
        })),
      }));

      // Send the complete edition groups structure to preserve detection results
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book: {
            ...primaryBook,
            language: normalizeLanguage(primaryBook.language),
          },
          editionGroups: normalizedEditionGroups,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to add book: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            // If error is a JSON string, try to parse it for better readability
            if (
              typeof errorData.error === 'string' &&
              errorData.error.startsWith('[')
            ) {
              try {
                const parsedErrors = JSON.parse(errorData.error);
                errorMessage = parsedErrors
                  .map((err: any) => err.message)
                  .join(', ');
              } catch {
                errorMessage = errorData.error;
              }
            } else {
              errorMessage = errorData.error;
            }
          }
        } catch {
          // If JSON parsing fails, use the status code message
        }
        throw new Error(errorMessage);
      }

      await response.json();
      setEditionGroups([]);
      setBookTitle('');
      setHasSearched(false);
      onOpenChange(false);
      if (onBookAdded) onBookAdded();
    } catch (error) {
      // For now, we'll log the error. In a future iteration we can add proper error UI
      alert(
        `Failed to add book: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to automatically detect THE primary book across ALL edition groups
  const detectGlobalPrimaryBook = (
    editionGroups: EditionGroup[],
  ): UIBook | null => {
    if (!editionGroups || editionGroups.length === 0) return null;

    // Find the most recent edition (edition groups are already sorted newest first)
    const mostRecentEdition = editionGroups[0];

    // Within the most recent edition, find the best binding
    return detectPrimaryBookInEdition(mostRecentEdition.books);
  };

  // Helper to detect primary book within a single edition (for display purposes)
  const detectPrimaryBookInEdition = (books: UIBook[]): UIBook | null => {
    if (!books || books.length === 0) return null;

    // Priority order: hardcover → paperback → kindle → ebook → audiobook → others
    const bindingPriority = [
      'hardcover',
      'paperback',
      'kindle',
      'ebook',
      'audiobook',
    ];

    // Group books by binding type
    const bindingGroups = groupBindings(books);

    // Find the first available binding type in priority order
    for (const preferredBinding of bindingPriority) {
      if (
        bindingGroups[preferredBinding] &&
        bindingGroups[preferredBinding].length > 0
      ) {
        // Return the first book of this binding type
        return bindingGroups[preferredBinding][0];
      }
    }

    // If no priority binding found, return the first book
    return books[0];
  };

  // Helper to group books by normalized binding type within an edition
  const groupBindings = (books: UIBook[]) => {
    const bindingGroups: { [binding: string]: UIBook[] } = {};
    books.forEach(book => {
      const binding = EditionDetectionService.normalizeBindingType(
        book.print_type || book.binding,
      );
      if (!bindingGroups[binding]) bindingGroups[binding] = [];
      bindingGroups[binding].push(book);
    });
    return bindingGroups;
  };

  // Helper to sort binding entries in preferred display order
  const sortBindingEntries = (entries: [string, UIBook[]][]) => {
    const bindingOrder = [
      'hardcover',
      'paperback',
      'kindle',
      'ebook',
      'audiobook',
    ];
    return entries.sort(([bindingA], [bindingB]) => {
      const indexA = bindingOrder.indexOf(bindingA);
      const indexB = bindingOrder.indexOf(bindingB);

      // If both bindings are in our order list, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // If only one is in the list, it comes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // If neither is in the list, sort alphabetically
      return bindingA.localeCompare(bindingB);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] !w-screen !max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Author Display */}
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700">Author:</span>
            <span className="ml-2 text-base text-gray-900">
              {firstName} {lastName}
            </span>
          </div>
          {/* Book Title/ISBN Input Row */}
          <div className="mb-6 flex items-end gap-4">
            <label
              htmlFor="bookTitle"
              className="mb-1 block min-w-fit text-sm font-medium"
            >
              Book Title or ISBN
            </label>
            <Input
              id="bookTitle"
              type="text"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter book title or ISBN"
              disabled={isLoading}
              aria-invalid={false} // Removed searchError
              aria-describedby={undefined} // Removed searchError
              className="flex-1"
            />
          </div>
          {/* Error Message */}
          {/* Removed searchError display */}
          {/* Loading Spinner */}
          {isLoading && (
            <div
              className="flex items-center justify-center py-8"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <span className="sr-only">Loading...</span>
            </div>
          )}
          {/* No Results Message */}
          {!isLoading && editionGroups.length === 0 && hasSearched && (
            <div
              className="flex flex-col items-center py-8"
              role="status"
              aria-live="polite"
            >
              <p className="text-muted-foreground text-base">
                No books found for your search.
              </p>
            </div>
          )}
          {/* Book Results */}
          {editionGroups.length > 0 && (
            <div className="mt-2 space-y-6">
              {editionGroups.map((edition, idx) => {
                const bindingGroups = groupBindings(edition.books);
                // Get best metadata using priority logic
                const bestMetadata = EditionDetectionService.getBestMetadata(
                  edition.books,
                );
                const bestBook = edition.books[0]; // For basic info like title, authors

                // Merge best metadata with basic book info
                const displayBook = {
                  ...bestBook,
                  ...bestMetadata,
                };
                const editionDisplay =
                  EditionDetectionService.getEditionDisplayName(edition);
                return (
                  <div
                    key={idx}
                    className="border-border hover:border-primary/50 mb-2 w-full rounded-lg border p-4 transition-all"
                  >
                    {/* Edition-level details with thumbnail */}
                    <div className="bg-muted/30 mb-3 flex w-full flex-col items-start gap-6 rounded-lg p-4 md:flex-row">
                      {/* Thumbnail */}
                      {displayBook?.thumbnail || displayBook?.image ? (
                        <Image
                          src={
                            displayBook.thumbnail ||
                            displayBook.image ||
                            '/window.svg'
                          }
                          alt={displayBook.title || 'Book cover'}
                          width={128}
                          height={192}
                          className="border-border h-48 w-32 flex-shrink-0 rounded border object-cover shadow-md"
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/window.svg';
                          }}
                        />
                      ) : (
                        <div className="border-border flex h-48 w-32 flex-shrink-0 items-center justify-center rounded border bg-gray-200 text-gray-400">
                          No Image
                        </div>
                      )}
                      {/* Details */}
                      <div className="w-full min-w-0 flex-1">
                        <div className="w-full truncate text-lg font-medium">
                          {displayBook?.title || '—'}
                        </div>
                        {displayBook?.subtitle && (
                          <div className="text-muted-foreground block w-full truncate text-sm">
                            {displayBook.subtitle}
                          </div>
                        )}
                        {/* Edition info immediately after subtitle */}
                        <div className="text-muted-foreground mt-1 mb-2 block text-sm">
                          {editionDisplay}
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Authors:</span>{' '}
                          {displayBook?.authors?.join(', ') || '—'}
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-medium">Publisher:</span>{' '}
                          {displayBook?.publisher || '—'}
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-medium">Publication Date:</span>{' '}
                          {displayBook?.published_date || '—'}
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-medium">ISBN:</span>{' '}
                          {displayBook?.isbn || '—'}
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-medium">Page Count:</span>{' '}
                          {displayBook?.page_count || '—'}
                        </div>
                      </div>
                    </div>
                    {/* Available bindings display */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">
                        Available Bindings:
                      </div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {sortBindingEntries(Object.entries(bindingGroups)).map(
                          ([binding, books]) => {
                            // Check if this binding in this edition is THE global primary
                            const globalPrimary =
                              detectGlobalPrimaryBook(editionGroups);
                            const isGlobalPrimary =
                              globalPrimary &&
                              edition.books.some(
                                book => book.id === globalPrimary.id,
                              ) &&
                              binding ===
                                EditionDetectionService.normalizeBindingType(
                                  globalPrimary.print_type ||
                                    globalPrimary.binding,
                                );

                            return (
                              <Badge
                                key={binding}
                                variant={
                                  isGlobalPrimary ? 'default' : 'outline'
                                }
                                className={
                                  isGlobalPrimary
                                    ? 'bg-amber-500 hover:bg-amber-600'
                                    : ''
                                }
                              >
                                {binding.charAt(0).toUpperCase() +
                                  binding.slice(1)}
                                {books.length > 1 && ` (${books.length})`}
                                {isGlobalPrimary && ' ⭐ PRIMARY'}
                              </Badge>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Global Primary Book Summary and Add Button */}
          {editionGroups.length > 0 &&
            (() => {
              const globalPrimary = detectGlobalPrimaryBook(editionGroups);
              const mostRecentEdition = editionGroups[0];
              const editionDisplay =
                EditionDetectionService.getEditionDisplayName(
                  mostRecentEdition,
                );

              return (
                <div className="mt-6 space-y-4">
                  <div className="border-t pt-4">
                    {/* Primary Book Summary */}
                    {globalPrimary && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-lg text-amber-600">⭐</div>
                          <div className="flex-1">
                            <div className="mb-1 font-semibold text-amber-900">
                              Primary Book Selection
                            </div>
                            <div className="text-sm text-amber-800">
                              <div className="font-medium">
                                {globalPrimary.title}
                              </div>
                              {globalPrimary.subtitle && (
                                <div className="text-amber-700">
                                  {globalPrimary.subtitle}
                                </div>
                              )}
                              <div className="mt-1">
                                {editionDisplay} •{' '}
                                {EditionDetectionService.normalizeBindingType(
                                  globalPrimary.print_type ||
                                    globalPrimary.binding,
                                )}{' '}
                                • {globalPrimary.publisher}
                              </div>
                              <div className="mt-1 text-xs text-amber-600">
                                Selected from {editionGroups.length} edition
                                {editionGroups.length !== 1 ? 's' : ''} •{' '}
                                {globalPrimary.isbn &&
                                  `ISBN: ${globalPrimary.isbn}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Edition Summary */}
                    <div className="text-muted-foreground mb-4 text-sm">
                      Found {editionGroups.length} edition
                      {editionGroups.length !== 1 ? 's' : ''} with{' '}
                      {editionGroups.reduce(
                        (total, edition) => total + edition.books.length,
                        0,
                      )}{' '}
                      total books. The most recent edition ({editionDisplay})
                      will be added to your collection.
                    </div>

                    {/* Single Add Book Button */}
                    <div className="flex justify-center">
                      <Button
                        onClick={handleAddBook}
                        disabled={isLoading || !globalPrimary}
                        type="button"
                        aria-busy={isLoading}
                        size="lg"
                        className="px-8"
                      >
                        {isLoading ? 'Adding...' : 'Add Book to Collection'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
