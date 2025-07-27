import { NextRequest, NextResponse } from 'next/server';

import { BookDataMergerService } from '@/lib/services/book-data-merger.service';
import { EditionDetectionService } from '@/lib/services/edition-detection.service';
import { GoogleBooksService } from '@/lib/services/google-books.service';
import { ImageEnhancementQueueService } from '@/lib/services/image-enhancement-queue.service';
import { isbnDbService } from '@/lib/services/isbn-db.service';
import { ISBNDBBookResponse } from '@/lib/types/api';
import { convertISBNDBToUIBook, UIBook } from '@/lib/types/ui-book';

// Development logging helper
const devLog = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message);
  }
};

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const timings: { [step: string]: number } = {};

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

    devLog(`🔍 PERF: Starting search for "${title}" by "${author}"`);

    // Initialize Google Books service
    const googleBooksService = new GoogleBooksService();

    // Search both APIs in parallel for better coverage
    const apiSearchStart = performance.now();
    const [isbndbResult, googleBooksResult] = await Promise.allSettled([
      searchISBNDB(title.trim(), author.trim()),
      searchGoogleBooks(googleBooksService, title.trim(), author.trim()),
    ]);
    timings.apiSearch = performance.now() - apiSearchStart;

    // Extract successful results
    const extractStart = performance.now();
    const isbndbBooks =
      isbndbResult.status === 'fulfilled' && isbndbResult.value.success
        ? isbndbResult.value.books
        : [];

    const googleBooksBooks =
      googleBooksResult.status === 'fulfilled' &&
      googleBooksResult.value.success
        ? googleBooksResult.value.data || []
        : [];
    timings.extraction = performance.now() - extractStart;

    devLog(
      `📊 PERF: Found ${isbndbBooks.length} ISBNDB + ${googleBooksBooks.length} Google Books = ${isbndbBooks.length + googleBooksBooks.length} total books`,
    );

    // Merge and deduplicate results
    const mergeStart = performance.now();
    const mergedResults = BookDataMergerService.mergeBookResults(
      isbndbBooks,
      googleBooksBooks,
    );
    timings.merging = performance.now() - mergeStart;

    // Apply final filtering to merged results
    const filterStart = performance.now();
    const filteredBooks = filterBooksByTitleAuthor(
      mergedResults.books,
      title.trim(),
      author.trim(),
    );
    timings.filtering = performance.now() - filterStart;

    devLog(`🔍 PERF: Filtered to ${filteredBooks.length} relevant books`);

    // Apply binding corrections to filtered books
    const correctionStart = performance.now();
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
    timings.corrections = performance.now() - correctionStart;

    // Group books by edition FIRST to identify primary books for enhancement
    const preEditionStart = performance.now();
    const preliminaryEditionGroups =
      EditionDetectionService.groupByEdition(correctedBooks);

    // Extract primary book from each edition group (hardcover priority, then latest edition)
    const primaryBooks: UIBook[] = [];
    const secondaryBooks: UIBook[] = [];

    // Helper function to detect primary book within an edition group
    const detectPrimaryBook = (books: UIBook[]): UIBook | null => {
      if (!books || books.length === 0) return null;

      // Priority order: hardcover → paperback → kindle → ebook → audiobook → others
      const bindingPriority = [
        'hardcover',
        'paperback',
        'kindle',
        'ebook',
        'audiobook',
      ];

      // Group books by normalized binding type
      const bindingGroups: { [binding: string]: UIBook[] } = {};
      books.forEach(book => {
        const binding = EditionDetectionService.normalizeBindingType(
          book.print_type || book.binding,
        );
        if (!bindingGroups[binding]) bindingGroups[binding] = [];
        bindingGroups[binding].push(book);
      });

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

    preliminaryEditionGroups.forEach(group => {
      if (group.books && group.books.length > 0) {
        // Get the primary book using binding hierarchy
        const primaryBook = detectPrimaryBook(group.books);

        if (primaryBook) {
          primaryBooks.push(primaryBook);
          // Add remaining books as secondary
          secondaryBooks.push(
            ...group.books.filter(book => book !== primaryBook),
          );
        }
      }
    });

    devLog(
      `📚 PRE-EDITION: Found ${preliminaryEditionGroups.length} edition groups → ${primaryBooks.length} primary books to enhance`,
    );
    const preEditionTime = performance.now() - preEditionStart;

    // Enhance ONLY primary books from each edition group (typically 1-4 books vs 10-44)
    // PERFORMANCE OPTIMIZATION: Focus on hierarchy-important books
    const enhancementStart = performance.now();

    devLog(
      `📈 ENHANCEMENT: Processing ${primaryBooks.length} primary books (${secondaryBooks.length} secondary books will be skipped)`,
    );

    let enhancedPrimaryBooks: UIBook[];

    try {
      // Add 5-second timeout for entire enhancement process
      const enhancementPromise = Promise.all(
        primaryBooks.map(async book => {
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
            } catch {
              // If direct lookup fails, continue with original book data
              // Failed to enhance book metadata - using existing data
            }
          }
          return book;
        }),
      );

      // Race enhancement against 5-second timeout
      const timeoutPromise = new Promise<UIBook[]>((_, reject) =>
        setTimeout(() => reject(new Error('Enhancement timeout')), 5000),
      );

      enhancedPrimaryBooks = await Promise.race([
        enhancementPromise,
        timeoutPromise,
      ]);

      devLog(
        `📈 ENHANCEMENT: Successfully enhanced ${enhancedPrimaryBooks.length} primary books in ${(performance.now() - enhancementStart).toFixed(2)}ms`,
      );
    } catch {
      // If enhancement times out or fails, use original primary books
      if (process.env.NODE_ENV === 'development') {
        devLog(
          `⚠️ ENHANCEMENT: Timeout or error, using original primary books (${(performance.now() - enhancementStart).toFixed(2)}ms)`,
        );
      }
      enhancedPrimaryBooks = primaryBooks; // Use original primary books without enhancement
    }

    // Combine enhanced primary books with unenhanced secondary books
    const enhancedBooks = [...enhancedPrimaryBooks, ...secondaryBooks];

    timings.enhancement = performance.now() - enhancementStart;
    timings.preEdition = preEditionTime;

    // Validate books using Google Books API (optional - can be enabled via query param)
    const enableValidation = searchParams.get('validate') === 'true';
    let finalBooks: UIBook[] = enhancedBooks;

    if (enableValidation) {
      const validationStart = performance.now();
      try {
        finalBooks = (await BookDataMergerService.validateBooks(
          enhancedBooks,
        )) as UIBook[];
        // Optionally filter out low-confidence books
        if (searchParams.get('filter_unverified') === 'true') {
          const minConfidence = parseFloat(
            searchParams.get('min_confidence') || '0.6',
          );
          finalBooks = BookDataMergerService.filterValidatedBooks(
            finalBooks,
            minConfidence,
          );
        }
        timings.validation = performance.now() - validationStart;
      } catch (error) {
        timings.validation = performance.now() - validationStart;
        // eslint-disable-next-line no-console
        console.error('Book validation failed:', error);
        // Continue with unvalidated books if validation fails
      }
    }

    // Group and consolidate editions/bindings using existing algorithm
    const editionStart = performance.now();
    const editionGroups = EditionDetectionService.groupByEdition(finalBooks);
    timings.editionDetection = performance.now() - editionStart;

    // PHASE 2: Background Image Enhancement Queue Integration
    const queueStart = performance.now();
    try {
      // Apply previously enhanced images from background processing
      const booksWithEnhancedImages =
        await ImageEnhancementQueueService.applyEnhancedImages(finalBooks);

      // Find secondary books that still need image enhancement (didn't get enhanced in primary processing)
      const secondaryBooks = booksWithEnhancedImages.filter(
        book => !book.image && book.isbn,
      );

      if (secondaryBooks.length > 0) {
        // Queue secondary books for background enhancement
        const queueResult = await ImageEnhancementQueueService.enqueueBooks(
          secondaryBooks,
          { title: title.trim(), author: author?.trim() },
          `search-${Date.now()}`, // Simple parent search ID
        );

        devLog(
          `📤 QUEUE: Added ${queueResult.queued} secondary books to enhancement queue (${queueResult.skipped} skipped, ${queueResult.errors.length} errors)`,
        );
      }

      // Update finalBooks with any enhanced images that were applied
      finalBooks = booksWithEnhancedImages;

      // Re-group editions with potentially updated images
      const updatedEditionGroups =
        EditionDetectionService.groupByEdition(finalBooks);
      // Use updated groups for response
      editionGroups.splice(0, editionGroups.length, ...updatedEditionGroups);
    } catch {
      // Continue with original books if queue fails - don't break the main flow
      // Continue silently if queue fails - don't break the main flow
    }
    timings.queue = performance.now() - queueStart;

    timings.total = performance.now() - startTime;

    // Log detailed performance breakdown
    devLog(`⚡ PERF BREAKDOWN for "${title}":
📊 Total Time: ${timings.total.toFixed(2)}ms
🔄 API Search: ${timings.apiSearch.toFixed(2)}ms (${((timings.apiSearch / timings.total) * 100).toFixed(1)}%)
📝 Extraction: ${timings.extraction.toFixed(2)}ms (${((timings.extraction / timings.total) * 100).toFixed(1)}%)
🔀 Merging: ${timings.merging.toFixed(2)}ms (${((timings.merging / timings.total) * 100).toFixed(1)}%)
🔍 Filtering: ${timings.filtering.toFixed(2)}ms (${((timings.filtering / timings.total) * 100).toFixed(1)}%)
🔧 Corrections: ${timings.corrections.toFixed(2)}ms (${((timings.corrections / timings.total) * 100).toFixed(1)}%)
📊 Pre-Edition: ${timings.preEdition.toFixed(2)}ms (${((timings.preEdition / timings.total) * 100).toFixed(1)}%)
📈 Enhancement: ${timings.enhancement.toFixed(2)}ms (${((timings.enhancement / timings.total) * 100).toFixed(1)}%)
${enableValidation ? `✅ Validation: ${timings.validation.toFixed(2)}ms (${((timings.validation / timings.total) * 100).toFixed(1)}%)` : '❌ Validation: Disabled'}
📚 Edition Detection: ${timings.editionDetection.toFixed(2)}ms (${((timings.editionDetection / timings.total) * 100).toFixed(1)}%)
📤 Queue Integration: ${timings.queue.toFixed(2)}ms (${((timings.queue / timings.total) * 100).toFixed(1)}%)
🎯 Final Results: ${editionGroups.length} edition groups, ${finalBooks.length} books`);

    return NextResponse.json({
      success: true,
      editionGroups, // Return grouped data as primary structure
      books: finalBooks, // Keep flat array for backward compatibility (now potentially validated)
      sources: mergedResults.sources, // Include source statistics
      total: finalBooks.length,
      validation: enableValidation
        ? {
            enabled: true,
            filtered: searchParams.get('filter_unverified') === 'true',
            originalCount: enhancedBooks.length,
            finalCount: finalBooks.length,
          }
        : { enabled: false },
      searchParams: {
        title: title.trim() || null,
        author: author.trim() || null,
        validate: enableValidation,
        filter_unverified: searchParams.get('filter_unverified') === 'true',
      },
      // Include performance data for debugging
      performance: {
        totalMs: parseFloat(timings.total.toFixed(2)),
        breakdown: {
          apiSearchMs: parseFloat(timings.apiSearch.toFixed(2)),
          mergingMs: parseFloat(timings.merging.toFixed(2)),
          filteringMs: parseFloat(timings.filtering.toFixed(2)),
          correctionsMs: parseFloat(timings.corrections.toFixed(2)),
          preEditionMs: parseFloat(timings.preEdition.toFixed(2)),
          enhancementMs: parseFloat(timings.enhancement.toFixed(2)),
          validationMs: enableValidation
            ? parseFloat(timings.validation.toFixed(2))
            : 0,
          editionDetectionMs: parseFloat(timings.editionDetection.toFixed(2)),
          queueMs: parseFloat(timings.queue.toFixed(2)),
        },
      },
    });
  } catch {
    const totalTime = performance.now() - startTime;
    devLog(`❌ PERF: Search failed after ${totalTime.toFixed(2)}ms`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function for ISBNDB search with optimized parallel strategy
async function searchISBNDB(title: string, author?: string) {
  const searchStart = performance.now();
  devLog(`🔍 ISBNDB: Starting search for "${title}" by "${author}"`);

  const allResults = new Map<string, ISBNDBBookResponse>(); // Use Map to deduplicate by ISBN

  // Enhanced parallel strategy: run multiple search approaches simultaneously
  const searchPromises = [];

  // Strategy 1: Direct title searches (run in parallel)
  const titleSearches = [
    title, // "Startup Life"
    `"${title}"`, // Quoted search
    `${title} surviving`, // With common subtitle words
    `${title} relationship`,
    `${title} entrepreneur`,
  ];

  titleSearches.forEach(searchTerm => {
    searchPromises.push(
      isbnDbService
        .searchBooksByTitle(searchTerm, 1, 30)
        .catch(() => ({ success: false, data: [] })),
    );
  });

  // Strategy 2: Author-specific searches (if we have author)
  if (author) {
    searchPromises.push(
      isbnDbService
        .searchTitleAuthor(title, author, 1, 50)
        .catch(() => ({ success: false, data: [] })),
      isbnDbService
        .searchBooksByTitle(`"${title}" "${author}"`, 1, 30)
        .catch(() => ({ success: false, data: [] })),
      isbnDbService
        .searchBooksByTitle(`${title} ${author}`, 1, 30)
        .catch(() => ({ success: false, data: [] })),
    );
  }

  // Execute all searches in parallel with timeout protection
  const promiseStart = performance.now();
  const results = await Promise.allSettled(
    searchPromises.map(promise =>
      Promise.race([
        promise,
        new Promise(
          (_, reject) =>
            setTimeout(() => reject(new Error('Search timeout')), 8000), // 8 second total timeout
        ),
      ]),
    ),
  );
  const promiseTime = performance.now() - promiseStart;

  // Collect all successful results
  let successfulResults = 0;
  let failedResults = 0;

  results.forEach(result => {
    if (
      result.status === 'fulfilled' &&
      result.value &&
      typeof result.value === 'object' &&
      'success' in result.value &&
      result.value.success &&
      'data' in result.value &&
      Array.isArray(result.value.data)
    ) {
      successfulResults++;
      result.value.data.forEach((book: ISBNDBBookResponse) => {
        if (book.isbn) {
          allResults.set(book.isbn, book);
        }
      });
    } else {
      failedResults++;
    }
  });

  const uniqueBooks = Array.from(allResults.values());
  const totalTime = performance.now() - searchStart;

  devLog(
    `📊 ISBNDB Results: ${uniqueBooks.length} unique books from ${successfulResults}/${searchPromises.length} successful searches (${failedResults} failed) in ${totalTime.toFixed(2)}ms (${promiseTime.toFixed(2)}ms for parallel execution)`,
  );

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
  const searchStart = performance.now();
  devLog(`📖 GOOGLE BOOKS: Starting search for "${title}" by "${author}"`);

  if (!service.isAvailable()) {
    devLog(`❌ GOOGLE BOOKS: Service not available`);
    return {
      success: false,
      data: [],
      error: 'Google Books API not configured',
    };
  }

  const result = await service.searchBooks(title, author);
  const totalTime = performance.now() - searchStart;

  const resultCount = result.success && result.data ? result.data.length : 0;
  devLog(
    `📖 GOOGLE BOOKS: Found ${resultCount} books in ${totalTime.toFixed(2)}ms`,
  );

  return result;
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
