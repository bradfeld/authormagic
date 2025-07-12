import { Database } from '../database.types'

// Extract types from the Database interface
export type Book = Database['public']['Tables']['books']['Row']
export type BookInsert = Database['public']['Tables']['books']['Insert']
export type BookUpdate = Database['public']['Tables']['books']['Update']

export type BookAuthor = Database['public']['Tables']['book_authors']['Row']
export type BookAuthorInsert = Database['public']['Tables']['book_authors']['Insert']
export type BookAuthorUpdate = Database['public']['Tables']['book_authors']['Update']

export type BookEdition = Database['public']['Tables']['book_editions']['Row']
export type BookEditionInsert = Database['public']['Tables']['book_editions']['Insert']
export type BookEditionUpdate = Database['public']['Tables']['book_editions']['Update']

export type BookBinding = Database['public']['Tables']['book_bindings']['Row']
export type BookBindingInsert = Database['public']['Tables']['book_bindings']['Insert']
export type BookBindingUpdate = Database['public']['Tables']['book_bindings']['Update']

export type ExternalBookData = Database['public']['Tables']['external_book_data']['Row']
export type ExternalBookDataInsert = Database['public']['Tables']['external_book_data']['Insert']
export type ExternalBookDataUpdate = Database['public']['Tables']['external_book_data']['Update']

export type Author = Database['public']['Tables']['authors']['Row']

// Author roles enum
export type AuthorRole = 'author' | 'co-author' | 'editor' | 'illustrator' | 'translator' | 'contributor'

// Binding types (from ISBN DB API)
export type BindingType = 
  | 'hardcover'
  | 'paperback'
  | 'mass_market_paperback'
  | 'trade_paperback'
  | 'board_book'
  | 'spiral_bound'
  | 'ebook'
  | 'kindle'
  | 'audiobook'
  | 'audio_cd'
  | 'audio_cassette'
  | 'digital_audiobook'
  | 'library_binding'
  | 'school_library_binding'
  | 'unknown'

// Availability status
export type AvailabilityStatus = 
  | 'in_stock'
  | 'out_of_stock'
  | 'out_of_print'
  | 'pre_order'
  | 'limited_edition'
  | 'print_on_demand'
  | 'discontinued'
  | 'unknown'

// External data sources
export type ExternalDataSource = 
  | 'isbn_db'
  | 'google_books'
  | 'goodreads'
  | 'amazon'
  | 'apple_books'
  | 'kobo'
  | 'barnes_noble'

// Complex types for complete book data with relationships
export interface BookWithAuthors extends Book {
  book_authors: (BookAuthor & {
    authors: Author
  })[]
}

export interface BookWithEditions extends Book {
  book_editions: BookEdition[]
}

export interface BookWithBindings extends Book {
  book_editions: (BookEdition & {
    book_bindings: BookBinding[]
  })[]
}

export interface CompleteBook extends Book {
  book_authors: (BookAuthor & {
    authors: Author
  })[]
  book_editions: (BookEdition & {
    book_bindings: BookBinding[]
  })[]
  external_book_data: ExternalBookData[]
}

export interface EditionWithBindings extends BookEdition {
  book_bindings: BookBinding[]
}

// API-specific types for external data
export interface ISBNDBBookData {
  title: string
  title_long?: string
  isbn: string
  isbn13: string
  dewey_decimal?: string
  binding: string
  publisher: string
  language: string
  date_published: string
  edition?: string
  pages?: number
  dimensions?: string
  overview?: string
  excerpt?: string
  synopsis?: string
  authors: string[]
  subjects: string[]
  reviews: Record<string, unknown>[]
  prices: Record<string, unknown>[]
  related?: Record<string, unknown>[]
}

export interface GoogleBooksVolumeInfo {
  title: string
  subtitle?: string
  authors: string[]
  publisher: string
  publishedDate: string
  description: string
  industryIdentifiers: Array<{
    type: string
    identifier: string
  }>
  readingModes: {
    text: boolean
    image: boolean
  }
  pageCount: number
  printType: string
  categories: string[]
  averageRating?: number
  ratingsCount?: number
  maturityRating: string
  allowAnonLogging: boolean
  contentVersion: string
  panelizationSummary?: Record<string, unknown>
  imageLinks?: {
    smallThumbnail: string
    thumbnail: string
  }
  language: string
  previewLink: string
  infoLink: string
  canonicalVolumeLink: string
}

export interface GoogleBooksVolume {
  kind: string
  id: string
  etag: string
  selfLink: string
  volumeInfo: GoogleBooksVolumeInfo
  saleInfo?: Record<string, unknown>
  accessInfo?: Record<string, unknown>
  searchInfo?: Record<string, unknown>
}

// Form types for UI components
export interface BookFormData {
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
}

export interface EditionFormData {
  edition_name?: string
  publisher?: string
  publication_date?: string
  isbn_13?: string
  isbn_10?: string
  language?: string
  page_count?: number
  dimensions?: string
  weight_grams?: number
  description?: string
  cover_image_url?: string
}

export interface BindingFormData {
  binding_type: BindingType
  isbn_13?: string
  isbn_10?: string
  price_usd?: number
  availability?: AvailabilityStatus
  format_specific_data?: Record<string, unknown>
  retailer_urls?: Record<string, unknown>
}

export interface AuthorFormData {
  author_id: string
  author_role: AuthorRole
  author_order: number
}

// Search and import types
export interface BookSearchResult {
  source: ExternalDataSource
  id: string
  title: string
  authors: string[]
  isbn_13?: string
  isbn_10?: string
  publisher?: string
  publication_date?: string
  description?: string
  cover_image_url?: string
  binding_type?: string
  page_count?: number
  confidence_score?: number
}

export interface BookImportData {
  book_data: BookFormData
  editions: EditionFormData[]
  bindings: BindingFormData[]
  authors: AuthorFormData[]
  external_data: Array<{
    source: ExternalDataSource
    external_id: string
    data: Record<string, unknown>
  }>
}

// Utility types for data transformation
export interface BookHierarchyData {
  book: Book
  authors: Author[]
  editions: Array<{
    edition: BookEdition
    bindings: BookBinding[]
  }>
  external_data: ExternalBookData[]
}

export interface BookStatistics {
  total_books: number
  total_editions: number
  total_bindings: number
  books_by_status: Record<string, number>
  books_by_genre: Record<string, number>
  books_by_year: Record<string, number>
  most_recent_book: Book | null
  oldest_book: Book | null
} 