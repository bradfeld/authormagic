import { NextRequest, NextResponse } from 'next/server';

import { BookDataMergerService } from '@/lib/services/book-data-merger.service';
import { EditionDetectionService } from '@/lib/services/edition-detection.service';
import { GoogleBooksService } from '@/lib/services/google-books.service';
import { isbnDbService } from '@/lib/services/isbn-db.service';
import { ISBNDBBookResponse } from '@/lib/types/api';
import { convertISBNDBToUIBook, UIBook } from '@/lib/types/ui-book';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ isbn: string }> },
): Promise<NextResponse> {
  const { isbn } = await params;

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
  }

  try {
    // Initialize Google Books service
    const googleBooksService = new GoogleBooksService();

    // Search both APIs in parallel for better coverage
    const [isbndbResult, googleBooksResult] = await Promise.allSettled([
      searchISBNDB(isbn.trim()),
      searchGoogleBooks(googleBooksService, isbn.trim()),
    ]);

    // Extract successful results
    const isbndbBooks =
      isbndbResult.status === 'fulfilled' && isbndbResult.value.success
        ? isbndbResult.value.books
        : [];

    const googleBooksBooks =
      googleBooksResult.status === 'fulfilled' &&
      googleBooksResult.value.success
        ? googleBooksResult.value.data || []
        : [];

    // Merge and deduplicate results
    const mergedResults = BookDataMergerService.mergeBookResults(
      isbndbBooks,
      googleBooksBooks,
    );

    if (mergedResults.books.length === 0) {
      return NextResponse.json(
        { error: 'No books found for this ISBN' },
        { status: 404 },
      );
    }

    // Group books by edition for better organization
    const editionGroups = EditionDetectionService.groupByEdition(
      mergedResults.books,
    );

    return NextResponse.json({
      books: mergedResults.books,
      editionGroups,
      sources: mergedResults.sources,
      isbn,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to search ISBNDB
async function searchISBNDB(isbn: string): Promise<{
  success: boolean;
  books: UIBook[];
  error?: string;
}> {
  try {
    const response = await isbnDbService.getBookByISBN(isbn);

    if (!response.success || !response.data) {
      return { success: false, books: [], error: response.error };
    }

    const books = Array.isArray(response.data)
      ? response.data.map(convertISBNDBToUIBook)
      : [convertISBNDBToUIBook(response.data as ISBNDBBookResponse)];

    return { success: true, books };
  } catch (error) {
    return {
      success: false,
      books: [],
      error: error instanceof Error ? error.message : 'ISBNDB search failed',
    };
  }
}

// Helper function to search Google Books
async function searchGoogleBooks(
  googleBooksService: GoogleBooksService,
  isbn: string,
): Promise<{
  success: boolean;
  data: UIBook[];
  error?: string;
}> {
  try {
    const response = await googleBooksService.searchBooks(isbn);
    return {
      success: response.success,
      data: response.data || [],
      error: response.error,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error:
        error instanceof Error ? error.message : 'Google Books search failed',
    };
  }
}
