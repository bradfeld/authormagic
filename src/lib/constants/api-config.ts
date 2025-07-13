// API Configuration Constants
export const API_CONFIG = {
  ISBN_DB: {
    BASE_URL: 'https://api2.isbndb.com',
    ENDPOINTS: {
      BOOK: '/book',
      BOOKS: '/books',           // For batch ISBN lookup (POST)
      SEARCH_BOOKS: '/search/books',  // For text search (GET)
      AUTHOR: '/author',
      AUTHORS: '/authors',
      PUBLISHER: '/publisher',
      PUBLISHERS: '/publishers',
      SUBJECT: '/subject',
      SUBJECTS: '/subjects',
      STATS: '/stats'
    },
    RATE_LIMIT: {
      requestsPerMinute: 100,
      requestsPerDay: 1000,
      burstLimit: 10
    },
    CACHE_TTL: 60 * 60 * 24, // 24 hours
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    TIMEOUT: 10000 // 10 seconds
  },
  
  GOOGLE_BOOKS: {
    BASE_URL: 'https://www.googleapis.com/books/v1',
    ENDPOINTS: {
      VOLUMES: '/volumes',
      VOLUME: '/volumes/{id}',
      MYLIBRARY: '/mylibrary'
    },
    RATE_LIMIT: {
      requestsPerMinute: 1000,
      requestsPerDay: 100000,
      burstLimit: 100
    },
    CACHE_TTL: 60 * 60 * 12, // 12 hours
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 500, // 500ms
    TIMEOUT: 8000 // 8 seconds
  }
} as const

// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

// API Error Types
export const API_ERROR_TYPES = {
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  API_ERROR: 'API_ERROR'
} as const

// Binding types from ISBN DB API
export const BINDING_TYPES = {
  HARDCOVER: 'Hardcover',
  PAPERBACK: 'Paperback',
  MASS_MARKET: 'Mass Market Paperback',
  BOARD_BOOK: 'Board book',
  SPIRAL_BOUND: 'Spiral-bound',
  LIBRARY_BINDING: 'Library Binding',
  AUDIO_CD: 'Audio CD',
  AUDIO_CASSETTE: 'Audio Cassette',
  KINDLE: 'Kindle Edition',
  EBOOK: 'eBook',
  EPUB: 'EPUB',
  PDF: 'PDF',
  AUDIOBOOK: 'Audiobook',
  DIGITAL: 'Digital',
  UNKNOWN: 'Unknown'
} as const

// Search parameters
export const SEARCH_PARAMS = {
  MAX_RESULTS: 60,
  DEFAULT_RESULTS: 40,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 500
} as const

// Cache keys
export const CACHE_KEYS = {
  ISBN_DB_BOOK: 'isbn_db:book:',
  ISBN_DB_SEARCH: 'isbn_db:search:',
  GOOGLE_BOOKS_VOLUME: 'google_books:volume:',
  GOOGLE_BOOKS_SEARCH: 'google_books:search:',
  BOOK_HIERARCHY: 'book_hierarchy:',
  AUTHOR_BOOKS: 'author_books:'
} as const 