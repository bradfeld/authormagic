// Book Data Service
// Main orchestration service that unifies ISBN DB and Google Books APIs
// Handles data transformation and book hierarchy management

import { 
  BookHierarchyData,
  ExternalDataSource
} from '../types/book'

// Define missing types for the service
export interface NormalizedBookData {
  title: string
  subtitle?: string
  series?: string
  series_number?: number
  primary_isbn?: string
  publication_year?: number
  genre?: string[]
  language?: string
  description?: string
  cover_image_url?: string
  editions: NormalizedEditionData[]
  external_data: Array<{
    source: ExternalDataSource
    external_id: string
    data: Record<string, unknown>
  }>
}

export interface NormalizedEditionData {
  edition_name?: string
  isbn_10?: string
  isbn_13?: string
  publisher?: string
  publication_date?: string
  language?: string
  page_count?: number
  dimensions?: string
  edition_notes?: string
  bindings: NormalizedBindingData[]
}

export interface NormalizedBindingData {
  binding_type: string
  isbn_10?: string
  isbn_13?: string
  price?: number
  currency?: string
  availability?: string
  format_specific_data?: Record<string, unknown>
  retailer_urls?: Record<string, unknown>
}
import { 
  ISBNDBBookResponse, 
  GoogleBooksVolume, 
  ApiResponse 
} from '../types/api'
import { 
  API_CONFIG, 
  BINDING_TYPES, 
  CACHE_KEYS 
} from '../constants/api-config'
import { 
  cacheWithFallback, 
  buildCacheKey 
} from '../utils/api-cache'
import { isbnDbService } from './isbn-db.service'
import { googleBooksService } from './google-books.service'
import { createClient, createServiceClient } from '../supabase/server'

class BookDataService {
  private async getSupabaseClient() {
    return await createClient()
  }

  private getServiceClient() {
    return createServiceClient()
  }

  // Main method to fetch book data by ISBN
  async getBookByISBN(isbn: string): Promise<ApiResponse<NormalizedBookData>> {
    if (!isbn || isbn.length < 10) {
      return {
        success: false,
        error: 'Invalid ISBN provided'
      }
    }

    const cacheKey = buildCacheKey(CACHE_KEYS.BOOK_HIERARCHY, { isbn })

    try {
      return await cacheWithFallback(
        cacheKey,
        () => this.fetchFromISBNDB(isbn),
        () => this.fetchFromGoogleBooks(isbn),
        API_CONFIG.ISBN_DB.CACHE_TTL
      )
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Search books with fallback between services
  async searchBooks(params: {
    title?: string
    author?: string
    publisher?: string
    subject?: string
    isbn?: string
    maxResults?: number
  }): Promise<ApiResponse<NormalizedBookData[]>> {
    const cacheKey = buildCacheKey('book_search', params)

    try {
      return await cacheWithFallback(
        cacheKey,
        () => this.searchISBNDB(params),
        () => this.searchGoogleBooks(params),
        API_CONFIG.ISBN_DB.CACHE_TTL
      )
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Import book data into database
  async importBookData(bookData: NormalizedBookData, authorId: string): Promise<ApiResponse<BookHierarchyData>> {
    try {
      // Use service client for database write operations to bypass RLS
      const supabase = this.getServiceClient()
      
      // Start transaction
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          title: bookData.title,
          subtitle: bookData.subtitle,
          series: bookData.series,
          series_number: bookData.series_number,
          primary_isbn: bookData.primary_isbn,
          publication_year: bookData.publication_year,
          genre: bookData.genre,
          language: bookData.language,
          description: bookData.description,
          cover_image_url: bookData.cover_image_url
        })
        .select()
        .single()

      if (bookError) {
        return {
          success: false,
          error: `Failed to create book: ${bookError.message}`
        }
      }

      // Create book-author relationship
      const { error: authorError } = await supabase
        .from('book_authors')
        .insert({
          book_id: book.id,
          author_id: authorId,
          author_role: 'primary_author',
          author_order: 1
        })

      if (authorError) {
        return {
          success: false,
          error: `Failed to create author relationship: ${authorError.message}`
        }
      }

      // Create editions and bindings
      const createdEditions = []
      for (const edition of bookData.editions) {
        const { data: createdEdition, error: editionError } = await supabase
          .from('book_editions')
          .insert({
            book_id: book.id,
            edition_name: edition.edition_name,
            isbn_10: edition.isbn_10,
            isbn_13: edition.isbn_13,
            publisher: edition.publisher,
            publication_date: edition.publication_date,
            language: edition.language,
            page_count: edition.page_count,
            dimensions: edition.dimensions,
            description: edition.edition_notes
          })
          .select()
          .single()

        if (editionError) {
          return {
            success: false,
            error: `Failed to create edition: ${editionError.message}`
          }
        }

        // Create bindings for this edition
        const createdBindings = []
        for (const binding of edition.bindings) {
          const { data: createdBinding, error: bindingError } = await supabase
            .from('book_bindings')
            .insert({
              edition_id: createdEdition.id,
              binding_type: binding.binding_type,
              isbn_10: binding.isbn_10,
              isbn_13: binding.isbn_13,
              price_usd: binding.price,
              availability: binding.availability,
              format_specific_data: binding.format_specific_data,
              retailer_urls: binding.retailer_urls
            })
            .select()
            .single()

          if (bindingError) {
            return {
              success: false,
              error: `Failed to create binding: ${bindingError.message}`
            }
          }

          createdBindings.push(createdBinding)
        }

        createdEditions.push({
          ...createdEdition,
          bindings: createdBindings
        })
      }

      // Store external data
      for (const externalData of bookData.external_data) {
        await supabase
          .from('external_book_data')
          .insert({
            book_id: book.id,
            source: externalData.source,
            external_id: externalData.external_id,
            data: externalData.data
          })
      }

      return {
        success: true,
        data: {
          book: book,
          authors: [], // Will be populated separately
          editions: createdEditions.map(ed => ({
            edition: ed,
            bindings: ed.bindings || []
          })),
          external_data: bookData.external_data.map(extData => ({
            id: '',
            book_id: book.id,
            source: extData.source,
            external_id: extData.external_id,
            data: JSON.parse(JSON.stringify(extData.data)),
            last_synced: new Date().toISOString(),
            created_at: new Date().toISOString()
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Private methods for data fetching
  private async fetchFromISBNDB(isbn: string): Promise<ApiResponse<NormalizedBookData>> {
    const response = await isbnDbService.getBookByISBN(isbn)
    
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Unknown error'
      }
    }

    const normalizedData = this.normalizeISBNDBData(response.data)
    return {
      success: true,
      data: normalizedData
    }
  }

  private async fetchFromGoogleBooks(isbn: string): Promise<ApiResponse<NormalizedBookData>> {
    const response = await googleBooksService.getBookByISBN(isbn)
    
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Unknown error'
      }
    }

    const normalizedData = this.normalizeGoogleBooksData(response.data)
    return {
      success: true,
      data: normalizedData
    }
  }

  private async searchISBNDB(params: {
    title?: string
    author?: string
    publisher?: string
    subject?: string
    isbn?: string
    maxResults?: number
  }): Promise<ApiResponse<NormalizedBookData[]>> {
    const response = await isbnDbService.searchBooks(params)
    
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Unknown error'
      }
    }

    const normalizedData = response.data.map(book => this.normalizeISBNDBData(book))
    return {
      success: true,
      data: normalizedData
    }
  }

  private async searchGoogleBooks(params: {
    title?: string
    author?: string
    publisher?: string
    subject?: string
    isbn?: string
    maxResults?: number
  }): Promise<ApiResponse<NormalizedBookData[]>> {
    const response = await googleBooksService.searchBooks(params)
    
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Unknown error'
      }
    }

    const normalizedData = response.data.map(book => this.normalizeGoogleBooksData(book))
    return {
      success: true,
      data: normalizedData
    }
  }

  // Data normalization methods
  private normalizeISBNDBData(book: ISBNDBBookResponse): NormalizedBookData {
    const binding = this.normalizeBindingType(book.binding)
    
    return {
      title: book.title,
      subtitle: book.title_long && book.title_long !== book.title ? book.title_long : undefined,
      series: undefined, // Not typically provided by ISBN DB
      series_number: undefined,
      primary_isbn: book.isbn13 || book.isbn,
      publication_year: book.date_published ? new Date(book.date_published).getFullYear() : undefined,
      genre: book.subjects || [],
      language: book.language || 'en',
      description: book.synopsis || book.overview || book.excerpt,
      cover_image_url: undefined, // Not typically provided by ISBN DB
      editions: [{
        edition_name: book.edition || '1st',
        isbn_10: book.isbn.length === 10 ? book.isbn : undefined,
        isbn_13: book.isbn13,
        publisher: book.publisher,
        publication_date: book.date_published,
        language: book.language || 'en',
        page_count: book.pages,
        dimensions: book.dimensions,
        edition_notes: undefined,
        bindings: [{
          binding_type: binding,
          isbn_10: book.isbn.length === 10 ? book.isbn : undefined,
          isbn_13: book.isbn13,
          price: undefined,
          currency: undefined,
          availability: 'unknown',
          format_specific_data: {},
          retailer_urls: {}
        }]
      }],
      external_data: [{
        source: 'isbn_db',
        external_id: book.isbn13 || book.isbn,
        data: book as unknown as Record<string, unknown>
      }]
    }
  }

  private normalizeGoogleBooksData(book: GoogleBooksVolume): NormalizedBookData {
    const volumeInfo = book.volumeInfo
    const industryIdentifiers = volumeInfo.industryIdentifiers || []
    const isbn13 = industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier
    const isbn10 = industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier

    return {
      title: volumeInfo.title,
      subtitle: volumeInfo.subtitle,
      series: undefined, // Not typically provided by Google Books
      series_number: undefined,
      primary_isbn: isbn13 || isbn10,
      publication_year: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate).getFullYear() : undefined,
      genre: volumeInfo.categories || [],
      language: volumeInfo.language || 'en',
      description: volumeInfo.description,
      cover_image_url: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail,
      editions: [{
        edition_name: '1st', // Default since Google Books doesn't specify
        isbn_10: isbn10,
        isbn_13: isbn13,
        publisher: volumeInfo.publisher,
        publication_date: volumeInfo.publishedDate,
        language: volumeInfo.language || 'en',
        page_count: volumeInfo.pageCount,
        dimensions: undefined,
        edition_notes: undefined,
        bindings: [{
          binding_type: this.inferBindingFromGoogleBooks(volumeInfo as unknown as Record<string, unknown>),
          isbn_10: isbn10,
          isbn_13: isbn13,
          price: undefined,
          currency: undefined,
          availability: 'unknown',
          format_specific_data: {
            maturityRating: volumeInfo.maturityRating,
            averageRating: volumeInfo.averageRating,
            ratingsCount: volumeInfo.ratingsCount
          },
          retailer_urls: {
            googleBooks: volumeInfo.previewLink,
            infoLink: volumeInfo.infoLink,
            canonicalVolumeLink: volumeInfo.canonicalVolumeLink
          }
        }]
      }],
      external_data: [{
        source: 'google_books',
        external_id: book.id,
        data: book as unknown as Record<string, unknown>
      }]
    }
  }

  private normalizeBindingType(binding: string): string {
    const bindingLower = binding.toLowerCase()
    
    if (bindingLower.includes('hardcover') || bindingLower.includes('hard cover')) {
      return BINDING_TYPES.HARDCOVER
    }
    if (bindingLower.includes('paperback') || bindingLower.includes('paper back')) {
      return BINDING_TYPES.PAPERBACK
    }
    if (bindingLower.includes('mass market')) {
      return BINDING_TYPES.MASS_MARKET
    }
    if (bindingLower.includes('kindle')) {
      return BINDING_TYPES.KINDLE
    }
    if (bindingLower.includes('ebook') || bindingLower.includes('e-book')) {
      return BINDING_TYPES.EBOOK
    }
    if (bindingLower.includes('audio')) {
      return BINDING_TYPES.AUDIOBOOK
    }
    if (bindingLower.includes('board book')) {
      return BINDING_TYPES.BOARD_BOOK
    }
    if (bindingLower.includes('spiral')) {
      return BINDING_TYPES.SPIRAL_BOUND
    }
    
    return BINDING_TYPES.UNKNOWN
  }

  private inferBindingFromGoogleBooks(volumeInfo: Record<string, unknown>): string {
    if (volumeInfo.printType === 'BOOK') {
      return BINDING_TYPES.PAPERBACK // Default assumption
    }
    return BINDING_TYPES.UNKNOWN
  }

  // Health check for all services
  async healthCheck(): Promise<{
    isbnDb: boolean
    googleBooks: boolean
    database: boolean
  }> {
    const [isbnDbStatus, googleBooksStatus] = await Promise.all([
      isbnDbService.healthCheck().catch(() => false),
      googleBooksService.healthCheck().catch(() => false)
    ])

    let databaseStatus = false
    try {
      // Use service client for health check to bypass RLS
      const supabase = this.getServiceClient()
      const { error } = await supabase.from('books').select('id').limit(1)
      databaseStatus = !error
    } catch {
      databaseStatus = false
    }

    return {
      isbnDb: isbnDbStatus,
      googleBooks: googleBooksStatus,
      database: databaseStatus
    }
  }
}

// Export singleton instance
export const bookDataService = new BookDataService()
export default BookDataService 