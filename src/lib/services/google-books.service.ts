// Google Books API Service
// Supplementary service for fetching book data from Google Books API

import { API_CONFIG, CACHE_KEYS, SEARCH_PARAMS } from '../constants/api-config';
import { ApiResponse } from '../types/api';
import { UIBook } from '../types/ui-book';
import { cacheWrapper, buildCacheKey } from '../utils/api-cache';
import { createRateLimiter, ExponentialBackoff } from '../utils/rate-limiter';

// Google Books API Types
interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    printType?: string;
    categories?: string[];
    language?: string;
    imageLinks?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    description?: string;
  };
  saleInfo?: {
    country?: string;
    saleability?: string;
    isEbook?: boolean;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

export class GoogleBooksService {
  private baseUrl = 'https://www.googleapis.com/books/v1';
  private apiKey: string;
  private rateLimiter = createRateLimiter(
    'google-books',
    API_CONFIG.GOOGLE_BOOKS.RATE_LIMIT,
  );
  private backoff: ExponentialBackoff;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env['GOOGLE_BOOKS_API_KEY'] || '';
    this.backoff = new ExponentialBackoff(
      API_CONFIG.GOOGLE_BOOKS.RETRY_ATTEMPTS,
      API_CONFIG.GOOGLE_BOOKS.RETRY_DELAY,
      3000,
      true,
    );

    if (!this.apiKey) {
      // Service will have limited functionality without API key
    }
  }

  // Check if Google Books API is available (works without API key for basic searches)
  isAvailable(): boolean {
    return true; // Google Books API works without API key for basic functionality
  }

  // Search books by title and author
  async searchBooks(
    title: string,
    author?: string,
  ): Promise<ApiResponse<UIBook[]>> {
    if (!title || title.length < SEARCH_PARAMS.MIN_QUERY_LENGTH) {
      return {
        success: false,
        error: 'Title must be at least 2 characters long',
      };
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.GOOGLE_BOOKS_SEARCH, {
      title: title.toLowerCase(),
      author: author?.toLowerCase() || '',
    });

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchBooks(title, author),
        API_CONFIG.GOOGLE_BOOKS.CACHE_TTL,
      );
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Get book by Google Books ID
  async getBookById(id: string): Promise<ApiResponse<UIBook>> {
    if (!id) {
      return {
        success: false,
        error: 'Book ID is required',
      };
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.GOOGLE_BOOKS_VOLUME, { id });

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchBookById(id),
        API_CONFIG.GOOGLE_BOOKS.CACHE_TTL,
      );
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async fetchBooks(
    title: string,
    author?: string,
  ): Promise<ApiResponse<UIBook[]>> {
    // Build search query - use simple space-separated format for better results
    let query = title;
    if (author) {
      query += ` ${author}`;
    }

    const url = new URL(`${this.baseUrl}/volumes`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', SEARCH_PARAMS.MAX_RESULTS.toString());
    url.searchParams.set('printType', 'books');

    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    try {
      await this.rateLimiter.checkLimit('google-books-search');

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.GOOGLE_BOOKS.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GoogleBooksResponse = await response.json();

      if (!data.items || data.items.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Convert Google Books volumes to UIBook format
      const books = data.items
        .map(volume => this.convertToUIBook(volume))
        .filter((book): book is UIBook => book !== null);

      return {
        success: true,
        data: books,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async fetchBookById(id: string): Promise<ApiResponse<UIBook>> {
    const url = new URL(`${this.baseUrl}/volumes/${id}`);

    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    try {
      await this.rateLimiter.checkLimit('google-books-fetch');

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.GOOGLE_BOOKS.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Book not found',
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const volume: GoogleBooksVolume = await response.json();
      const book = this.convertToUIBook(volume);

      if (!book) {
        return {
          success: false,
          error: 'Could not convert book data',
        };
      }

      return {
        success: true,
        data: book,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private convertToUIBook(volume: GoogleBooksVolume): UIBook | null {
    const volumeInfo = volume.volumeInfo;

    if (!volumeInfo.title) {
      return null;
    }

    // Extract ISBN (prefer ISBN-13, fallback to ISBN-10)
    let isbn = '';
    if (volumeInfo.industryIdentifiers) {
      const isbn13 = volumeInfo.industryIdentifiers.find(
        id => id.type === 'ISBN_13',
      );
      const isbn10 = volumeInfo.industryIdentifiers.find(
        id => id.type === 'ISBN_10',
      );
      isbn = isbn13?.identifier || isbn10?.identifier || '';
    }

    // Determine binding type from print type and availability
    let binding = 'Unknown';
    if (volume.saleInfo?.isEbook) {
      binding = 'Kindle Edition';
    } else if (volumeInfo.printType === 'BOOK') {
      binding = 'Paperback'; // Default for physical books
    }

    // Parse publication year
    const year = volumeInfo.publishedDate
      ? new Date(volumeInfo.publishedDate).getFullYear()
      : undefined;

    return {
      id: volume.id, // Use Google Books volume ID as the primary ID
      isbn,
      title: volumeInfo.title,
      subtitle: volumeInfo.subtitle || '',
      authors: volumeInfo.authors || [],
      publisher: volumeInfo.publisher || '',
      year,
      pages: volumeInfo.pageCount,
      binding,
      image:
        volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.small || '',
      description: volumeInfo.description || '',
      language: volumeInfo.language || 'en',
      subjects: volumeInfo.categories || [],
      // Google Books specific metadata
      googleBooksId: volume.id,
      source: 'google-books' as const,
    };
  }

  // Get service status
  getStatus() {
    return {
      available: this.isAvailable(),
    };
  }
}
