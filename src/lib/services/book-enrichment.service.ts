import { ISBNDBBookResponse } from '../types/api';
import { UIBook } from '../types/ui-book';

import { ISBNDBService } from './isbn-db.service';

export class BookEnrichmentService {
  private isbndbService: ISBNDBService;

  constructor() {
    this.isbndbService = new ISBNDBService();
  }

  /**
   * Enrich books with detailed data from ISBNDB /book/{isbn} endpoint
   * This provides perfect image-to-ISBN association
   */
  async enrichBooksWithDetailedData(isbns: string[]): Promise<UIBook[]> {
    // Enriching ISBNs with detailed ISBNDB data

    if (isbns.length === 0) {
      return [];
    }

    // Fetch detailed data for each ISBN in parallel
    const detailedResults = await Promise.allSettled(
      isbns.map(isbn => this.isbndbService.getBookByISBN(isbn)),
    );

    const enrichedBooks: UIBook[] = [];

    detailedResults.forEach((result, index) => {
      const isbn = isbns[index];

      if (
        result.status === 'fulfilled' &&
        result.value.success &&
        result.value.data
      ) {
        const bookData = result.value.data;

        // Convert ISBNDB detailed response to UIBook
        const enrichedBook = this.convertISBNDBDetailedToUIBook(bookData, isbn);

        if (enrichedBook) {
          enrichedBooks.push(enrichedBook);
          // Successfully enriched ISBN with detailed data
        }
      } else {
        // Failed to enrich ISBN - continuing with available data
      }
    });

    // Enrichment completed with available data
    return enrichedBooks;
  }

  /**
   * Convert ISBNDB detailed book response to UIBook format
   * Preserves the perfect image association from ISBNDB
   */
  private convertISBNDBDetailedToUIBook(
    bookData: ISBNDBBookResponse,
    originalISBN: string,
  ): UIBook | null {
    if (!bookData.title) {
      return null;
    }

    // Parse publication year from date
    let year: number | undefined;
    if (bookData.date_published) {
      const parsedYear = new Date(bookData.date_published).getFullYear();
      if (!isNaN(parsedYear)) {
        year = parsedYear;
      }
    }

    return {
      id: bookData.isbn13 || bookData.isbn || originalISBN,
      isbn: bookData.isbn13 || bookData.isbn || originalISBN,
      title: bookData.title,
      subtitle: bookData.title_long || '',
      authors: bookData.authors || [],
      publisher: bookData.publisher || '',
      year,
      pages: bookData.pages,
      binding: this.normalizeBinding(bookData.binding || bookData.print_type),
      // ✅ PERFECT IMAGE ASSOCIATION - This image is specifically for this ISBN
      image: bookData.image || bookData.cover_image,
      thumbnail: bookData.image || bookData.cover_image,
      description:
        bookData.overview || bookData.synopsis || bookData.excerpt || '',
      language: bookData.language || 'en',
      subjects: bookData.subjects || [],
      // Enhanced metadata from detailed endpoint
      edition: bookData.edition,
      content_version: bookData.content_version,
      dimensions: bookData.dimensions,
      dewey_decimal: bookData.dewey_decimal,
      // Source tracking
      source: 'isbn-db' as const,
      data_source: 'isbndb-detailed',
    };
  }

  /**
   * Normalize binding type to standard format
   */
  private normalizeBinding(binding?: string): string {
    if (!binding) return 'Unknown';

    const normalized = binding.toLowerCase();

    if (normalized.includes('hardcover') || normalized.includes('hardback')) {
      return 'Hardcover';
    }
    if (normalized.includes('paperback') || normalized.includes('softcover')) {
      return 'Paperback';
    }
    if (normalized.includes('mass market')) {
      return 'Mass Market Paperback';
    }
    if (normalized.includes('board book')) {
      return 'Board Book';
    }
    if (normalized.includes('spiral')) {
      return 'Spiral-bound';
    }
    if (normalized.includes('library')) {
      return 'Library Binding';
    }
    if (normalized.includes('kindle') || normalized.includes('ebook')) {
      return 'Kindle Edition';
    }
    if (normalized.includes('audio')) {
      return 'Audiobook';
    }

    // Return original if no normalization match
    return binding;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      available: !!process.env.ISBNDB_API_KEY,
      service: 'BookEnrichmentService',
      description:
        'Enriches books with detailed ISBNDB data including perfect image associations',
    };
  }
}
