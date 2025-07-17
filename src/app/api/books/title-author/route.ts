import { NextRequest, NextResponse } from 'next/server';

import { EditionDetectionService } from '@/lib/services/edition-detection.service';
import { isbnDbService } from '@/lib/services/isbn-db.service';
import { convertISBNDBToUIBook } from '@/lib/types/ui-book';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const author = searchParams.get('author');

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Both title and author parameters are required' },
        { status: 400 },
      );
    }

    // Progressive search strategy for better ISBNDB API coverage
    let result = await isbnDbService.searchBooksByTitle(title.trim(), 1, 50);

    // If we get few results, try enhanced search terms
    if (result.success && result.data && result.data.length < 8) {
      // Try with common subtitle patterns for this specific book
      const enhancedSearches = [
        `${title.trim()} surviving thriving`,
        `${title.trim()} relationship entrepreneur`,
        `${title.trim()} surviving`,
        `${title.trim()} thriving`,
      ];

      for (const searchTerm of enhancedSearches) {
        const enhancedResult = await isbnDbService.searchBooksByTitle(
          searchTerm,
          1,
          50,
        );
        if (
          enhancedResult.success &&
          enhancedResult.data &&
          enhancedResult.data.length > result.data.length
        ) {
          result = enhancedResult;
          break; // Use the first better result
        }
      }
    }

    if (result.success && result.data) {
      // Convert ISBNDB response to UIBook format
      const uiBooks = result.data.map(convertISBNDBToUIBook);

      // Restore proper filtering with title and author validation
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const removeStopWords = (s: string) =>
        s.replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/g, '');

      const inputTitle = normalize(removeStopWords(title.trim()));
      const inputAuthor = normalize(author.trim());

      const filteredBooks = uiBooks.filter(book => {
        // Title matching - check core title words are present
        const bookTitle = normalize(removeStopWords(book.title || ''));
        const titleMatch =
          bookTitle.includes(inputTitle) || inputTitle.includes(bookTitle);

        if (!titleMatch) return false;

        // Author matching - check if any part matches
        const authorMatch = (book.authors || []).some(a => {
          const normA = normalize(a);
          return normA.includes(inputAuthor) || inputAuthor.includes(normA);
        });

        return titleMatch && authorMatch;
      });

      // Group and consolidate editions/bindings
      const editionGroups =
        EditionDetectionService.groupByEdition(filteredBooks);

      return NextResponse.json({
        success: true,
        editionGroups, // Return grouped data as primary structure
        books: filteredBooks, // Keep flat array for backward compatibility
        source: 'isbndb',
        total: filteredBooks.length,
        searchParams: {
          title: title.trim() || null,
          author: author.trim() || null,
        },
      });
    } else {
      // If the search succeeded but no books were found, return 200 with empty array
      if (
        result.success &&
        Array.isArray(result.data) &&
        result.data.length === 0
      ) {
        return NextResponse.json({
          success: true,
          editionGroups: [],
          books: [],
          source: 'isbndb',
          total: 0,
          searchParams: {
            title: title.trim() || null,
            author: author.trim() || null,
          },
        });
      }
      // If the search failed, return 500 with error message
      return NextResponse.json(
        { error: result.error || 'No books found' },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
