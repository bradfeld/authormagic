/**
 * Primary Book System Types
 * 3-level structure: PrimaryBook → BookEdition → BookBinding
 */

export interface BookBinding {
  id: string;
  book_edition_id: string;
  isbn?: string;
  binding_type: string; // hardcover, paperback, ebook, audiobook, etc.
  price?: number;
  publisher?: string;
  cover_image_url?: string;
  description?: string;
  pages?: number;
  language: string;
  created_at: string;
}

export interface BookEdition {
  id: string;
  primary_book_id: string;
  edition_number: number;
  publication_year?: number;
  created_at: string;
  bindings: BookBinding[];
}

export interface PrimaryBook {
  id: string;
  user_id: string;
  title: string;
  author: string;
  selected_edition_id?: string;
  created_at: string;
  updated_at: string;
  editions: BookEdition[];
}

/**
 * Database row types (without joined data)
 */
export interface PrimaryBookRow {
  id: string;
  user_id: string;
  title: string;
  author: string;
  selected_edition_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BookEditionRow {
  id: string;
  primary_book_id: string;
  edition_number: number;
  publication_year?: number;
  created_at: string;
}

export interface BookBindingRow {
  id: string;
  book_edition_id: string;
  isbn?: string;
  binding_type: string;
  price?: number;
  publisher?: string;
  cover_image_url?: string;
  description?: string;
  pages?: number;
  language: string;
  created_at: string;
}

/**
 * Types for creating new records
 */
export interface CreatePrimaryBookRequest {
  title: string;
  author: string;
  selected_edition_id?: string;
}

export interface CreateBookEditionRequest {
  primary_book_id: string;
  edition_number: number;
  publication_year?: number;
}

export interface CreateBookBindingRequest {
  book_edition_id: string;
  isbn?: string;
  binding_type: string;
  price?: number;
  publisher?: string;
  cover_image_url?: string;
  description?: string;
  pages?: number;
  language?: string;
}

/**
 * Types for search and selection workflow
 */
export interface EditionGroup {
  edition_number: number;
  publication_year?: number;
  bindings: BookBinding[];
}

export interface BookSearchResult {
  title: string;
  author: string;
  editions: EditionGroup[];
}

/**
 * Common binding types
 */
export const BINDING_TYPES = {
  HARDCOVER: 'hardcover',
  PAPERBACK: 'paperback',
  EBOOK: 'ebook',
  AUDIOBOOK: 'audiobook',
  MASS_MARKET: 'mass_market',
  BOARD_BOOK: 'board_book',
  SPIRAL_BOUND: 'spiral_bound',
  LEATHER_BOUND: 'leather_bound',
} as const;

export type BindingType = typeof BINDING_TYPES[keyof typeof BINDING_TYPES];

/**
 * Utility type for working with selected edition
 */
export interface PrimaryBookWithSelectedEdition extends PrimaryBook {
  selected_edition?: BookEdition;
} 