// Book Data Merger Service
// Intelligently combines and deduplicates results from multiple book APIs

import { UIBook } from '../types/ui-book';

import { GoogleBooksValidationService } from './google-books-validation.service';

export interface BookSearchResults {
  books: UIBook[];
  sources: {
    isbndb: number;
    googleBooks: number;
    total: number;
    duplicatesRemoved: number;
  };
}

export class BookDataMergerService {
  /**
   * Merge and deduplicate books from multiple sources
   */
  static mergeBookResults(
    isbndbBooks: UIBook[],
    googleBooksBooks: UIBook[],
  ): BookSearchResults {
    const allBooks = [...isbndbBooks, ...googleBooksBooks];
    const initialCount = allBooks.length;

    // Deduplicate books using intelligent matching
    const deduplicatedBooks = this.deduplicateBooks(allBooks);
    const duplicatesRemoved = initialCount - deduplicatedBooks.length;

    // Sort by relevance and authority
    const sortedBooks = this.sortByRelevance(deduplicatedBooks);

    return {
      books: sortedBooks,
      sources: {
        isbndb: isbndbBooks.length,
        googleBooks: googleBooksBooks.length,
        total: sortedBooks.length,
        duplicatesRemoved,
      },
    };
  }

  /**
   * Remove duplicate books using multiple matching strategies
   */
  private static deduplicateBooks(books: UIBook[]): UIBook[] {
    const uniqueBooks = new Map<string, UIBook>();

    for (const book of books) {
      const key = this.generateBookKey(book);

      if (uniqueBooks.has(key)) {
        // Merge with existing book, keeping the best data
        const existing = uniqueBooks.get(key)!;
        uniqueBooks.set(key, this.mergeBooksData(existing, book));
      } else {
        uniqueBooks.set(key, book);
      }
    }

    return Array.from(uniqueBooks.values());
  }

  /**
   * Generate a unique key for book identification
   */
  private static generateBookKey(book: UIBook): string {
    // Strategy 1: Use ISBN if available (most reliable)
    if (book.isbn) {
      return `isbn:${this.normalizeIsbn(book.isbn)}`;
    }

    // Strategy 2: Use title + first author (normalized)
    const normalizedTitle = this.normalizeTitle(book.title);
    const firstAuthor = book.authors?.[0]
      ? this.normalizeAuthor(book.authors[0])
      : 'unknown';

    return `title-author:${normalizedTitle}:${firstAuthor}`;
  }

  /**
   * Normalize ISBN for comparison (remove dashes, spaces)
   */
  private static normalizeIsbn(isbn: string): string {
    return isbn.replace(/[-\s]/g, '').toLowerCase();
  }

  /**
   * Normalize title for comparison
   */
  private static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Normalize author name for comparison
   */
  private static normalizeAuthor(author: string): string {
    return author
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Merge data from two books, keeping the best information
   */
  private static mergeBooksData(book1: UIBook, book2: UIBook): UIBook {
    // Prefer ISBNDB for certain fields, Google Books for others
    const isBook1FromIsbndb = book1.source === 'isbn-db';
    const isBook2FromIsbndb = book2.source === 'isbn-db';

    // Create merged book with best data from both sources
    const merged: UIBook = {
      // Use the more complete ID
      id:
        this.chooseBestValue(
          book1.id,
          book2.id,
          (a, b) => a.length - b.length,
        ) ||
        book1.id ||
        book2.id ||
        `merged-${Date.now()}`,

      // Title: prefer longer/more complete title
      title:
        this.chooseBestValue(
          book1.title,
          book2.title,
          (a, b) => a.length - b.length,
        ) ||
        book1.title ||
        book2.title ||
        'Unknown Title',

      // Subtitle: prefer non-empty
      subtitle: book1.subtitle || book2.subtitle,

      // Authors: merge and deduplicate
      authors: this.mergeAuthors(book1.authors || [], book2.authors || []),

      // Publisher: prefer ISBNDB if available
      publisher: isBook1FromIsbndb
        ? book1.publisher || book2.publisher
        : isBook2FromIsbndb
          ? book2.publisher || book1.publisher
          : book1.publisher || book2.publisher,

      // Publication info: prefer more specific
      published_date: book1.published_date || book2.published_date,
      year: book1.year || book2.year,

      // ISBN: prefer longer ISBN (ISBN-13 over ISBN-10)
      isbn: this.chooseBestValue(
        book1.isbn,
        book2.isbn,
        (a, b) => (a?.length || 0) - (b?.length || 0),
      ),

      // Categories/subjects: merge
      categories: this.mergeArrays(book1.categories, book2.categories),
      subjects: this.mergeArrays(book1.subjects, book2.subjects),

      // Description: prefer longer description
      description: this.chooseBestValue(
        book1.description,
        book2.description,
        (a, b) => (a?.length || 0) - (b?.length || 0),
      ),

      // Pages: prefer non-zero value
      page_count: book1.page_count || book2.page_count,
      pages: book1.pages || book2.pages,

      // Language: prefer non-empty
      language: book1.language || book2.language,

      // Images: prefer Google Books images (typically better quality)
      image: !isBook1FromIsbndb
        ? book1.image
        : !isBook2FromIsbndb
          ? book2.image
          : book1.image || book2.image,
      thumbnail: !isBook1FromIsbndb
        ? book1.thumbnail
        : !isBook2FromIsbndb
          ? book2.thumbnail
          : book1.thumbnail || book2.thumbnail,

      // Binding: prefer ISBNDB (more specific)
      binding: isBook1FromIsbndb
        ? book1.binding || book2.binding
        : isBook2FromIsbndb
          ? book2.binding || book1.binding
          : book1.binding || book2.binding,

      // Source tracking: keep both
      source: 'isbn-db', // Default to ISBNDB as primary
      data_source: book1.data_source || book2.data_source,
      googleBooksId: book1.googleBooksId || book2.googleBooksId,
      external_id: book1.external_id || book2.external_id,

      // Timestamps: use most recent
      created_at: book1.created_at || book2.created_at,
      updated_at: book1.updated_at || book2.updated_at,
    };

    return merged;
  }

  /**
   * Choose the best value between two options using a comparator
   */
  private static chooseBestValue<T>(
    value1: T | undefined,
    value2: T | undefined,
    comparator: (a: T, b: T) => number,
  ): T | undefined {
    if (!value1) return value2;
    if (!value2) return value1;
    return comparator(value1, value2) >= 0 ? value1 : value2;
  }

  /**
   * Merge author arrays, removing duplicates
   */
  private static mergeAuthors(
    authors1: string[] = [],
    authors2: string[] = [],
  ): string[] {
    const allAuthors = [...authors1, ...authors2];

    // Return original cased versions, deduplicated
    return allAuthors.filter(
      (author, index) =>
        allAuthors.findIndex(
          a => this.normalizeAuthor(a) === this.normalizeAuthor(author),
        ) === index,
    );
  }

  /**
   * Merge string arrays, removing duplicates
   */
  private static mergeArrays(
    arr1: string[] = [],
    arr2: string[] = [],
  ): string[] {
    const allItems = [...arr1, ...arr2];
    return Array.from(new Set(allItems.map(item => item.toLowerCase()))).map(
      normalized => allItems.find(item => item.toLowerCase() === normalized)!,
    );
  }

  /**
   * Sort books by relevance and data quality
   */
  private static sortByRelevance(books: UIBook[]): UIBook[] {
    return books.sort((a, b) => {
      // Prefer books with ISBN
      const aHasIsbn = Boolean(a.isbn);
      const bHasIsbn = Boolean(b.isbn);
      if (aHasIsbn !== bHasIsbn) {
        return bHasIsbn ? 1 : -1;
      }

      // Prefer books with more complete data
      const aCompleteness = this.calculateCompleteness(a);
      const bCompleteness = this.calculateCompleteness(b);
      if (aCompleteness !== bCompleteness) {
        return bCompleteness - aCompleteness;
      }

      // Prefer ISBNDB as primary source
      const aIsIsbndb = a.source === 'isbn-db';
      const bIsIsbndb = b.source === 'isbn-db';
      if (aIsIsbndb !== bIsIsbndb) {
        return aIsIsbndb ? -1 : 1;
      }

      // Finally, sort by title
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Calculate data completeness score for a book
   */
  private static calculateCompleteness(book: UIBook): number {
    let score = 0;

    // Core fields
    if (book.isbn) score += 3;
    if (book.authors?.length) score += 2;
    if (book.publisher) score += 1;
    if (book.published_date || book.year) score += 1;
    if (book.description) score += 2;
    if (book.page_count || book.pages) score += 1;
    if (book.binding) score += 1;
    if (book.image || book.thumbnail) score += 1;

    return score;
  }

  /**
   * Validate books using Google Books API
   */
  static async validateBooks(books: UIBook[]): Promise<UIBook[]> {
    const validatedBooks: UIBook[] = [];

    for (const book of books) {
      try {
        const validation =
          await GoogleBooksValidationService.validateBookPublication(
            book.isbn || '',
            book.title,
            book.authors?.[0] || '',
          );

        const validatedBook: UIBook = {
          ...book,
          validation: {
            isReallyPublished: validation.isReallyPublished,
            confidence: validation.confidence,
            validationSources: validation.validationSources,
            flags: validation.flags,
            summary:
              GoogleBooksValidationService.getValidationSummary(validation),
          },
        };

        validatedBooks.push(validatedBook);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Validation error for book ${book.title}:`, error);
        // Add book without validation if error occurs
        validatedBooks.push(book);
      }
    }

    return validatedBooks;
  }

  /**
   * Filter out books with low confidence scores
   */
  static filterValidatedBooks(
    books: UIBook[],
    minConfidence: number = 0.3,
  ): UIBook[] {
    return books.filter(book => {
      if (!book.validation) return true; // Keep books without validation
      return book.validation.confidence >= minConfidence;
    });
  }
}
