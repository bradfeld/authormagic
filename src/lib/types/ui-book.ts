// UI-friendly book interfaces for dashboard components
export interface UIBook {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  published_date?: string;
  isbn?: string;
  categories?: string[];
  description?: string;
  page_count?: number;
  language?: string;
  data_source?: string;
  external_id?: string;
  maturity_rating?: string;
  print_type?: string;
  content_version?: string;
  created_at?: string;
  updated_at?: string;

  // Additional properties from various API sources
  thumbnail?: string;
  binding?: string;
  format?: string;
  edition?: string;
  dimensions?: string;
  weight?: string | number;
  msrp?: string | number;
  price?: string | number;

  // Publication validation fields
  validation?: {
    isReallyPublished: boolean;
    confidence: number;
    validationSources: string[];
    flags: string[];
    summary: string;
  };
  currency?: string;
  date_created?: string;
  dewey_decimal?: string;
  overview?: string;
  excerpt?: string;
  synopsys?: string; // Legacy typo - maps to synopsis
  synopsis?: string;
  image?: string;
  title_long?: string;
  related_isbns?: string[];
  subjects?: string[];

  // iTunes-specific fields for audiobooks
  preview_url?: string; // 30-second audio preview URL
  view_url?: string; // iTunes store page URL
  artist_view_url?: string; // Author's iTunes page URL
  duration_minutes?: number; // Audiobook duration in minutes
  reviews?: Record<string, unknown>[];
  prices?: Record<string, unknown>[];
  other_isbns?: string[];
  book_id?: string;
  other_isbns_bindings?: Record<string, unknown>[];
  coverUrl?: string;

  // Alternative property names for compatibility
  pages?: number; // Maps to page_count
  date_published?: string; // Maps to published_date
  isbn13?: string; // Maps to isbn
  year?: number; // Publication year as number

  // Source tracking
  source?: 'isbn-db' | 'google-books' | 'itunes' | 'manual';
  googleBooksId?: string; // Google Books volume ID
  itunesId?: string; // iTunes collection ID
}

// Conversion utilities
import { ISBNDBBookResponse, iTunesItem } from './api';
// Legacy imports and functions removed - Book and CompleteBook no longer used

export function convertISBNDBToUIBook(book: ISBNDBBookResponse): UIBook {
  return {
    id: book.isbn13 || book.isbn || `isbn-${Date.now()}`, // Generate unique ID from ISBN
    title: book.title,
    subtitle:
      book.title_long && book.title_long !== book.title
        ? book.title_long
        : undefined,
    authors: book.authors || [],
    publisher: book.publisher || undefined,
    published_date: book.date_published || undefined,
    isbn: book.isbn13 || book.isbn || undefined,
    categories: book.subjects || [],
    description: book.synopsis || book.overview || book.excerpt || undefined,
    page_count: book.pages || undefined,
    language: book.language || undefined,
    data_source: 'isbn_db',
    source: 'isbn-db',
    external_id: book.isbn13 || book.isbn || undefined,
    maturity_rating: undefined,
    print_type: book.print_type || book.binding || undefined,
    binding: book.binding || book.print_type || undefined, // <-- Added for grouping/UI
    edition: book.edition || undefined, // <-- Map edition field directly
    content_version: book.content_version || undefined, // <-- Keep content_version separate
    // ISBNDB doesn't provide images, but we include the fields for consistency
    image: undefined,
    thumbnail: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function convertITunesToUIBook(item: iTunesItem): UIBook {
  // Convert iTunes format to our binding type
  const getBindingType = (item: iTunesItem): string => {
    if (item.wrapperType === 'audiobook' || item.kind === 'audiobook') {
      return 'Audiobook';
    }
    // Default to audiobook since we're primarily using this for audiobook search
    return 'Audiobook';
  };

  return {
    id: item.collectionId?.toString() || `itunes-${Date.now()}`,
    title: item.collectionName || item.trackName || '',
    subtitle: undefined, // iTunes doesn't separate subtitle
    authors: item.artistName ? [item.artistName] : [],
    publisher: undefined, // iTunes doesn't provide publisher in search results
    published_date: item.releaseDate || undefined,
    isbn: undefined, // iTunes Search API doesn't return ISBN for audiobooks
    categories: item.primaryGenreName ? [item.primaryGenreName] : [],
    description: item.description || item.longDescription || undefined,
    page_count: undefined, // Not applicable for audiobooks
    language: undefined, // Would need to infer from country
    data_source: 'itunes',
    external_id:
      item.collectionId?.toString() || item.trackId?.toString() || undefined,

    // Price information
    price: item.collectionPrice || item.trackPrice || undefined,
    currency: item.currency || undefined,

    // iTunes-specific metadata
    preview_url: item.previewUrl || undefined,
    view_url: item.collectionViewUrl || item.trackViewUrl || undefined,
    artist_view_url: item.artistViewUrl || undefined,

    // Artwork/images
    image: item.artworkUrl100 || item.artworkUrl60 || undefined,
    thumbnail: item.artworkUrl60 || item.artworkUrl30 || undefined,

    // Binding and edition info
    binding: getBindingType(item),
    edition: undefined, // iTunes doesn't provide edition info
    content_version: undefined,

    // Duration for audiobooks
    duration_minutes: item.trackTimeMillis
      ? Math.round(item.trackTimeMillis / 60000)
      : undefined,

    // Source tracking
    source: 'itunes',
    itunesId:
      item.collectionId?.toString() || item.trackId?.toString() || undefined,

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Sample data for development
export const sampleUIBooks: UIBook[] = [
  {
    id: '1',
    title: 'The Great Gatsby',
    subtitle: 'A Novel',
    authors: ['F. Scott Fitzgerald'],
    publisher: "Charles Scribner's Sons",
    published_date: '1925',
    isbn: '9780743273565',
    categories: ['Fiction', 'Classic Literature'],
    description:
      'The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald.',
    page_count: 180,
    data_source: 'google_books',
    external_id: 'xyz123',
  },
  {
    id: '2',
    title: 'To Kill a Mockingbird',
    authors: ['Harper Lee'],
    publisher: 'J.B. Lippincott & Co.',
    published_date: '1960',
    isbn: '9780061120084',
    categories: ['Fiction', 'Classic Literature'],
    description:
      'To Kill a Mockingbird is a novel by Harper Lee published in 1960.',
    page_count: 376,
    data_source: 'isbn_db',
    external_id: 'abc456',
  },
];
