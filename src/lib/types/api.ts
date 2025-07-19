// Types for external API responses and integrations

// Common API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Common API error structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ISBN DB API Types
export interface ISBNDBApiResponse<T> {
  book?: T;
  books?: T[];
  data?: T[]; // Added for compatibility with some ISBNDB responses
  total?: number;
  page?: number;
  show?: number;
}

export interface ISBNDBBookResponse {
  title: string;
  title_long?: string;
  isbn: string;
  isbn13: string;
  dewey_decimal?: string;
  binding: string;
  print_type?: string; // New field name used by the API
  publisher: string;
  language: string;
  date_published: string;
  edition?: string;
  content_version?: string; // New field name used by the API
  pages?: number;
  dimensions?: string;
  overview?: string;
  excerpt?: string;
  synopsis?: string;
  authors: string[];
  subjects: string[];
  reviews?: Record<string, unknown>[];
  prices?: Record<string, unknown>[];
  related?: Record<string, unknown>[];
  image?: string; // ISBNDB cover image URL
  cover_image?: string; // Alternative cover image field
}

export interface ISBNDBSearchResponse {
  books: ISBNDBBookResponse[];
  total: number;
  page: number;
  show: number;
}

export interface ISBNDBBindingTypesResponse {
  binding_types: string[];
}

export interface ISBNDBStatsResponse {
  total_books: number;
  total_authors: number;
  total_publishers: number;
  total_subjects: number;
  requests_remaining: number;
  requests_limit: number;
}

// Google Books API Types
export interface GoogleBooksApiResponse<T> {
  kind: string;
  totalItems: number;
  items?: T[];
}

export interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{
    type: 'ISBN_10' | 'ISBN_13' | 'ISSN' | 'OTHER';
    identifier: string;
  }>;
  readingModes?: {
    text: boolean;
    image: boolean;
  };
  pageCount?: number;
  printType?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  maturityRating?: string;
  allowAnonLogging?: boolean;
  contentVersion?: string;
  panelizationSummary?: Record<string, unknown>;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  language?: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
}

export interface GoogleBooksVolume {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: GoogleBooksVolumeInfo;
  saleInfo?: {
    country: string;
    saleability: string;
    isEbook: boolean;
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
    retailPrice?: {
      amount: number;
      currencyCode: string;
    };
    buyLink?: string;
    offers?: Record<string, unknown>[];
  };
  accessInfo?: {
    country: string;
    viewability: string;
    embeddable: boolean;
    publicDomain: boolean;
    textToSpeechPermission: string;
    epub?: {
      isAvailable: boolean;
      acsTokenLink?: string;
    };
    pdf?: {
      isAvailable: boolean;
      acsTokenLink?: string;
    };
    webReaderLink?: string;
    accessViewStatus?: string;
    quoteSharingAllowed?: boolean;
  };
  searchInfo?: {
    textSnippet?: string;
  };
}

// Goodreads API Types (if we integrate in the future)
export interface GoodreadsBookResponse {
  id: string;
  isbn: string;
  isbn13: string;
  title: string;
  title_without_series?: string;
  image_url?: string;
  small_image_url?: string;
  large_image_url?: string;
  link?: string;
  num_pages?: number;
  format?: string;
  edition_information?: string;
  publisher?: string;
  publication_day?: number;
  publication_year?: number;
  publication_month?: number;
  average_rating?: number;
  ratings_count?: number;
  description?: string;
  authors?: Array<{
    id: string;
    name: string;
    role?: string;
    image_url?: string;
    small_image_url?: string;
    link?: string;
    average_rating?: number;
    ratings_count?: number;
    text_reviews_count?: number;
  }>;
  work?: {
    id: string;
    books_count?: number;
    best_book_id?: string;
    reviews_count?: number;
    ratings_sum?: number;
    ratings_count?: number;
    text_reviews_count?: number;
    original_publication_year?: number;
    original_publication_month?: number;
    original_publication_day?: number;
  };
}

// Amazon API Types (if we integrate in the future)
export interface AmazonBookResponse {
  asin: string;
  title: string;
  sub_title?: string;
  authors?: string[];
  publisher?: string;
  publication_date?: string;
  pages?: number;
  binding?: string;
  isbn?: string;
  isbn13?: string;
  language?: string;
  price?: {
    amount: number;
    currency: string;
  };
  availability?: string;
  image_url?: string;
  description?: string;
  reviews?: {
    rating: number;
    count: number;
  };
  categories?: string[];
  rank?: number;
}

// API Client Configuration Types
export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface ApiRateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
}

// Search and Filter Types
export interface BookSearchOptions {
  query: string;
  authors?: string[];
  publisher?: string;
  year?: number;
  isbn?: string;
  language?: string;
  binding?: string;
  page?: number;
  limit?: number;
}

export interface BookSearchFilters {
  binding_types?: string[];
  languages?: string[];
  publishers?: string[];
  year_range?: {
    start: number;
    end: number;
  };
  page_range?: {
    min: number;
    max: number;
  };
  has_isbn?: boolean;
  has_description?: boolean;
  has_cover_image?: boolean;
}

// Data Transformation Types
export interface BookDataTransformation {
  source: 'isbn_db' | 'google_books' | 'goodreads' | 'amazon';
  confidence_score: number;
  mapping: {
    title: string;
    authors: string[];
    isbn_13?: string;
    isbn_10?: string;
    publisher?: string;
    publication_date?: string;
    description?: string;
    cover_image_url?: string;
    binding_type?: string;
    page_count?: number;
    genre?: string[];
    language?: string;
  };
  raw_data: Record<string, unknown>;
}

// Data Synchronization Types
export interface DataSyncStatus {
  source: string;
  last_sync: Date;
  status: 'success' | 'error' | 'in_progress' | 'pending';
  error_message?: string;
  records_processed: number;
  records_updated: number;
  records_created: number;
  records_failed: number;
}

export interface DataSyncConfig {
  sources: string[];
  schedule: string; // cron expression
  auto_sync: boolean;
  conflict_resolution: 'source_priority' | 'manual_review' | 'keep_both';
  source_priority: string[];
}

// Webhook Types (for future integrations)
export interface WebhookPayload {
  event: string;
  timestamp: Date;
  data: Record<string, unknown>;
  signature?: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  active: boolean;
}

// Bulk Operations Types
export interface BulkImportOptions {
  source: 'isbn_db' | 'google_books' | 'csv' | 'json';
  data: Record<string, unknown>[];
  validation_rules?: {
    require_isbn?: boolean;
    require_title?: boolean;
    require_authors?: boolean;
    auto_create_authors?: boolean;
    duplicate_handling?: 'skip' | 'update' | 'create_new';
  };
  mapping?: Record<string, string>;
}

export interface BulkImportResult {
  total_processed: number;
  successful_imports: number;
  failed_imports: number;
  skipped_imports: number;
  errors: Array<{
    row: number;
    error: string;
    data?: Record<string, unknown>;
  }>;
  created_books: string[];
  updated_books: string[];
  created_authors: string[];
}
