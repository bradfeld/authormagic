// ISBN DB API Service
// Primary service for fetching book data from ISBN Database

import {
  API_CONFIG,
  API_ERROR_TYPES,
  CACHE_KEYS,
  SEARCH_PARAMS,
} from '../constants/api-config';
import {
  ISBNDBApiResponse,
  ISBNDBBookResponse,
  ApiResponse,
} from '../types/api';
import { cacheWrapper, buildCacheKey } from '../utils/api-cache';
import { createRateLimiter, ExponentialBackoff } from '../utils/rate-limiter';

export class ISBNDBService {
  private baseUrl = 'https://api2.isbndb.com';
  private apiKey: string;
  private rateLimiter = createRateLimiter(
    'isbn-db',
    API_CONFIG.ISBN_DB.RATE_LIMIT,
  );
  private backoff: ExponentialBackoff;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env['ISBNDB_API_KEY'] || '';
    this.backoff = new ExponentialBackoff(3, 1000, 10000, true);

    if (!this.apiKey) {
      // Service will have limited functionality without API key
    }
  }

  // Get book by ISBN
  async getBookByISBN(isbn: string): Promise<ApiResponse<ISBNDBBookResponse>> {
    if (!isbn || isbn.length < 10) {
      return {
        success: false,
        error: 'Invalid ISBN provided',
      };
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.ISBN_DB_BOOK, { isbn });

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchBook(isbn),
        API_CONFIG.ISBN_DB.CACHE_TTL,
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Search books by title, author, or publisher
  async searchBooks(params: {
    title?: string;
    author?: string;
    publisher?: string;
    subject?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    const { title, author, publisher, subject } = params;

    if (!title && !author && !publisher && !subject) {
      return {
        success: false,
        error: 'At least one search parameter is required',
      };
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.ISBN_DB_SEARCH, params);

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.performSearch(params),
        API_CONFIG.ISBN_DB.CACHE_TTL,
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Search books by text (better results using ISBNDB's combined text search)
  async searchByText(
    searchText: string,
    page: number = 1,
    pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS,
  ): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    const cacheKey = buildCacheKey(CACHE_KEYS.ISBN_DB_SEARCH, {
      text: searchText,
      page,
      pageSize,
    });

    try {
      return await cacheWrapper(
        cacheKey,
        () => this.performTextSearch(searchText, page, pageSize),
        API_CONFIG.ISBN_DB.CACHE_TTL,
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Enhanced search method that tries multiple strategies to match ISBNDB website results
  async searchTitleAuthor(
    title: string,
    author: string,
    page: number = 1,
    pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS,
  ): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    const cacheKey = buildCacheKey(CACHE_KEYS.ISBN_DB_SEARCH, {
      title,
      author,
      page,
      pageSize,
    });

    try {
      return await cacheWrapper(
        cacheKey,
        async () => {
          // Strategy 1: Try quoted search first (most comprehensive and matches user expectations)
          const quotedSearch = `"${title}" "${author}"`;
          const quotedResult = await this.performTextSearch(
            quotedSearch,
            page,
            Math.max(pageSize, 30),
          );

          if (
            quotedResult.success &&
            quotedResult.data &&
            quotedResult.data.length > 0
          ) {
            // Less restrictive filtering for quoted search since the API already filtered
            const filteredBooks = quotedResult.data.filter(book => {
              const titleMatch = book.title
                .toLowerCase()
                .includes(title.toLowerCase());
              const authorMatch =
                book.authors?.some(a =>
                  a.toLowerCase().includes(author.toLowerCase()),
                ) || false;

              // For quoted search, if the API returned it, it's likely relevant
              // Only filter out obvious non-matches
              return titleMatch || authorMatch; // Changed from AND to OR - less restrictive
            });

            if (filteredBooks.length > 0) {
              return {
                success: true,
                data: this.rankBooks(filteredBooks, title),
              };
            }
          }

          // Strategy 2: Try separate title and author parameters (fallback)
          const separateResult = await this.performSearch({
            title,
            author,
            page,
            pageSize: Math.max(pageSize, 20),
          });

          if (
            separateResult.success &&
            separateResult.data &&
            separateResult.data.length > 0
          ) {
            return {
              success: true,
              data: this.rankBooks(separateResult.data, title),
            };
          }

          // Strategy 3: Author-first search (only if others fail)
          const authorResult = await this.getBooksByAuthor(author, 1, 50); // Reduced from 100 to 50

          if (
            authorResult.success &&
            authorResult.data &&
            authorResult.data.length > 0
          ) {
            // More flexible title matching - but only as fallback
            const titleMatches = authorResult.data.filter(book => {
              const bookTitle = book.title.toLowerCase();
              const searchTitle = title.toLowerCase();

              // Strategy 1: Direct substring match
              if (bookTitle.includes(searchTitle)) return true;

              // Strategy 2: Clean punctuation and try again
              const cleanBookTitle = bookTitle.replace(/[:\-\s]+/g, ' ').trim();
              const cleanSearchTitle = searchTitle
                .replace(/[:\-\s]+/g, ' ')
                .trim();
              if (cleanBookTitle.includes(cleanSearchTitle)) return true;

              // Strategy 3: Word-by-word matching (more flexible)
              const bookWords = cleanBookTitle
                .split(' ')
                .filter(w => w.length > 2);
              const searchWords = cleanSearchTitle
                .split(' ')
                .filter(w => w.length > 2);

              // If most search words are found in book title, it's a match
              if (searchWords.length > 0) {
                const matchingWords = searchWords.filter(searchWord =>
                  bookWords.some(
                    bookWord =>
                      bookWord.includes(searchWord) ||
                      searchWord.includes(bookWord),
                  ),
                );
                return (
                  matchingWords.length >=
                  Math.max(1, Math.floor(searchWords.length * 0.6))
                ); // 60% word match threshold
              }

              return false;
            });

            if (titleMatches.length > 0) {
              return {
                success: true,
                data: this.rankBooks(titleMatches, title),
              };
            }
          }

          return {
            success: false,
            error: 'No books found with any search strategy',
          };
        },
        API_CONFIG.ISBN_DB.CACHE_TTL,
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Get books by author
  async getBooksByAuthor(
    author: string,
    page: number = 1,
    pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS,
  ): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    return this.searchBooks({ author, page, pageSize });
  }

  // Get books by publisher
  async getBooksByPublisher(
    publisher: string,
    page: number = 1,
    pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS,
  ): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    return this.searchBooks({ publisher, page, pageSize });
  }

  // Get books by subject
  async getBooksBySubject(
    subject: string,
    page: number = 1,
    pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS,
  ): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    return this.searchBooks({ subject, page, pageSize });
  }

  // Book ranking utilities for surfacing primary editions first
  private rankBooks(
    books: ISBNDBBookResponse[],
    searchTitle?: string,
  ): ISBNDBBookResponse[] {
    return books
      .map(book => ({
        book,
        score: this.calculateBookScore(book, searchTitle),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.book);
  }

  private calculateBookScore(
    book: ISBNDBBookResponse,
    searchTitle?: string,
  ): number {
    let score = 0;

    // 1. Title relevance scoring (most important)
    if (searchTitle) {
      const title = book.title.toLowerCase();
      const search = searchTitle.toLowerCase();

      // Heavy penalty for summary/guide books that aren't the original
      if (
        title.includes('summary') ||
        title.includes('guide') ||
        title.includes('study guide')
      ) {
        score -= 500;
      }

      // Massive penalty for completely different books
      if (
        !title.includes(search) &&
        !search.includes(title.split(':')[0]?.trim())
      ) {
        score -= 1000;
      }

      // Bonus for exact title matches
      if (title === search || title.startsWith(search + ':')) {
        score += 100;
      }
    }

    // 2. Edition scoring (higher editions preferred)
    const editionScore = this.getEditionScore(book);
    score += editionScore;

    // 3. Date scoring (sweet spot around 2010-2015 for business books)
    const dateScore = this.getDateScore(book);
    score += dateScore;

    // 4. Binding type scoring (Hardcover > Paperback > Digital)
    const bindingScore = this.getBindingScore(book);
    score += bindingScore;

    return score;
  }

  private getEditionScore(book: ISBNDBBookResponse): number {
    const edition = String(book.edition || book.title || '');

    // Look for edition numbers in various formats
    // Format 1: "2nd", "3rd", "1st", etc. (with or without "edition")
    let editionMatch = edition.match(/(\d+)(?:st|nd|rd|th)\b/i);
    if (editionMatch) {
      return parseInt(editionMatch[1]) * 10; // Higher editions get more points
    }

    // Format 2: "2nd edition", "3rd edition", etc. (full format)
    editionMatch = edition.match(/(\d+)(?:st|nd|rd|th)?\s*edition/i);
    if (editionMatch) {
      return parseInt(editionMatch[1]) * 10;
    }

    // Format 3: Just the number "2", "3", etc. (but only if it's a reasonable edition number)
    editionMatch = edition.trim().match(/^(\d+)$/);
    if (editionMatch) {
      const editionNum = parseInt(editionMatch[1]);
      if (editionNum >= 1 && editionNum <= 20) {
        // Reasonable edition range
        return editionNum * 10;
      }
    }

    // Look for revised/updated editions
    if (/revised|updated|new/i.test(edition)) {
      return 5;
    }

    return 0;
  }

  private getDateScore(book: ISBNDBBookResponse): number {
    if (!book.date_published) return 0;

    const year = parseInt(book.date_published.substring(0, 4));

    // For newer editions of established books, don't penalize recency
    // Give higher scores to both original publication era AND newer editions
    if (year >= 2020) {
      return 8; // Recent editions (like 2nd editions) should rank well
    } else if (year >= 2015 && year <= 2019) {
      return 7; // Mid-period
    } else if (year >= 2010 && year <= 2014) {
      return 10; // Sweet spot for many business/tech books
    } else if (year >= 2000 && year <= 2009) {
      return 5; // Solid era
    }

    return 2; // Very old books get minimal score
  }

  private getBindingScore(book: ISBNDBBookResponse): number {
    const binding = (book.binding || '').toLowerCase();

    // If no binding specified, likely a main print edition - give it good score
    if (!book.binding || book.binding.trim() === '') {
      return 45; // Between hardcover and paperback
    }

    // Binding preference: Hardcover > Paperback > Kindle > ebook > Audible > MP3
    const bindingScores: Record<string, number> = {
      hardcover: 50,
      hardback: 50,
      paperback: 40,
      softcover: 40,
      kindle: 30,
      ebook: 25,
      digital: 25,
      audible: 15,
      audiobook: 15,
      'audio cd': 10,
      mp3_cd: 8,
      mp3: 5,
      cd: 5,
    };

    for (const [type, score] of Object.entries(bindingScores)) {
      if (binding.includes(type)) {
        return score;
      }
    }

    return 20; // Unknown binding type gets moderate score
  }

  // Private methods
  private async fetchBook(
    isbn: string,
  ): Promise<ApiResponse<ISBNDBBookResponse>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('isbn-db');

    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('isbn-db');
    }

    return this.backoff.execute(async () => {
      const url = `${this.baseUrl}${API_CONFIG.ISBN_DB.ENDPOINTS.BOOK}/${isbn}`;
      const response = await this.makeRequest(url);

      if (!response.book) {
        return {
          success: false,
          error: 'Book not found',
        };
      }

      return {
        success: true,
        data: response.book,
      };
    });
  }

  private async performSearch(params: {
    title?: string;
    author?: string;
    publisher?: string;
    subject?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('isbn-db');

    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('isbn-db');
    }

    return this.backoff.execute(async () => {
      const searchParams = new URLSearchParams();

      if (params.title) searchParams.append('title', params.title);
      if (params.author) searchParams.append('author', params.author);
      if (params.publisher) searchParams.append('publisher', params.publisher);
      if (params.subject) searchParams.append('subject', params.subject);
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize)
        searchParams.append('pageSize', params.pageSize.toString());

      const url = `${this.baseUrl}/search${API_CONFIG.ISBN_DB.ENDPOINTS.BOOKS}?${searchParams}`;
      const response = await this.makeRequest(url);

      // The search endpoint returns data in a 'data' array
      const books = response.data || [];

      // Apply intelligent ranking to surface primary editions first
      const rankedBooks = this.rankBooks(books, params.title);

      return {
        success: true,
        data: rankedBooks,
      };
    });
  }

  // Perform text-based search using ISBNDB's text parameter
  private async performTextSearch(
    searchText: string,
    page: number = 1,
    pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS,
  ): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('isbn-db');

    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('isbn-db');
    }

    return this.backoff.execute(async () => {
      const searchParams = new URLSearchParams();

      searchParams.append('text', searchText.trim());
      if (page) searchParams.append('page', page.toString());
      if (pageSize) searchParams.append('pageSize', pageSize.toString());

      const url = `${this.baseUrl}/search${API_CONFIG.ISBN_DB.ENDPOINTS.BOOKS}?${searchParams}`;
      const response = await this.makeRequest(url);

      // The search endpoint returns data in a 'data' array
      const books = response.data || [];

      // Apply intelligent ranking to surface primary editions first
      const rankedBooks = this.rankBooks(books, searchText);

      return {
        success: true,
        data: rankedBooks,
      };
    });
  }

  private async makeRequest(
    url: string,
  ): Promise<ISBNDBApiResponse<ISBNDBBookResponse>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.ISBN_DB.TIMEOUT,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private handleError(error: unknown): ApiResponse<never> {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          message: API_ERROR_TYPES.TIMEOUT,
        };
      }

      if (error.message.includes('401')) {
        return {
          success: false,
          error: 'Unauthorized - check API key',
          message: API_ERROR_TYPES.UNAUTHORIZED,
        };
      }

      if (error.message.includes('429')) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          message: API_ERROR_TYPES.RATE_LIMITED,
        };
      }

      if (error.message.includes('404')) {
        return {
          success: false,
          error: 'Not found',
          message: API_ERROR_TYPES.NOT_FOUND,
        };
      }

      return {
        success: false,
        error: error.message,
        message: API_ERROR_TYPES.API_ERROR,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred',
      message: API_ERROR_TYPES.API_ERROR,
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest(
        `${this.baseUrl}${API_CONFIG.ISBN_DB.ENDPOINTS.STATS}`,
      );
      return true;
    } catch {
      return false;
    }
  }

  // Get API usage statistics
  getRateLimitStatus(): {
    perMinute: number;
    perDay: number;
    resetTime: number;
  } {
    return this.rateLimiter.getRemainingRequests('isbn-db');
  }
}

// Export singleton instance
export const isbnDbService = new ISBNDBService();
export default ISBNDBService;
