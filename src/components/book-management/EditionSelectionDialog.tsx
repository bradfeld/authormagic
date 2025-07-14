'use client';

import { useUser } from '@clerk/nextjs';
import {
  Search,
  Loader2,
  BookOpen,
  Calendar,
  Building,
  Languages,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  EditionDetectionService,
  EditionGroup,
} from '@/lib/services/edition-detection.service';
import { PrimaryBookService } from '@/lib/services/primary-book.service';
import { UIBook } from '@/lib/types/ui-book';

interface EditionSelectionDialogProps {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAdded?: () => void;
}

export function EditionSelectionDialog({
  children,
  isOpen,
  onOpenChange,
  onBookAdded,
}: EditionSelectionDialogProps) {
  const { user } = useUser();
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [searchResults, setSearchResults] = useState<UIBook[]>([]);
  const [editionGroups, setEditionGroups] = useState<EditionGroup[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<EditionGroup | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // const [searchType, setSearchType] = useState<'title-author' | 'isbn'>('title-author'); // TODO: Implement search type selection
  const [searchError, setSearchError] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'select-edition'>('search');

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
    setEditionGroups([]);

    try {
      let groups: EditionGroup[] = [];

      // Auto-detect if input looks like ISBN
      const isISBN =
        /^(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-\s])*[0-9X]$)(?:[0-9]{1,5}[-\s]?){1,7}[0-9X]$)/i.test(
          bookTitle.trim(),
        );

      if (isISBN) {
        // setSearchType('isbn'); // TODO: Implement search type selection
        const response = await fetch(
          `/api/books/isbn/${encodeURIComponent(bookTitle.trim())}`,
        );

        if (!response.ok) {
          throw new Error('Failed to search by ISBN');
        }

        const result = await response.json();
        const books = result.books || [];
        setSearchResults(books);

        // Group results by edition for ISBN search
        groups = EditionDetectionService.groupByEdition(books);
        setEditionGroups(groups);
      } else {
        // setSearchType('title-author'); // TODO: Implement search type selection
        const queryParams = new URLSearchParams();
        if (bookTitle.trim()) queryParams.append('title', bookTitle.trim());
        if (author.trim()) queryParams.append('author', author.trim());

        const response = await fetch(`/api/books/title-author?${queryParams}`);

        if (!response.ok) {
          throw new Error('Failed to search books');
        }

        const result = await response.json();
        const books = result.books || [];
        setSearchResults(books);

        // Group results by edition for title-author search
        groups = EditionDetectionService.groupByEdition(books);
        setEditionGroups(groups);
      }

      // If only one edition, auto-select it
      if (groups.length === 1) {
        setSelectedEdition(groups[0]);
      }

      // Move to edition selection step
      setStep('select-edition');
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

  const handleCreatePrimaryBook = async () => {
    if (!user || !selectedEdition) return;

    setIsSaving(true);
    try {
      // Check if user already has this book
      const existing = await PrimaryBookService.findExistingPrimaryBook(
        user.id,
        bookTitle,
        author,
      );

      if (existing) {
        setSearchError('You already have this book in your library');
        return;
      }

      // Create primary book with selected edition
      await PrimaryBookService.createPrimaryBook(
        user.id,
        bookTitle,
        author,
        selectedEdition.books,
        selectedEdition.edition_number,
      );

      // Clear search and close dialog
      clearSearch();
      onOpenChange(false);

      // Refresh the book list
      if (onBookAdded) {
        onBookAdded();
      }
    } catch (error) {
      console.error('Error creating primary book:', error);
      setSearchError('Failed to add book. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearSearch = () => {
    setBookTitle('');
    setAuthor('');
    setSearchResults([]);
    setEditionGroups([]);
    setSelectedEdition(null);
    setSearchError(null);
    // setSearchType('title-author'); // TODO: Implement search type selection
    setStep('search');
  };

  const goBackToSearch = () => {
    setStep('search');
    setSelectedEdition(null);
    setSearchError(null);
  };

  // Removed color coding - all badges use default styling
  const formatBindingType = (binding: string) => {
    if (!binding || binding.toLowerCase() === 'unknown') {
      return 'Not specified';
    }
    return binding;
  };

  const groupBindings = (books: UIBook[]) => {
    const bindingGroups = new Map<string, UIBook[]>();

    books.forEach(book => {
      const formattedBinding = formatBindingType(book.print_type || 'unknown');
      if (!bindingGroups.has(formattedBinding)) {
        bindingGroups.set(formattedBinding, []);
      }
      bindingGroups.get(formattedBinding)!.push(book);
    });

    return bindingGroups;
  };

  const renderSearchStep = () => (
    <div className="space-y-6">
      {/* Search Interface */}
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

        <div className="flex justify-end">
          <Button
            onClick={handleUnifiedSearch}
            disabled={isLoading || (!bookTitle.trim() && !author.trim())}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Books
              </>
            )}
          </Button>
        </div>
      </div>

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
  );

  const renderEditionSelectionStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Primary Edition</h3>
          <p className="text-sm text-muted-foreground">
            Choose which edition to add as your primary book
          </p>
        </div>
        <Button variant="outline" onClick={goBackToSearch}>
          Back to Search
        </Button>
      </div>

      {/* Edition Groups */}
      {editionGroups.length > 0 && (
        <div className="space-y-4">
          {editionGroups.map((edition, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedEdition === edition
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedEdition(edition)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium">
                      {EditionDetectionService.getEditionDisplayName(edition)}
                    </h4>
                    {selectedEdition === edition && (
                      <Badge variant="secondary">Selected</Badge>
                    )}
                  </div>

                  {/* Edition Info */}
                  <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                    {edition.publication_year && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{edition.publication_year}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span>
                        {edition.books.length} book
                        {edition.books.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Bindings */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Available Bindings:</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(groupBindings(edition.books)).map(
                        ([bindingType, books]) => (
                          <Badge key={bindingType} variant="outline">
                            {books.length > 1
                              ? `${bindingType} (${books.length})`
                              : bindingType}
                            {books[0].msrp && (
                              <span className="ml-1 opacity-70">
                                ${books[0].msrp}
                              </span>
                            )}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Sample Book Details */}
                  {edition.books[0] && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {edition.books[0].publisher && (
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            <span>{edition.books[0].publisher}</span>
                          </div>
                        )}
                        {edition.books[0].pages && (
                          <span>{edition.books[0].pages} pages</span>
                        )}
                        {edition.books[0].language && (
                          <div className="flex items-center gap-1">
                            <Languages className="w-3 h-3" />
                            <span>{edition.books[0].language}</span>
                          </div>
                        )}
                      </div>

                      {edition.books[0].description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {edition.books[0].description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={clearSearch}>
          Clear Search
        </Button>
        <Button
          onClick={handleCreatePrimaryBook}
          disabled={!selectedEdition || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Adding...
            </>
          ) : (
            `Add ${selectedEdition ? EditionDetectionService.getEditionDisplayName(selectedEdition) : 'Edition'}`
          )}
        </Button>
      </div>

      {/* Search Error Display */}
      {searchError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-sm text-destructive">{searchError}</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' ? 'Add New Book' : 'Select Primary Edition'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' ? renderSearchStep() : renderEditionSelectionStep()}
      </DialogContent>
    </Dialog>
  );
}
