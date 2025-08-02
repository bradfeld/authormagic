// iTunes Search API Service
// Service for fetching audiobook data from Apple's iTunes Search API

import { API_CONFIG, CACHE_KEYS, SEARCH_PARAMS } from '../constants/api-config';
import {
  ApiResponse,
  iTunesSearchResponse,
  iTunesSearchParams,
  iTunesLookupParams,
} from '../types/api';
import { UIBook, convertITunesToUIBook } from '../types/ui-book';
import { cacheWrapper, buildCacheKey } from '../utils/api-cache';
import { createRateLimiter, ExponentialBackoff } from '../utils/rate-limiter';

export class ITunesSearchService {
  private baseUrl = API_CONFIG.ITUNES_SEARCH.BASE_URL;
  private rateLimiter = createRateLimiter(
    'itunes-search',
    API_CONFIG.ITUNES_SEARCH.RATE_LIMIT,
  );
  private backoff: ExponentialBackoff;

  constructor() {
    // iTunes Search API is public and doesn't require authentication
    this.backoff = new ExponentialBackoff(
      API_CONFIG.ITUNES_SEARCH.RETRY_ATTEMPTS,
      API_CONFIG.ITUNES_SEARCH.RETRY_DELAY,
      3000,
      true,
    );
  }

  // Check if iTunes Search API is available
  isAvailable(): boolean {
    return true; // Public API, always available
  }

  // Search audiobooks by title and author
  async searchAudiobooks(
    title: string,
    author?: string,
  ): Promise<ApiResponse<UIBook[]>> {
    if (!title || title.length < SEARCH_PARAMS.MIN_QUERY_LENGTH) {
      return {
        success: false,
        error: 'Title must be at least 2 characters long',
      };
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.ITUNES_SEARCH, {
      title: title.toLowerCase(),
      author: author?.toLowerCase() || '',
      media: 'audiobook',
    });

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchAudiobooks(title, author),
        API_CONFIG.ITUNES_SEARCH.CACHE_TTL,
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'iTunes search failed',
      };
    }
  }

  // Search all content types by title and author
  async searchAllContent(
    title: string,
    author?: string,
  ): Promise<ApiResponse<UIBook[]>> {
    if (!title || title.length < SEARCH_PARAMS.MIN_QUERY_LENGTH) {
      return {
        success: false,
        error: 'Title must be at least 2 characters long',
      };
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.ITUNES_SEARCH, {
      title: title.toLowerCase(),
      author: author?.toLowerCase() || '',
      media: 'all',
    });

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchAllContent(title, author),
        API_CONFIG.ITUNES_SEARCH.CACHE_TTL,
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'iTunes search failed',
      };
    }
  }

  // Lookup content by iTunes ID
  async lookupById(id: string): Promise<ApiResponse<UIBook | null>> {
    if (!id) {
      return {
        success: false,
        error: 'iTunes ID is required',
      };
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.ITUNES_LOOKUP, { id });

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.performLookup({ id }),
        API_CONFIG.ITUNES_SEARCH.CACHE_TTL,
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'iTunes lookup failed',
      };
    }
  }

  // Private method to fetch audiobooks
  private async fetchAudiobooks(
    title: string,
    author?: string,
  ): Promise<ApiResponse<UIBook[]>> {
    const searchTerm = author ? `${title} ${author}` : title;

    const params: iTunesSearchParams = {
      term: searchTerm,
      media: 'audiobook',
      entity: 'audiobook',
      limit: SEARCH_PARAMS.MAX_RESULTS,
      country: 'US',
      explicit: 'Yes', // Include all content
    };

    return this.performSearch(params);
  }

  // Private method to fetch all content types
  private async fetchAllContent(
    title: string,
    author?: string,
  ): Promise<ApiResponse<UIBook[]>> {
    const searchTerm = author ? `${title} ${author}` : title;

    const params: iTunesSearchParams = {
      term: searchTerm,
      media: 'all',
      limit: SEARCH_PARAMS.MAX_RESULTS,
      country: 'US',
      explicit: 'Yes', // Include all content
    };

    return this.performSearch(params);
  }

  // Private method to perform search requests
  private async performSearch(
    params: iTunesSearchParams,
  ): Promise<ApiResponse<UIBook[]>> {
    try {
      // Check rate limit
      const canMakeRequest = await this.rateLimiter.checkLimit('itunes-search');
      if (!canMakeRequest) {
        await this.rateLimiter.waitForSlot('itunes-search');
      }

      // Build URL with query parameters
      const url = new URL(`${this.baseUrl}/search`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.ITUNES_SEARCH.TIMEOUT,
      );

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AuthorMagic/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `iTunes API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: iTunesSearchResponse = await response.json();

      // Convert iTunes items to UIBook format
      const books = data.results
        .filter(
          item => item.wrapperType === 'audiobook' || item.kind === 'audiobook',
        )
        .map(convertITunesToUIBook);

      return {
        success: true,
        data: books,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'iTunes search request timed out',
        };
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown iTunes search error',
      };
    }
  }

  // Private method to perform lookup requests
  private async performLookup(
    params: iTunesLookupParams,
  ): Promise<ApiResponse<UIBook | null>> {
    try {
      // Check rate limit
      const canMakeRequest = await this.rateLimiter.checkLimit('itunes-search');
      if (!canMakeRequest) {
        await this.rateLimiter.waitForSlot('itunes-search');
      }

      // Build URL with query parameters
      const url = new URL(`${this.baseUrl}/lookup`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.ITUNES_SEARCH.TIMEOUT,
      );

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AuthorMagic/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `iTunes API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: iTunesSearchResponse = await response.json();

      if (data.results.length === 0) {
        return {
          success: true,
          data: null,
        };
      }

      // Convert first result to UIBook format
      const book = convertITunesToUIBook(data.results[0]);

      return {
        success: true,
        data: book,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'iTunes lookup request timed out',
        };
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown iTunes lookup error',
      };
    }
  }
}

// Export a singleton instance
export const itunesSearchService = new ITunesSearchService();
