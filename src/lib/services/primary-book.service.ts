/**
 * Primary Book Service
 * Handles CRUD operations for the Primary Books system
 */

import { createServiceClient } from '@/lib/supabase/server';
import {
  PrimaryBook,
  BookEdition,
  BookBinding,
  PrimaryBookInsert,
  PrimaryBookEditionInsert,
  PrimaryBookBindingInsert,
} from '@/lib/types/primary-book';
import { UIBook } from '@/lib/types/ui-book';

import {
  EditionDetectionService,
  EditionGroup,
} from './edition-detection.service';

export class PrimaryBookService {
  private static _supabase: ReturnType<typeof createServiceClient> | null =
    null;

  private static getSupabase() {
    if (!this._supabase) {
      this._supabase = createServiceClient();
    }
    return this._supabase;
  }

  /**
   * Create a new Primary Book with editions and bindings
   */
  static async createPrimaryBook(
    userId: string,
    title: string,
    author: string,
    searchResults: UIBook[],
    selectedEditionNumber?: number,
  ): Promise<PrimaryBook> {
    // Group books by edition
    const editionGroups = EditionDetectionService.groupByEdition(searchResults);

    // Create primary book record
    const primaryBookData: PrimaryBookInsert = {
      user_id: userId,
      title,
      author,
      selected_edition_id: undefined, // Will be set after creating editions
    };

    const { data: primaryBook, error: primaryBookError } =
      await this.getSupabase()
        .from('primary_books')
        .insert(primaryBookData)
        .select()
        .single();

    if (primaryBookError) {
      throw new Error(
        `Failed to create primary book: ${primaryBookError.message}`,
      );
    }

    // Create editions and bindings
    const editions = await this.createEditionsWithBindings(
      primaryBook.id,
      editionGroups,
    );

    // Select the default edition (latest if not specified)
    const selectedEdition = selectedEditionNumber
      ? editions.find(e => e.edition_number === selectedEditionNumber)
      : editions[0]; // First edition (latest due to sorting)

    if (selectedEdition) {
      await this.updateSelectedEdition(primaryBook.id, selectedEdition.id);
    }

    return {
      ...primaryBook,
      editions,
      selected_edition_id: selectedEdition?.id,
    };
  }

  /**
   * Find existing primary book by user, title, and author
   */
  static async findExistingBook(
    userId: string,
    title: string,
    author: string,
  ): Promise<PrimaryBook | null> {
    const { data: existingBook, error } = await this.getSupabase()
      .from('primary_books')
      .select(
        `
        *,
        editions:primary_book_editions!primary_book_editions_primary_book_id_fkey (
          *,
          bindings:primary_book_bindings!primary_book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('user_id', userId)
      .eq('title', title)
      .eq('author', author)
      .single();

    if (error) {
      // If no book found, return null (this is expected)
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to check for existing book: ${error.message}`);
    }

    return {
      ...existingBook,
      editions: existingBook.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    };
  }

  /**
   * Update existing book with new edition data
   */
  static async updateBookWithNewEditions(
    primaryBookId: string,
    searchResults: UIBook[],
  ): Promise<PrimaryBook> {
    // Group books by edition
    const editionGroups = EditionDetectionService.groupByEdition(searchResults);

    // Add new editions and bindings (existing ones will be skipped due to unique constraints)
    await this.createEditionsWithBindings(primaryBookId, editionGroups);

    // Get the updated book with all editions
    const { data: updatedBook, error } = await this.getSupabase()
      .from('primary_books')
      .select(
        `
        *,
        editions:primary_book_editions!primary_book_editions_primary_book_id_fkey (
          *,
          bindings:primary_book_bindings!primary_book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('id', primaryBookId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch updated book: ${error.message}`);
    }

    return {
      ...updatedBook,
      editions: updatedBook.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    };
  }

  /**
   * Get user's primary books with editions and bindings
   */
  static async getUserPrimaryBooks(userId: string): Promise<PrimaryBook[]> {
    const { data: primaryBooks, error } = await this.getSupabase()
      .from('primary_books')
      .select(
        `
        *,
        editions:primary_book_editions!primary_book_editions_primary_book_id_fkey (
          *,
          bindings:primary_book_bindings!primary_book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch primary books: ${error.message}`);
    }

    return primaryBooks.map(book => ({
      ...book,
      editions: book.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    }));
  }

  /**
   * Get a specific primary book by ID
   */
  static async getPrimaryBookById(
    primaryBookId: string,
    userId: string,
  ): Promise<PrimaryBook | null> {
    const { data: primaryBook, error } = await this.getSupabase()
      .from('primary_books')
      .select(
        `
        *,
        editions:primary_book_editions!primary_book_editions_primary_book_id_fkey (
          *,
          bindings:primary_book_bindings!primary_book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('id', primaryBookId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch primary book: ${error.message}`);
    }

    return {
      ...primaryBook,
      editions: primaryBook.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    };
  }

  /**
   * Update selected edition for a primary book
   */
  static async updateSelectedEdition(
    primaryBookId: string,
    editionId: string,
  ): Promise<void> {
    const { error } = await this.getSupabase()
      .from('primary_books')
      .update({ selected_edition_id: editionId })
      .eq('id', primaryBookId);

    if (error) {
      throw new Error(`Failed to update selected edition: ${error.message}`);
    }
  }

  /**
   * Delete a primary book and all its editions/bindings
   */
  static async deletePrimaryBook(
    primaryBookId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await this.getSupabase()
      .from('primary_books')
      .delete()
      .eq('id', primaryBookId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete primary book: ${error.message}`);
    }
  }

  /**
   * Check if user already has this book as a primary book
   */
  static async findExistingPrimaryBook(
    userId: string,
    title: string,
    author: string,
  ): Promise<PrimaryBook | null> {
    const { data: primaryBook, error } = await this.getSupabase()
      .from('primary_books')
      .select(
        `
        *,
        editions:primary_book_editions!primary_book_editions_primary_book_id_fkey (
          *,
          bindings:primary_book_bindings!primary_book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('user_id', userId)
      .eq('title', title)
      .eq('author', author)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(
        `Failed to check existing primary book: ${error.message}`,
      );
    }

    return {
      ...primaryBook,
      editions: primaryBook.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    };
  }

  /**
   * Add new editions to an existing primary book
   */
  static async addEditionsToPrimaryBook(
    primaryBookId: string,
    userId: string,
    newBooks: UIBook[],
  ): Promise<BookEdition[]> {
    // Verify ownership
    const existingBook = await this.getPrimaryBookById(primaryBookId, userId);
    if (!existingBook) {
      throw new Error('Primary book not found or access denied');
    }

    // Group new books by edition
    const editionGroups = EditionDetectionService.groupByEdition(newBooks);

    // Filter out editions that already exist
    const existingEditionNumbers = existingBook.editions.map(
      e => e.edition_number,
    );
    const newEditionGroups = editionGroups.filter(
      group => !existingEditionNumbers.includes(group.edition_number),
    );

    if (newEditionGroups.length === 0) {
      return []; // No new editions to add
    }

    // Create new editions
    return await this.createEditionsWithBindings(
      primaryBookId,
      newEditionGroups,
    );
  }

  /**
   * Private method to create editions with their bindings
   */
  private static async createEditionsWithBindings(
    primaryBookId: string,
    editionGroups: EditionGroup[],
  ): Promise<BookEdition[]> {
    const editions: BookEdition[] = [];

    for (const group of editionGroups) {
      // Create edition record
      const editionData: PrimaryBookEditionInsert = {
        primary_book_id: primaryBookId,
        edition_number: group.edition_number,
        publication_year: group.publication_year,
      };

      // Try to insert edition, but handle duplicates gracefully
      let edition;
      const { data: insertedEdition, error: editionError } =
        await this.getSupabase()
          .from('primary_book_editions')
          .insert(editionData)
          .select()
          .single();

      if (editionError) {
        // If it's a duplicate constraint violation, fetch the existing edition
        if (editionError.code === '23505') {
          const { data: existingEdition, error: fetchError } =
            await this.getSupabase()
              .from('primary_book_editions')
              .select('*')
              .eq('primary_book_id', primaryBookId)
              .eq('edition_number', group.edition_number)
              .single();

          if (fetchError) {
            throw new Error(
              `Failed to fetch existing edition: ${fetchError.message}`,
            );
          }
          edition = existingEdition;
        } else {
          throw new Error(`Failed to create edition: ${editionError.message}`);
        }
      } else {
        edition = insertedEdition;
      }

      // Create bindings for this edition
      const bindingData: PrimaryBookBindingInsert[] = group.books.map(book => ({
        book_edition_id: edition.id,
        isbn: book.isbn13 || book.isbn,
        binding_type: PrimaryBookService.normalizeBindingType(
          book.print_type || book.binding,
        ),
        price: book.msrp ? parseFloat(book.msrp.toString()) : undefined,
        publisher: book.publisher,
        cover_image_url: book.image,
        description: book.synopsis,
        pages: book.pages ? parseInt(book.pages.toString()) : undefined,
        language: book.language || 'en',
      }));

      // Try to insert bindings, handling duplicates gracefully
      const bindings: BookBinding[] = [];

      // Insert bindings one by one to handle duplicates individually
      for (const binding of bindingData) {
        const { data: insertedBinding, error: bindingError } =
          await this.getSupabase()
            .from('primary_book_bindings')
            .insert(binding)
            .select()
            .single();

        if (bindingError) {
          // If it's a duplicate constraint violation, fetch the existing binding
          if (bindingError.code === '23505') {
            const { data: existingBinding, error: fetchError } =
              await this.getSupabase()
                .from('primary_book_bindings')
                .select('*')
                .eq('book_edition_id', edition.id)
                .eq('binding_type', binding.binding_type)
                .single();

            if (fetchError) {
              throw new Error(
                `Failed to fetch existing binding: ${fetchError.message}`,
              );
            }
            bindings.push(existingBinding);
          } else {
            throw new Error(
              `Failed to create binding: ${bindingError.message}`,
            );
          }
        } else {
          bindings.push(insertedBinding);
        }
      }

      editions.push({
        ...edition,
        bindings: bindings || [],
      });
    }

    return editions;
  }

  /**
   * Get edition display information
   */
  static getEditionDisplayInfo(edition: BookEdition): string {
    const ordinal = this.getOrdinal(edition.edition_number);
    const year = edition.publication_year
      ? ` (${edition.publication_year})`
      : '';
    return `${ordinal} Edition${year}`;
  }

  /**
   * Get binding type display name
   */
  static getBindingDisplayName(binding: BookBinding): string {
    const typeMap: { [key: string]: string } = {
      hardcover: 'Hardcover',
      paperback: 'Paperback',
      'mass market paperback': 'Mass Market Paperback',
      ebook: 'eBook',
      audiobook: 'Audiobook',
      unknown: 'Unknown',
    };

    return typeMap[binding.binding_type] || binding.binding_type;
  }

  /**
   * Convert number to ordinal (1st, 2nd, 3rd, etc.)
   */
  private static getOrdinal(num: number): string {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  }

  /**
   * Normalize binding type to consistent values
   */
  private static normalizeBindingType(binding?: string): string {
    if (!binding) return 'unknown';

    const normalized = binding.toLowerCase().trim();

    // Map common variations to standard types
    const bindingMap: { [key: string]: string } = {
      hardcover: 'hardcover',
      hardback: 'hardcover',
      'hard cover': 'hardcover',
      hc: 'hardcover',

      paperback: 'paperback',
      softcover: 'paperback',
      'soft cover': 'paperback',
      pb: 'paperback',
      'trade paperback': 'paperback',

      ebook: 'ebook',
      'e-book': 'ebook',
      digital: 'ebook',
      kindle: 'ebook',

      audiobook: 'audiobook',
      'audio book': 'audiobook',
      audio: 'audiobook',

      'mass market': 'mass market paperback',
      'mass market paperback': 'mass market paperback',
      mmpb: 'mass market paperback',
    };

    return bindingMap[normalized] || normalized;
  }

  /**
   * Get statistics for a primary book
   */
  static getPrimaryBookStats(primaryBook: PrimaryBook): {
    totalEditions: number;
    totalBindings: number;
    bindingTypes: string[];
    yearRange: { earliest?: number; latest?: number };
  } {
    const totalEditions = primaryBook.editions.length;
    const totalBindings = primaryBook.editions.reduce(
      (sum, edition) => sum + edition.bindings.length,
      0,
    );

    const bindingTypes = Array.from(
      new Set(
        primaryBook.editions.flatMap(edition =>
          edition.bindings.map(binding => binding.binding_type),
        ),
      ),
    );

    const years = primaryBook.editions
      .map(edition => edition.publication_year)
      .filter(year => year !== undefined) as number[];

    const yearRange =
      years.length > 0
        ? {
            earliest: Math.min(...years),
            latest: Math.max(...years),
          }
        : {};

    return {
      totalEditions,
      totalBindings,
      bindingTypes,
      yearRange,
    };
  }
}
