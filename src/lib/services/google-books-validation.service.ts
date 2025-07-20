interface GoogleBooksValidationResult {
  isReallyPublished: boolean;
  confidence: number;
  validationSources: string[];
  flags: string[];
  googleBooksData?: unknown;
}

interface ValidationSignals {
  hasGoogleBooksEntry: boolean;
  hasPreviewAvailable: boolean;
  hasPurchaseLinks: boolean;
  hasRatings: boolean;
  hasDescription: boolean;
  hasValidPageCount: boolean;
  publisherReputable: boolean;
  dateConsistent: boolean;
}

export class GoogleBooksValidationService {
  private static readonly GOOGLE_BOOKS_API_KEY =
    process.env.GOOGLE_BOOKS_API_KEY;
  private static readonly BASE_URL =
    'https://www.googleapis.com/books/v1/volumes';

  /**
   * Validate if a book is actually published using Google Books API
   */
  static async validateBookPublication(
    isbn: string,
    title: string,
    author: string,
  ): Promise<GoogleBooksValidationResult> {
    try {
      // Search by ISBN first (most reliable)
      let googleBooksData = await this.searchByISBN(isbn);

      // If ISBN search fails, try title + author
      if (!googleBooksData) {
        googleBooksData = await this.searchByTitleAuthor(title, author);
      }

      if (!googleBooksData) {
        return {
          isReallyPublished: false,
          confidence: 0,
          validationSources: [],
          flags: ['no_google_books_entry'],
        };
      }

      // Analyze validation signals
      const signals = this.analyzeValidationSignals(googleBooksData);
      const confidence = this.calculateConfidenceScore(signals);
      const flags = this.generateFlags(signals);

      return {
        isReallyPublished: confidence >= 0.6, // 60% confidence threshold
        confidence,
        validationSources: ['google_books'],
        flags,
        googleBooksData,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Google Books validation error:', error);
      return {
        isReallyPublished: true, // Default to true on API errors
        confidence: 0.5,
        validationSources: [],
        flags: ['validation_error'],
      };
    }
  }

  /**
   * Search Google Books by ISBN
   */
  private static async searchByISBN(isbn: string): Promise<unknown> {
    if (!isbn || !this.GOOGLE_BOOKS_API_KEY) return null;

    const cleanISBN = isbn.replace(/[-\s]/g, '');
    const url = `${this.BASE_URL}?q=isbn:${cleanISBN}&key=${this.GOOGLE_BOOKS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    return data?.items?.[0] || null;
  }

  /**
   * Search Google Books by title and author
   */
  private static async searchByTitleAuthor(
    title: string,
    author: string,
  ): Promise<unknown> {
    if (!this.GOOGLE_BOOKS_API_KEY) return null;

    const query = `intitle:"${title}" inauthor:"${author}"`;
    const url = `${this.BASE_URL}?q=${encodeURIComponent(query)}&key=${this.GOOGLE_BOOKS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    return data?.items?.[0] || null;
  }

  /**
   * Analyze various signals that indicate real publication
   */
  private static analyzeValidationSignals(
    googleBooksData: unknown,
  ): ValidationSignals {
    const data = googleBooksData as Record<string, unknown>;
    const volumeInfo = (data?.volumeInfo as Record<string, unknown>) || {};
    const saleInfo = (data?.saleInfo as Record<string, unknown>) || {};
    const accessInfo = (data?.accessInfo as Record<string, unknown>) || {};

    return {
      hasGoogleBooksEntry: !!googleBooksData,
      hasPreviewAvailable:
        accessInfo?.viewability === 'PARTIAL' ||
        accessInfo?.viewability === 'ALL_PAGES',
      hasPurchaseLinks:
        saleInfo?.saleability === 'FOR_SALE' && !!saleInfo?.buyLink,
      hasRatings: !!(
        volumeInfo?.ratingsCount && Number(volumeInfo.ratingsCount) > 0
      ),
      hasDescription: !!(
        volumeInfo?.description && String(volumeInfo.description).length > 50
      ),
      hasValidPageCount: !!(
        volumeInfo?.pageCount && Number(volumeInfo.pageCount) > 0
      ),
      publisherReputable: this.isReputablePublisher(
        String(volumeInfo?.publisher || ''),
      ),
      dateConsistent: this.isDateConsistent(
        String(volumeInfo?.publishedDate || ''),
      ),
    };
  }

  /**
   * Calculate confidence score based on validation signals
   */
  private static calculateConfidenceScore(signals: ValidationSignals): number {
    const weights = {
      hasGoogleBooksEntry: 0.2, // Basic presence
      hasPreviewAvailable: 0.15, // Can actually read/preview
      hasPurchaseLinks: 0.15, // Available for purchase
      hasRatings: 0.1, // Community engagement
      hasDescription: 0.1, // Proper metadata
      hasValidPageCount: 0.1, // Physical properties
      publisherReputable: 0.1, // Publisher credibility
      dateConsistent: 0.1, // Date validity
    };

    let score = 0;
    for (const [signal, weight] of Object.entries(weights)) {
      if (signals[signal as keyof ValidationSignals]) {
        score += weight;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Generate flags for issues found
   */
  private static generateFlags(signals: ValidationSignals): string[] {
    const flags: string[] = [];

    if (!signals.hasGoogleBooksEntry) flags.push('no_google_books_entry');
    if (!signals.hasPreviewAvailable) flags.push('no_preview_available');
    if (!signals.hasPurchaseLinks) flags.push('not_for_sale');
    if (!signals.hasRatings) flags.push('no_community_ratings');
    if (!signals.hasDescription) flags.push('minimal_description');
    if (!signals.hasValidPageCount) flags.push('no_page_count');
    if (!signals.publisherReputable) flags.push('unknown_publisher');
    if (!signals.dateConsistent) flags.push('inconsistent_date');

    return flags;
  }

  /**
   * Check if publisher is reputable
   */
  private static isReputablePublisher(publisher?: string): boolean {
    if (!publisher) return false;

    const reputablePublishers = [
      'Wiley',
      'John Wiley',
      'Penguin',
      'Random House',
      'HarperCollins',
      'Simon & Schuster',
      'Macmillan',
      'Hachette',
      'McGraw-Hill',
      "O'Reilly",
      'Addison-Wesley',
      'Prentice Hall',
      'MIT Press',
      'Harvard Business Review',
      'Harvard Business School',
    ];

    return reputablePublishers.some(pub =>
      publisher.toLowerCase().includes(pub.toLowerCase()),
    );
  }

  /**
   * Check if publication date is consistent and reasonable
   */
  private static isDateConsistent(publishedDate?: string): boolean {
    if (!publishedDate) return false;

    try {
      const date = new Date(publishedDate);
      const currentYear = new Date().getFullYear();
      const year = date.getFullYear();

      // Must be between 1800 and current year + 2
      return year >= 1800 && year <= currentYear + 2;
    } catch {
      return false;
    }
  }

  /**
   * Get validation summary for a book
   */
  static getValidationSummary(result: GoogleBooksValidationResult): string {
    if (result.confidence >= 0.9) return 'Highly Verified';
    if (result.confidence >= 0.7) return 'Well Verified';
    if (result.confidence >= 0.5) return 'Moderately Verified';
    if (result.confidence >= 0.3) return 'Poorly Verified';
    return 'Unverified';
  }
}
