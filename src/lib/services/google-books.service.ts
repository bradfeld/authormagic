// Google Books API Service
// Backup service for fetching book data from Google Books

import { GoogleBooksVolume, GoogleBooksApiResponse } from '../types/api';
import { ApiResponse } from '../types/api';
import { ExponentialBackoff } from '../utils/rate-limiter';

interface GoogleBooksQueryParams {
  q: string;
  maxResults?: number;
  startIndex?: number;
  orderBy?: 'newest' | 'relevance';
  printType?: 'all' | 'books' | 'magazines';
  filter?: 'partial' | 'full' | 'free-ebooks' | 'paid-ebooks' | 'ebooks';
  projection?: 'lite' | 'full';
  langRestrict?: string;
}

/**
 * Enhanced Google Books API service with rate limiting and comprehensive search capabilities
 */
export class GoogleBooksService {
  private baseUrl = 'https://www.googleapis.com/books/v1';
  private apiKey: string;
  private backoff: ExponentialBackoff;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env['GOOGLE_BOOKS_API_KEY'] || '';
    this.backoff = new ExponentialBackoff(3, 1000, 10000, true);
  }

  private buildUrl(endpoint: string, params: GoogleBooksQueryParams): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add API key if available
    if (this.apiKey) {
      url.searchParams.append('key', this.apiKey);
    }

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    return url.toString();
  }

  private async makeRequest<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(
        `Google Books API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Search for books using Google Books API
   */
  async searchBooks(
    query: string,
    options: Partial<GoogleBooksQueryParams> = {},
  ): Promise<ApiResponse<GoogleBooksApiResponse<GoogleBooksVolume>>> {
    try {
      const params: GoogleBooksQueryParams = {
        q: query,
        maxResults: 10,
        orderBy: 'relevance',
        printType: 'books',
        ...options,
      };

      const url = this.buildUrl('/volumes', params);
      const result = await this.backoff.execute(() =>
        this.makeRequest<GoogleBooksApiResponse<GoogleBooksVolume>>(url),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get book details by volume ID
   */
  async getBookById(volumeId: string): Promise<ApiResponse<GoogleBooksVolume>> {
    try {
      const url = this.buildUrl(`/volumes/${volumeId}`, { q: '' });
      const result = await this.backoff.execute(() =>
        this.makeRequest<GoogleBooksVolume>(url),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Search by ISBN
   */
  async searchByIsbn(
    isbn: string,
  ): Promise<ApiResponse<GoogleBooksVolume | undefined>> {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    try {
      const searchResponse = await this.searchBooks(`isbn:${cleanIsbn}`, {
        maxResults: 1,
      });

      if (!searchResponse.success) {
        return {
          success: false,
          error: searchResponse.error,
        };
      }

      const volume = searchResponse.data?.items?.[0];
      return {
        success: true,
        data: volume,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Search by title and author
   */
  async searchByTitleAndAuthor(
    title: string,
    author: string,
  ): Promise<ApiResponse<GoogleBooksApiResponse<GoogleBooksVolume>>> {
    const query = `intitle:"${title}" inauthor:"${author}"`;
    return this.searchBooks(query, { maxResults: 10 });
  }
}
