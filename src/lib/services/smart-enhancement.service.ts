import { UIBook } from '@/lib/types/ui-book';

import { GoogleBooksService } from './google-books.service';

/**
 * Smart Enhancement Service
 *
 * Enhances books with missing critical data using targeted
 * Google Books ISBN lookups. Focuses on books with missing
 * metadata to improve data completeness.
 */
export class SmartEnhancementService {
  private static googleBooksService = new GoogleBooksService();

  /**
   * Detect books that need enhancement based on missing critical data
   */
  static detectEnhancementCandidates(books: UIBook[]): UIBook[] {
    return books.filter(book => {
      // Critical missing data indicators
      const missingYear = !book.year && !book.published_date;
      const missingImage = !book.image && !book.thumbnail;
      const missingPages = !book.page_count && !book.pages;
      const missingPublisher = !book.publisher;
      const hasISBN = !!book.isbn;

      // Only enhance books with ISBN and at least 2 missing critical fields
      if (!hasISBN) return false;

      const missingCount = [
        missingYear,
        missingImage,
        missingPages,
        missingPublisher,
      ].filter(Boolean).length;
      return missingCount >= 2;
    });
  }

  /**
   * Enhance books using Google Books ISBN lookup
   * No hardcoded book injection - only enhances existing books
   */
  static async enhanceBooks(books: UIBook[]): Promise<UIBook[]> {
    const candidates = this.detectEnhancementCandidates(books);

    if (candidates.length === 0) {
      return books;
    }

    const enhancementPromises = books.map(async book => {
      // Only enhance candidates
      if (!candidates.includes(book)) {
        return book;
      }

      try {
        // Use Google Books ISBN lookup for missing data
        const enhanced = await this.enhanceBookWithGoogleBooks(book);
        return enhanced || book;
      } catch {
        // If enhancement fails, continue with original book
        return book;
      }
    });

    // Process all enhancements in parallel with timeout
    try {
      const timeoutPromise = new Promise<UIBook[]>((_, reject) =>
        setTimeout(() => reject(new Error('Enhancement timeout')), 3000),
      );

      const enhancementPromise = Promise.all(enhancementPromises);

      return await Promise.race([enhancementPromise, timeoutPromise]);
    } catch {
      // If timeout or error, return original books
      return books;
    }
  }

  /**
   * Enhance a single book using Google Books ISBN lookup
   */
  private static async enhanceBookWithGoogleBooks(
    book: UIBook,
  ): Promise<UIBook | null> {
    if (!book.isbn) return null;

    try {
      // Use the existing ISBN search functionality
      const result = await this.googleBooksService.searchBooks(book.isbn);

      if (!result.success || !result.data || result.data.length === 0) {
        return null;
      }

      // Find the best match (first result is usually most relevant for ISBN search)
      const googleBook = result.data[0];

      // Merge missing data strategically
      const enhanced: UIBook = {
        ...book,
        // Fill missing publication year
        published_date: book.published_date || googleBook.published_date,
        year: book.year || googleBook.year,

        // Fill missing image
        image: book.image || googleBook.image,
        thumbnail: book.thumbnail || googleBook.thumbnail,

        // Fill missing page count
        page_count:
          book.page_count || googleBook.page_count || googleBook.pages,
        pages: book.pages || googleBook.pages || googleBook.page_count,

        // Fill missing publisher
        publisher: book.publisher || googleBook.publisher,

        // Fill missing description
        description: book.description || googleBook.description,

        // Track enhancement source
        data_source: book.data_source
          ? `${book.data_source},google-books-enhanced`
          : 'google-books-enhanced',
      };

      return enhanced;
    } catch {
      // Silently fail - return null to use original book
      return null;
    }
  }

  /**
   * Get enhancement summary for debugging
   */
  static getEnhancementSummary(
    originalBooks: UIBook[],
    enhancedBooks: UIBook[],
  ): string {
    const candidates = this.detectEnhancementCandidates(originalBooks);
    const enhanced = enhancedBooks.filter((book, index) => {
      const original = originalBooks[index];
      return (
        book.data_source?.includes('google-books-enhanced') &&
        original.data_source !== book.data_source
      );
    });

    return `📈 SMART ENHANCEMENT: ${candidates.length} candidates detected, ${enhanced.length} books enhanced`;
  }
}
