import { NextRequest, NextResponse } from 'next/server';

import { BookDataMergerService } from '@/lib/services/book-data-merger.service';
import { BookEnrichmentService } from '@/lib/services/book-enrichment.service';
import { EditionDetectionService } from '@/lib/services/edition-detection.service';
import { GoogleBooksService } from '@/lib/services/google-books.service';
import { ImageEnhancementQueueService } from '@/lib/services/image-enhancement-queue.service';
import { isbnDbService } from '@/lib/services/isbn-db.service';
import { itunesSearchService } from '@/lib/services/itunes-search.service';
import { SmartEnhancementService } from '@/lib/services/smart-enhancement.service';
import { ISBNDBBookResponse } from '@/lib/types/api';
import { convertISBNDBToUIBook, UIBook } from '@/lib/types/ui-book';
import { extractUniqueISBNs } from '@/lib/utils/isbn-extractor';

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const timings: { [step: string]: number } = {};

  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const author = searchParams.get('author');
    const useEnriched = searchParams.get('enriched') === 'true';

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Both title and author parameters are required' },
        { status: 400 },
      );
    }

    // Use new enriched flow if requested
    if (useEnriched) {
      return await handleEnrichedSearchFlow(
        request,
        title,
        author,
        timings,
        startTime,
      );
    }

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

    // Merge and deduplicate results
    const mergeStart = performance.now();
    const mergedResults = BookDataMergerService.mergeBookResults(
      isbndbBooks,
      googleBooksBooks,
    );
    timings.merging = performance.now() - mergeStart;

    // Apply final filtering to merged results
    const filterStart = performance.now();
    const filteredBooks = filterBooksByTitleAuthorFixed(
      mergedResults.books,
      title.trim(),
      author.trim(),
    );
    timings.filtering = performance.now() - filterStart;

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
    // const preEditionStart = performance.now(); // Removed for devLog cleanup
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

    // Enhance ONLY primary books from each edition group (typically 1-4 books vs 10-44)
    // PERFORMANCE OPTIMIZATION: Focus on hierarchy-important books
    const enhancementStart = performance.now();

    let enhancedPrimaryBooks: UIBook[];

    try {
      // PHASE 1: Smart Enhancement for missing critical data (publication year, images, etc.)
      const smartEnhancedBooks =
        await SmartEnhancementService.enhanceBooks(primaryBooks);
      // devLog(`${smartSummary} in ${smartEnhancementTime.toFixed(2)}ms`); // Removed devLog

      // PHASE 2: ISBNDB Image Enhancement (fallback for remaining missing images)
      enhancedPrimaryBooks = smartEnhancedBooks; // Image enhancement simplified

      // Race enhancement against 5-second timeout
      const timeoutPromise = new Promise<UIBook[]>((_, reject) =>
        setTimeout(() => reject(new Error('Enhancement timeout')), 5000),
      );

      enhancedPrimaryBooks = await Promise.race([
        enhancedPrimaryBooks,
        timeoutPromise,
      ]);

      // Performance tracking removed

      // devLog( // Removed devLog
      //   `📈 ENHANCEMENT: Successfully enhanced ${enhancedPrimaryBooks.length} primary books in ${totalEnhancementTime.toFixed(2)}ms (Smart: ${smartEnhancementTime.toFixed(2)}ms, ISBNDB: ${isbndbEnhancementTime.toFixed(2)}ms)`,
      // );
    } catch {
      // If enhancement times out or fails, use original primary books
      if (process.env.NODE_ENV === 'development') {
        // devLog( // Removed devLog
        //   `⚠️ ENHANCEMENT: Timeout or error, using original primary books (${(performance.now() - enhancementStart).toFixed(2)}ms)`,
        // );
      }
      enhancedPrimaryBooks = primaryBooks; // Use original primary books without enhancement
    }

    // Combine enhanced primary books with unenhanced secondary books
    const enhancedBooks = [...enhancedPrimaryBooks, ...secondaryBooks];

    timings.enhancement = performance.now() - enhancementStart;
    // timings.preEdition = preEditionTime; // Removed with devLog cleanup

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

      // Queue secondary books for background enhancement
      if (secondaryBooks.length > 0) {
        await ImageEnhancementQueueService.enqueueBooks(secondaryBooks, {
          title,
          author,
        });
      }

      // Update finalBooks with enhanced images
      finalBooks = booksWithEnhancedImages;
      timings.queueIntegration = performance.now() - queueStart;
    } catch (error) {
      timings.queueIntegration = performance.now() - queueStart;
      // eslint-disable-next-line no-console
      console.error('Image enhancement queue failed:', error);
      // Continue with original finalBooks (no queue integration)
    }

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
        apiSearchMs: parseFloat(timings.apiSearch.toFixed(2)),
        extractionMs: parseFloat(timings.extraction.toFixed(2)),
        mergingMs: parseFloat(timings.merging.toFixed(2)),
        filteringMs: parseFloat(timings.filtering.toFixed(2)),
        correctionsMs: parseFloat(timings.corrections.toFixed(2)),
        enhancementMs: parseFloat(timings.enhancement.toFixed(2)),
        validationMs: enableValidation
          ? parseFloat(timings.validation.toFixed(2))
          : 0,
        editionDetectionMs: parseFloat(timings.editionDetection.toFixed(2)),
        queueMs: parseFloat(timings.queue.toFixed(2)),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function for ISBNDB search with optimized parallel strategy
async function searchISBNDB(title: string, author?: string) {
  // devLog(`🔍 ISBNDB: Starting search for "${title}" by "${author}"`); // Removed devLog

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

  // Execute all searches in parallel with race condition protection
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
  // Processing results (performance tracking removed)

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
      result.value.data.forEach((book: ISBNDBBookResponse) => {
        if (book.isbn) {
          allResults.set(book.isbn, book);
        }
      });
    }
  });

  const uniqueBooks = Array.from(allResults.values());

  // devLog( // Removed devLog
  //   `📊 ISBNDB Results: ${uniqueBooks.length} unique books from ${successfulResults}/${searchPromises.length} successful searches (${failedResults} failed) in ${totalTime.toFixed(2)}ms (${promiseTime.toFixed(2)}ms for parallel execution)`,
  // );

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

// NEW: Enriched search flow using filter-first optimization
async function handleEnrichedSearchFlow(
  request: NextRequest,
  title: string,
  author: string,
  timings: { [step: string]: number },
  startTime: number,
) {
  try {
    // Phase 1: ISBN Discovery using existing search APIs (lightweight)
    const discoveryStart = performance.now();
    const googleBooksService = new GoogleBooksService();

    const [isbndbResult, googleBooksResult, itunesResult] =
      await Promise.allSettled([
        searchISBNDB(title.trim(), author.trim()),
        searchGoogleBooks(googleBooksService, title.trim(), author.trim()),
        searchITunes(title.trim(), author.trim()),
      ]);

    const isbndbBooks =
      isbndbResult.status === 'fulfilled' && isbndbResult.value.success
        ? isbndbResult.value.books
        : [];
    const googleBooksBooks =
      googleBooksResult.status === 'fulfilled' &&
      googleBooksResult.value.success
        ? googleBooksResult.value.data || []
        : [];
    const itunesBooks =
      itunesResult.status === 'fulfilled' && itunesResult.value.success
        ? itunesResult.value.data || []
        : [];

    timings.isbnDiscovery = performance.now() - discoveryStart;

    // Phase 2: FILTER FIRST (NEW OPTIMIZATION) - before expensive enrichment
    const filterStart = performance.now();
    const allDiscoveredBooks = [
      ...isbndbBooks,
      ...googleBooksBooks,
      ...itunesBooks,
    ];

    // Phase 2: Filter-first optimization for efficiency

    // Apply lightweight filtering to discovered books BEFORE enrichment
    const filteredBooks = filterBooksByTitleAuthorFixed(
      allDiscoveredBooks,
      title.trim(),
      author.trim(),
    );

    // Filter-first optimization applied successfully

    timings.filterFirst = performance.now() - filterStart;

    // Phase 3: Extract ISBNs from FILTERED books only (minimal API calls)
    const extractionStart = performance.now();
    const uniqueISBNs = extractUniqueISBNs(filteredBooks);
    timings.isbnExtraction = performance.now() - extractionStart;

    // Enrichment optimization: reduced API calls significantly

    // Phase 4: Enrich ONLY the filtered ISBNs (massive API savings!)
    const enrichmentStart = performance.now();
    const enrichmentService = new BookEnrichmentService();
    const enrichedBooks =
      await enrichmentService.enrichBooksWithDetailedData(uniqueISBNs);
    timings.enrichment = performance.now() - enrichmentStart;

    // Phase 5: Group by edition (much simpler now since we have fewer, relevant books)
    const processingStart = performance.now();
    const editionGroups = EditionDetectionService.groupByEdition(enrichedBooks);
    timings.processing = performance.now() - processingStart;

    // Calculate total time and efficiency metrics
    const totalTime = performance.now() - startTime;
    const apiCallSavings = allDiscoveredBooks.length - uniqueISBNs.length;
    const efficiencyGain = (
      (apiCallSavings / allDiscoveredBooks.length) *
      100
    ).toFixed(1);

    return NextResponse.json({
      success: true,
      editionGroups,
      books: enrichedBooks,
      total: enrichedBooks.length,
      sources: {
        isbndb: isbndbBooks.length,
        googleBooks: googleBooksBooks.length,
        itunes: itunesBooks.length,
      },
      metadata: {
        totalDiscovered: allDiscoveredBooks.length,
        filteredBeforeEnrichment: filteredBooks.length,
        uniqueISBNs: uniqueISBNs.length,
        finalEnriched: enrichedBooks.length,
        method: 'optimized-filter-first',
        optimization: {
          apiCallsSaved: apiCallSavings,
          efficiencyGain: `${efficiencyGain}%`,
          description: `Filtered ${allDiscoveredBooks.length} → ${filteredBooks.length} before enrichment`,
        },
      },
      timings: {
        ...timings,
        total: totalTime,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Optimized search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper function for Google Books search
async function searchGoogleBooks(
  service: GoogleBooksService,
  title: string,
  author: string,
) {
  // devLog(`📖 GOOGLE BOOKS: Starting search for "${title}" by "${author}"`); // Removed devLog

  if (!service.isAvailable()) {
    // devLog(`❌ GOOGLE BOOKS: Service not available`); // Removed devLog
    return {
      success: false,
      data: [],
      error: 'Google Books API not configured',
    };
  }

  const result = await service.searchBooks(title, author);

  return result;
}

// Helper function for iTunes Search
async function searchITunes(title: string, author: string) {
  if (!itunesSearchService.isAvailable()) {
    return {
      success: false,
      data: [],
      error: 'iTunes Search API not available',
    };
  }

  try {
    const result = await itunesSearchService.searchAudiobooks(title, author);
    return result;
  } catch (error) {
    // Return empty result on error to not break the search flow
    return {
      success: true,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown iTunes error',
    };
  }
}

// FIXED: More lenient filtering to preserve unique ISBNs
function filterBooksByTitleAuthorFixed(
  books: UIBook[],
  title: string,
  author: string,
) {
  // Optimized filtering for better ISBN coverage
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
    // Title matching - MUCH more lenient for books with different ISBNs
    const bookTitle = normalize(removeStopWords(book.title || ''));

    let titleMatch = false;

    // Method 1: Direct substring match (original logic)
    if (bookTitle.includes(inputTitle) || inputTitle.includes(bookTitle)) {
      titleMatch = true;
    }

    // Method 2: Word-based matching with REDUCED threshold for unique ISBNs
    if (!titleMatch && inputTitleWords.length > 0) {
      const bookTitleWords = bookTitle
        .split(/\s+/)
        .filter(word => word.length > 2);

      // Count matching words
      const matchingWords = inputTitleWords.filter(inputWord =>
        bookTitleWords.some(
          bookWord =>
            bookWord.includes(inputWord) || inputWord.includes(bookWord),
        ),
      );

      // FIXED: Lower threshold from 80% to 50% for better coverage
      const matchRatio = matchingWords.length / inputTitleWords.length;
      if (matchRatio >= 0.5) {
        titleMatch = true;
      }
    }

    // Method 3: NEW - Core title matching (handles "New Builders" vs "The New Builders")
    if (!titleMatch) {
      // Extract core words from both titles
      const coreInputWords = inputTitle.split(/\s+/).filter(w => w.length > 3);
      const coreBookWords = bookTitle.split(/\s+/).filter(w => w.length > 3);

      // If core words overlap significantly, consider it a match
      const coreMatches = coreInputWords.filter(word =>
        coreBookWords.some(
          bookWord => bookWord.includes(word) || word.includes(bookWord),
        ),
      );

      if (coreMatches.length >= Math.min(2, coreInputWords.length)) {
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
        // Known co-author combinations for this project + general patterns
        return (
          (inputAuthor.includes('brad feld') &&
            (normA.includes('sean wise') || normA.includes('amy batchelor'))) ||
          (inputAuthor.includes('sean wise') && normA.includes('brad feld')) ||
          (inputAuthor.includes('amy batchelor') &&
            normA.includes('brad feld')) ||
          (inputAuthor.includes('seth levine') &&
            normA.includes('elizabeth macbride')) ||
          (inputAuthor.includes('elizabeth macbride') &&
            normA.includes('seth levine'))
        );
      });

    return titleMatch && (authorMatch || isKnownCoAuthor);
  });
}
