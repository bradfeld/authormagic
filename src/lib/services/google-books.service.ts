// Google Books API Service
// Backup service for fetching book data from Google Books

import { 
  GoogleBooksApiResponse, 
  GoogleBooksVolume, 
  ApiResponse
} from '../types/api'
import { 
  API_CONFIG, 
  API_ERROR_TYPES, 
  CACHE_KEYS, 
  SEARCH_PARAMS 
} from '../constants/api-config'
import { 
  createRateLimiter, 
  ExponentialBackoff 
} from '../utils/rate-limiter'
import { 
  cacheWrapper, 
  buildCacheKey 
} from '../utils/api-cache'

class GoogleBooksService {
  private apiKey: string
  private baseUrl: string
  private rateLimiter = createRateLimiter(
    'google-books',
    API_CONFIG.GOOGLE_BOOKS.RATE_LIMIT
  )
  private backoff = new ExponentialBackoff(
    API_CONFIG.GOOGLE_BOOKS.RETRY_ATTEMPTS,
    API_CONFIG.GOOGLE_BOOKS.RETRY_DELAY
  )

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_BOOKS_API_KEY || ''
    this.baseUrl = API_CONFIG.GOOGLE_BOOKS.BASE_URL
  }

  // Get book by ISBN
  async getBookByISBN(isbn: string): Promise<ApiResponse<GoogleBooksVolume>> {
    if (!isbn || isbn.length < 10) {
      return {
        success: false,
        error: 'Invalid ISBN provided'
      }
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.GOOGLE_BOOKS_VOLUME, { isbn })
    
    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchBookByISBN(isbn),
        API_CONFIG.GOOGLE_BOOKS.CACHE_TTL
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  // Search books by various parameters
  async searchBooks(params: {
    query?: string
    title?: string
    author?: string
    publisher?: string
    subject?: string
    isbn?: string
    startIndex?: number
    maxResults?: number
    orderBy?: 'relevance' | 'newest'
    printType?: 'all' | 'books' | 'magazines'
    projection?: 'full' | 'lite'
  }): Promise<ApiResponse<GoogleBooksVolume[]>> {
    const { 
      query, 
      title, 
      author, 
      publisher, 
      subject, 
      isbn
    } = params
    
    if (!query && !title && !author && !publisher && !subject && !isbn) {
      return {
        success: false,
        error: 'At least one search parameter is required'
      }
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.GOOGLE_BOOKS_SEARCH, params)
    
    try {
      return await cacheWrapper(
        cacheKey,
        () => this.performSearch(params),
        API_CONFIG.GOOGLE_BOOKS.CACHE_TTL
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  // Get books by author
  async getBooksByAuthor(author: string, maxResults: number = SEARCH_PARAMS.DEFAULT_RESULTS): Promise<ApiResponse<GoogleBooksVolume[]>> {
    return this.searchBooks({ author, maxResults })
  }

  // Get books by publisher
  async getBooksByPublisher(publisher: string, maxResults: number = SEARCH_PARAMS.DEFAULT_RESULTS): Promise<ApiResponse<GoogleBooksVolume[]>> {
    return this.searchBooks({ publisher, maxResults })
  }

  // Get books by subject
  async getBooksBySubject(subject: string, maxResults: number = SEARCH_PARAMS.DEFAULT_RESULTS): Promise<ApiResponse<GoogleBooksVolume[]>> {
    return this.searchBooks({ subject, maxResults })
  }

  // Get book by Google Books ID
  async getBookById(volumeId: string): Promise<ApiResponse<GoogleBooksVolume>> {
    if (!volumeId) {
      return {
        success: false,
        error: 'Volume ID is required'
      }
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.GOOGLE_BOOKS_VOLUME, { volumeId })
    
    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchBookById(volumeId),
        API_CONFIG.GOOGLE_BOOKS.CACHE_TTL
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  // Private methods
  private async fetchBookByISBN(isbn: string): Promise<ApiResponse<GoogleBooksVolume>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('google-books')
    
    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('google-books')
    }

    return this.backoff.execute(async () => {
      const searchParams = new URLSearchParams({
        q: `isbn:${isbn}`,
        maxResults: '1'
      })

      if (this.apiKey) {
        searchParams.append('key', this.apiKey)
      }

      const url = `${this.baseUrl}${API_CONFIG.GOOGLE_BOOKS.ENDPOINTS.VOLUMES}?${searchParams}`
      const response = await this.makeRequest(url)
      
      if (!response.items || response.items.length === 0) {
        return {
          success: false,
          error: 'Book not found'
        }
      }

      return {
        success: true,
        data: response.items[0]
      }
    })
  }

  private async fetchBookById(volumeId: string): Promise<ApiResponse<GoogleBooksVolume>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('google-books')
    
    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('google-books')
    }

    return this.backoff.execute(async () => {
      const searchParams = new URLSearchParams()
      
      if (this.apiKey) {
        searchParams.append('key', this.apiKey)
      }

      const url = `${this.baseUrl}${API_CONFIG.GOOGLE_BOOKS.ENDPOINTS.VOLUME.replace('{id}', volumeId)}?${searchParams}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        success: true,
        data: data
      }
    })
  }

  private async performSearch(params: {
    query?: string
    title?: string
    author?: string
    publisher?: string
    subject?: string
    isbn?: string
    startIndex?: number
    maxResults?: number
    orderBy?: 'relevance' | 'newest'
    printType?: 'all' | 'books' | 'magazines'
    projection?: 'full' | 'lite'
  }): Promise<ApiResponse<GoogleBooksVolume[]>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('google-books')
    
    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('google-books')
    }

    return this.backoff.execute(async () => {
      const searchParams = new URLSearchParams()
      
      // Build query string
      let queryString = ''
      if (params.query) {
        queryString = params.query
      } else {
        const queryParts = []
        if (params.title) queryParts.push(`intitle:${params.title}`)
        if (params.author) queryParts.push(`inauthor:${params.author}`)
        if (params.publisher) queryParts.push(`inpublisher:${params.publisher}`)
        if (params.subject) queryParts.push(`subject:${params.subject}`)
        if (params.isbn) queryParts.push(`isbn:${params.isbn}`)
        
        queryString = queryParts.join('+')
      }
      
      searchParams.append('q', queryString)
      searchParams.append('startIndex', (params.startIndex || 0).toString())
      searchParams.append('maxResults', Math.min(params.maxResults || SEARCH_PARAMS.DEFAULT_RESULTS, SEARCH_PARAMS.MAX_RESULTS).toString())
      searchParams.append('orderBy', params.orderBy || 'relevance')
      searchParams.append('printType', params.printType || 'books')
      searchParams.append('projection', params.projection || 'full')
      
      if (this.apiKey) {
        searchParams.append('key', this.apiKey)
      }

      const url = `${this.baseUrl}${API_CONFIG.GOOGLE_BOOKS.ENDPOINTS.VOLUMES}?${searchParams}`
      const response = await this.makeRequest(url)
      
      return {
        success: true,
        data: response.items || []
      }
    })
  }

  private async makeRequest(url: string): Promise<GoogleBooksApiResponse<GoogleBooksVolume>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.GOOGLE_BOOKS.TIMEOUT)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private handleError(error: unknown): ApiResponse<never> {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          message: API_ERROR_TYPES.TIMEOUT
        }
      }
      
      if (error.message.includes('401')) {
        return {
          success: false,
          error: 'Unauthorized - check API key',
          message: API_ERROR_TYPES.UNAUTHORIZED
        }
      }
      
      if (error.message.includes('429')) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          message: API_ERROR_TYPES.RATE_LIMITED
        }
      }
      
      if (error.message.includes('404')) {
        return {
          success: false,
          error: 'Not found',
          message: API_ERROR_TYPES.NOT_FOUND
        }
      }
      
      return {
        success: false,
        error: error.message,
        message: API_ERROR_TYPES.API_ERROR
      }
    }
    
    return {
      success: false,
      error: 'Unknown error occurred',
      message: API_ERROR_TYPES.API_ERROR
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.searchBooks({ 
        query: 'test', 
        maxResults: 1 
      })
      return response.success
    } catch {
      return false
    }
  }

  // Get API usage statistics
  getRateLimitStatus(): {
    perMinute: number
    perDay: number
    resetTime: number
  } {
    return this.rateLimiter.getRemainingRequests('google-books')
  }
}

// Export singleton instance
export const googleBooksService = new GoogleBooksService()
export default GoogleBooksService 