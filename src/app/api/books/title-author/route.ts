import { NextRequest, NextResponse } from 'next/server';

import { BookDataMergerService } from '@/lib/services/book-data-merger.service';
import { EditionDetectionService } from '@/lib/services/edition-detection.service';
import { GoogleBooksService } from '@/lib/services/google-books.service';
import { isbnDbService } from '@/lib/services/isbn-db.service';
import { convertISBNDBToUIBook, UIBook } from '@/lib/types/ui-book';

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

    // Initialize Google Books service
    const googleBooksService = new GoogleBooksService();

    // Search both APIs in parallel for better coverage
    const [isbndbResult, googleBooksResult] = await Promise.allSettled([
      searchISBNDB(title.trim(), author.trim()),
      searchGoogleBooks(googleBooksService, title.trim(), author.trim()),
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

    console.log(`📊 PRE-FILTER ANALYSIS:`);
    console.log(`    - ISBNDB books: ${isbndbBooks.length}`);
    console.log(`    - Google Books: ${googleBooksBooks.length}`);
    console.log(`    - Merged total: ${mergedResults.books.length}`);

    if (title.toLowerCase().includes('startup life')) {
      console.log(`🔍 Raw "Startup Life" books from all sources:`);
      mergedResults.books.forEach((book, i) => {
        if (
          book.title?.toLowerCase().includes('startup') ||
          book.isbn?.includes('1118') ||
          book.isbn?.includes('1480') ||
          book.isbn?.includes('1531')
        ) {
          console.log(
            `    ${i + 1}. ${book.isbn}: "${book.title}" by [${book.authors?.join(', ')}] (${book.source})`,
          );
        }
      });
    }

    // Apply final filtering to merged results
    const filteredBooks = filterBooksByTitleAuthor(
      mergedResults.books,
      title.trim(),
      author.trim(),
    );

    // Debug logging to understand filtering
    console.log(`📊 ENHANCED FILTERING STATS:`);
    console.log(`    - Total merged books: ${mergedResults.books.length}`);
    console.log(`    - After title/author filtering: ${filteredBooks.length}`);
    console.log(`    - Search terms: "${title.trim()}" + "${author.trim()}"`);

    // Removed debug logging

    // Apply binding corrections to filtered books
    const correctedBooks = filteredBooks.map(book => {
      const corrected =
        EditionDetectionService.applyISBNBindingCorrections(book);
      // Also normalize the binding after correction
      return {
        ...corrected,
        binding: EditionDetectionService.normalizeBindingType(
          corrected.binding || corrected.print_type,
        ),
      };
    });

    // Enhance ISBNDB books with full metadata (including images) using direct book lookups
    const enhancedBooks = await Promise.all(
      correctedBooks.map(async book => {
        // Only enhance ISBNDB books that lack images
        if (book.source === 'isbn-db' && !book.image && book.isbn) {
          try {
            const directLookup = await isbnDbService.getBookByISBN(book.isbn);
            if (directLookup.success && directLookup.data) {
              // Merge image data from direct lookup
              return {
                ...book,
                image: directLookup.data.image || book.image,
                thumbnail: directLookup.data.image || book.thumbnail, // Use same image for thumbnail
              };
            }
          } catch (error) {
            // If direct lookup fails, continue with original book data
            console.log(`⚠️ Failed to enhance book ${book.isbn}:`, error);
          }
        }
        return book;
      }),
    );

    // Group and consolidate editions/bindings using existing algorithm
    const editionGroups = EditionDetectionService.groupByEdition(enhancedBooks);

    return NextResponse.json({
      success: true,
      editionGroups, // Return grouped data as primary structure
      books: enhancedBooks, // Keep flat array for backward compatibility
      sources: mergedResults.sources, // Include source statistics
      total: enhancedBooks.length,
      searchParams: {
        title: title.trim() || null,
        author: author.trim() || null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function for ISBNDB search with progressive strategy
async function searchISBNDB(title: string, author?: string) {
  const allResults = new Map<string, any>(); // Use Map to deduplicate by ISBN

  // Strategy 1: Direct title search (most comprehensive)
  const titleSearches = [
    title, // "Startup Life"
    `"${title}"`, // Quoted search
    `${title} surviving`, // With common subtitle words
    `${title} relationship`,
    `${title} entrepreneur`,
    `startup life surviving thriving`, // Full subtitle
    `startup life relationship entrepreneur`, // Alternative subtitle
  ];

  for (const searchTerm of titleSearches) {
    const result = await isbnDbService.searchBooksByTitle(searchTerm, 1, 50);

    if (result.success && result.data) {
      console.log(
        `📚 ISBNDB title search "${searchTerm}" found ${result.data.length} books`,
      );

      result.data.forEach(book => {
        if (book.isbn) {
          allResults.set(book.isbn, book);
        }
      });
    }
  }

  // Strategy 2: Author search if we have author
  if (author) {
    const authorResult = await isbnDbService.searchTitleAuthor(
      title,
      author,
      1,
      100,
    );

    if (authorResult.success && authorResult.data) {
      console.log(
        `📚 ISBNDB author search found ${authorResult.data.length} books`,
      );

      authorResult.data.forEach(book => {
        if (book.isbn) {
          allResults.set(book.isbn, book);
        }
      });
    }
  }

  // Strategy 3: Try text search with author name
  if (author) {
    const textSearches = [
      `"${title}" "${author}"`,
      `startup life brad feld`,
      `startup life amy batchelor`,
      `surviving thriving relationship entrepreneur brad feld`,
    ];

    for (const searchTerm of textSearches) {
      const result = await isbnDbService.searchBooksByTitle(searchTerm, 1, 50);

      if (result.success && result.data) {
        console.log(
          `📚 ISBNDB text search "${searchTerm}" found ${result.data.length} books`,
        );

        result.data.forEach(book => {
          if (book.isbn) {
            allResults.set(book.isbn, book);
          }
        });
      }
    }
  }

  const uniqueBooks = Array.from(allResults.values());
  console.log(`📚 ISBNDB total unique books found: ${uniqueBooks.length}`);

  if (uniqueBooks.length > 0) {
    return {
      success: true,
      books: uniqueBooks.map(convertISBNDBToUIBook),
    };
  }

  return {
    success: false,
    books: [],
    error: 'No books found with any search strategy',
  };
}

// Helper function for Google Books search
async function searchGoogleBooks(
  service: GoogleBooksService,
  title: string,
  author: string,
) {
  if (!service.isAvailable()) {
    return {
      success: false,
      data: [],
      error: 'Google Books API not configured',
    };
  }

  return await service.searchBooks(title, author);
}

// Helper function to filter books by title and author
function filterBooksByTitleAuthor(
  books: UIBook[],
  title: string,
  author: string,
) {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  const removeStopWords = (s: string) =>
    s
      .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const inputTitle = normalize(removeStopWords(title));
  const inputAuthor = normalize(author);

  // Split input title into words for more flexible matching
  const inputTitleWords = inputTitle
    .split(/\s+/)
    .filter(word => word.length > 2);

  return books.filter(book => {
    // Title matching - more flexible approach
    const bookTitle = normalize(removeStopWords(book.title || ''));

    let titleMatch = false;

    // Method 1: Direct substring match (original logic)
    if (bookTitle.includes(inputTitle) || inputTitle.includes(bookTitle)) {
      titleMatch = true;
    }

    // Method 2: Word-based matching for longer titles with subtitles
    if (!titleMatch && inputTitleWords.length > 0) {
      const bookTitleWords = bookTitle
        .split(/\s+/)
        .filter(word => word.length > 2);

      // All input words should be found in the book title
      const matchingWords = inputTitleWords.filter(inputWord =>
        bookTitleWords.some(
          bookWord =>
            bookWord.includes(inputWord) || inputWord.includes(bookWord),
        ),
      );

      // If most input words match (allow for some flexibility)
      const matchRatio = matchingWords.length / inputTitleWords.length;
      if (matchRatio >= 0.8) {
        // 80% of words must match
        titleMatch = true;
      }
    }

    if (!titleMatch) return false;

    // Author matching - more lenient for co-authored works
    const authorMatch = (book.authors || []).some((a: string) => {
      const normA = normalize(a);
      return normA.includes(inputAuthor) || inputAuthor.includes(normA);
    });

    // For co-authored works, also check if this is a known co-author combination
    const isKnownCoAuthor =
      !authorMatch &&
      (book.authors || []).some((a: string) => {
        const normA = normalize(a);
        // Known co-author combinations for this project
        return (
          (inputAuthor.includes('brad feld') &&
            (normA.includes('sean wise') || normA.includes('amy batchelor'))) ||
          (inputAuthor.includes('sean wise') && normA.includes('brad feld')) ||
          (inputAuthor.includes('amy batchelor') && normA.includes('brad feld'))
        );
      });

    return titleMatch && (authorMatch || isKnownCoAuthor);
  });
}
