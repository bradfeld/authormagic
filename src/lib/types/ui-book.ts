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
}

// Conversion utilities
import { ISBNDBBookResponse } from './api';
import { Book } from './book';
import { CompleteBook } from './book';

export function convertBookToUIBook(book: Book): UIBook {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle || undefined,
    authors: [], // Will be populated from relationships
    publisher: undefined, // Will be populated from editions
    published_date: book.publication_year
      ? book.publication_year.toString()
      : undefined,
    isbn: book.primary_isbn || undefined,
    categories: book.genre || [],
    description: book.description || undefined,
    page_count: undefined, // Will be populated from editions
    language: book.language || undefined,
    created_at: book.created_at,
    updated_at: book.updated_at,
  };
}

export function convertCompleteBookToUIBook(book: CompleteBook): UIBook {
  const firstEdition = book.book_editions?.[0];

  // TODO: Author names now handled by Clerk - need to fetch from Clerk API
  // For now, use placeholder until we implement Clerk metadata lookup
  const authors = book.book_authors?.map(() => 'Author') || [];

  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle || undefined,
    authors,
    publisher: firstEdition?.publisher || undefined,
    published_date:
      firstEdition?.publication_date ||
      (book.publication_year ? book.publication_year.toString() : undefined),
    isbn:
      book.primary_isbn ||
      firstEdition?.isbn_13 ||
      firstEdition?.isbn_10 ||
      undefined,
    categories: book.genre || [],
    description: book.description || undefined,
    page_count: firstEdition?.page_count || undefined,
    language: book.language || firstEdition?.language || undefined,
    data_source: book.external_book_data?.[0]?.source || undefined,
    external_id: book.external_book_data?.[0]?.external_id || undefined,
    created_at: book.created_at,
    updated_at: book.updated_at,
  };
}

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
    external_id: book.isbn13 || book.isbn || undefined,
    maturity_rating: undefined,
    print_type: book.print_type || book.binding || undefined,
    content_version: book.content_version || book.edition || undefined,
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
