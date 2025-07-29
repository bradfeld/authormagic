import { Book, BookEdition } from '@/lib/types/book';

/**
 * Book Cover Utilities
 * Implements consistent edition-based cover selection across the application
 */

// Flexible book type for cover selection (works with partial book objects)
type BookWithEditions = {
  editions?: Array<{
    id: string;
    edition_number: number;
    publication_year?: number;
    bindings?: Array<{
      cover_image_url?: string;
    }>;
  }>;
};

/**
 * Find the most current edition that has a cover image
 * Priority: highest edition number, then most recent publication year
 */
export function getCurrentEdition(book: Book | BookWithEditions): any {
  if (!book.editions?.length) return null;

  // Filter to only editions that have at least one binding with a cover
  const editionsWithCovers = book.editions.filter(edition =>
    edition.bindings?.some(binding => binding.cover_image_url),
  );

  if (!editionsWithCovers.length) return null;

  // Sort by edition number (higher first), then by publication year (newer first)
  return editionsWithCovers.sort((a, b) => {
    // Primary sort: edition number (higher = more current)
    if (a.edition_number !== b.edition_number) {
      return b.edition_number - a.edition_number;
    }
    // Secondary sort: publication year (newer = more current)
    return (b.publication_year || 0) - (a.publication_year || 0);
  })[0];
}

/**
 * Get the cover image URL for a specific edition
 * Returns the first binding's cover found in the edition
 */
export function getEditionCover(edition: BookEdition | any): string | null {
  if (!edition?.bindings?.length) return null;

  // Find the first binding that has a cover image
  const bindingWithCover = edition.bindings.find(
    (binding: any) => binding.cover_image_url,
  );
  return bindingWithCover?.cover_image_url || null;
}

/**
 * Get the primary cover for a book (most current edition's cover)
 * This should be used consistently across book list and detail pages
 */
export function getBookPrimaryCover(
  book: Book | BookWithEditions,
): string | null {
  const currentEdition = getCurrentEdition(book);
  return currentEdition ? getEditionCover(currentEdition) : null;
}

/**
 * Get cover for a specific binding, with fallback to edition cover
 * This ensures all bindings in an edition show the same cover
 */
export function getBindingCover(
  bindingCoverUrl: string | null | undefined,
  edition: BookEdition,
): string | null {
  // Use binding's own cover if it exists
  if (bindingCoverUrl) return bindingCoverUrl;

  // Fallback to edition cover (inherit from other bindings in same edition)
  return getEditionCover(edition);
}
