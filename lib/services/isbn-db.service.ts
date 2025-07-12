// ISBN DB API Service
// Primary service for fetching book data from ISBN Database

import { 
  ISBNDBApiResponse, 
  ISBNDBBookResponse, 
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

class ISBNDBService {
  private apiKey: string
  private baseUrl: string
  private rateLimiter = createRateLimiter(
    'isbn-db',
    API_CONFIG.ISBN_DB.RATE_LIMIT
  )
  private backoff = new ExponentialBackoff(
    API_CONFIG.ISBN_DB.RETRY_ATTEMPTS,
    API_CONFIG.ISBN_DB.RETRY_DELAY
  )

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ISBN_DB_API_KEY || ''
    this.baseUrl = API_CONFIG.ISBN_DB.BASE_URL
    
    if (!this.apiKey) {
      console.warn('ISBN DB API key not provided')
    }
  }

  // Get book by ISBN
  async getBookByISBN(isbn: string): Promise<ApiResponse<ISBNDBBookResponse>> {
    if (!isbn || isbn.length < 10) {
      return {
        success: false,
        error: 'Invalid ISBN provided'
      }
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.ISBN_DB_BOOK, { isbn })
    
    try {
      return await cacheWrapper(
        cacheKey,
        () => this.fetchBook(isbn),
        API_CONFIG.ISBN_DB.CACHE_TTL
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  // Search books by title, author, or publisher
  async searchBooks(params: {
    title?: string
    author?: string
    publisher?: string
    subject?: string
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    const { title, author, publisher, subject } = params
    
    if (!title && !author && !publisher && !subject) {
      return {
        success: false,
        error: 'At least one search parameter is required'
      }
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.ISBN_DB_SEARCH, params)
    
    try {
      return await cacheWrapper(
        cacheKey,
        () => this.performSearch(params),
        API_CONFIG.ISBN_DB.CACHE_TTL
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  // Get books by author
  async getBooksByAuthor(author: string, page: number = 1, pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    return this.searchBooks({ author, page, pageSize })
  }

  // Get books by publisher
  async getBooksByPublisher(publisher: string, page: number = 1, pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    return this.searchBooks({ publisher, page, pageSize })
  }

  // Get books by subject
  async getBooksBySubject(subject: string, page: number = 1, pageSize: number = SEARCH_PARAMS.DEFAULT_RESULTS): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    return this.searchBooks({ subject, page, pageSize })
  }

  // Private methods
  private async fetchBook(isbn: string): Promise<ApiResponse<ISBNDBBookResponse>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('isbn-db')
    
    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('isbn-db')
    }

    return this.backoff.execute(async () => {
      const url = `${this.baseUrl}${API_CONFIG.ISBN_DB.ENDPOINTS.BOOK}/${isbn}`
      const response = await this.makeRequest(url)
      
      if (!response.book) {
        return {
          success: false,
          error: 'Book not found'
        }
      }

      return {
        success: true,
        data: response.book
      }
    })
  }

  private async performSearch(params: {
    title?: string
    author?: string
    publisher?: string
    subject?: string
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<ISBNDBBookResponse[]>> {
    const canMakeRequest = await this.rateLimiter.checkLimit('isbn-db')
    
    if (!canMakeRequest) {
      await this.rateLimiter.waitForSlot('isbn-db')
    }

    return this.backoff.execute(async () => {
      const searchParams = new URLSearchParams()
      
      if (params.title) searchParams.append('title', params.title)
      if (params.author) searchParams.append('author', params.author)
      if (params.publisher) searchParams.append('publisher', params.publisher)
      if (params.subject) searchParams.append('subject', params.subject)
      if (params.page) searchParams.append('page', params.page.toString())
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString())

      const url = `${this.baseUrl}${API_CONFIG.ISBN_DB.ENDPOINTS.BOOKS}?${searchParams}`
      const response = await this.makeRequest(url)
      
      return {
        success: true,
        data: response.books || []
      }
    })
  }

  private async makeRequest(url: string): Promise<ISBNDBApiResponse<ISBNDBBookResponse>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.ISBN_DB.TIMEOUT)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
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
      await this.makeRequest(`${this.baseUrl}${API_CONFIG.ISBN_DB.ENDPOINTS.STATS}`)
      return true
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
    return this.rateLimiter.getRemainingRequests('isbn-db')
  }
}

// Export singleton instance
export const isbnDbService = new ISBNDBService()
export default ISBNDBService 