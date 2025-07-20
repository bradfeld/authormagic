import { Database } from '../database.types';

// Keep only the Author type which is still used
export type Author = Database['public']['Tables']['authors']['Row'];

// Author roles enum (keep for potential future use)
export type AuthorRole =
  | 'author'
  | 'co-author'
  | 'editor'
  | 'illustrator'
  | 'translator'
  | 'contributor';

// Binding types (from ISBN DB API) - keep as these are used in services
export type BindingType =
  | 'hardcover'
  | 'paperback'
  | 'mass_market_paperback'
  | 'ebook'
  | 'audiobook'
  | 'audio_cd'
  | 'mp3_cd'
  | 'board_book'
  | 'spiral_bound'
  | 'kindle_edition'
  | 'pdf'
  | 'epub'
  | 'unknown';

// Availability status
export type AvailabilityStatus =
  | 'in_stock'
  | 'out_of_stock'
  | 'out_of_print'
  | 'pre_order'
  | 'limited_edition'
  | 'print_on_demand'
  | 'discontinued'
  | 'unknown';

// External data sources
export type ExternalDataSource =
  | 'isbn_db'
  | 'google_books'
  | 'goodreads'
  | 'amazon';
