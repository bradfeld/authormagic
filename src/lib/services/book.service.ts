/**
 * Book Service
 * Handles CRUD operations for the Books system
 */

import { createServiceClient } from '@/lib/supabase/server';
import {
  Book,
  BookEdition,
  BookBinding,
  BookInsert,
  BookEditionInsert,
  BookBindingInsert,
} from '@/lib/types/book';
import { UIBook } from '@/lib/types/ui-book';
import { getBookPrimaryCover } from '@/lib/utils/book-cover';

import {
  EditionDetectionService,
  EditionGroup,
} from './edition-detection.service';

export class BookService {
  private static _supabase: ReturnType<typeof createServiceClient> | null =
    null;

  private static getSupabase() {
    if (!this._supabase) {
      this._supabase = createServiceClient();
    }
    return this._supabase;
  }

  /**
   * Create a new Book with editions and bindings
   * Uses pre-grouped edition data to preserve search results structure
   */
  static async createBook(
    userId: string,
    title: string,
    author: string,
    editionGroups: EditionGroup[],
    selectedEditionNumber?: number,
  ): Promise<Book> {
    // Use the pre-grouped edition structure directly (no re-detection)
    // This preserves the exact search results that the user saw

    // Create book record
    const bookData: BookInsert = {
      user_id: userId,
      title,
      author,
      selected_edition_id: undefined, // Will be set after creating editions
    };

    const { data: book, error: bookError } = await this.getSupabase()
      .from('books')
      .insert(bookData)
      .select()
      .single();

    if (bookError) {
      throw new Error(`Failed to create book: ${bookError.message}`);
    }

    // Create editions and bindings using the preserved structure
    const editions = await this.createEditionsWithBindings(
      book.id,
      editionGroups,
    );

    // Select the default edition (latest if not specified)
    const selectedEdition = selectedEditionNumber
      ? editions.find(e => e.edition_number === selectedEditionNumber)
      : editions[0]; // First edition (latest due to sorting)

    if (selectedEdition) {
      await this.updateSelectedEdition(book.id, selectedEdition.id);
    }

    return {
      ...book,
      editions,
      selected_edition_id: selectedEdition?.id,
    };
  }

  /**
   * Find existing book by user, title, and author
   */
  static async findExistingBook(
    userId: string,
    title: string,
    author: string,
  ): Promise<Book | null> {
    const { data: existingBook, error } = await this.getSupabase()
      .from('books')
      .select(
        `
        *,
        editions:book_editions!book_editions_book_id_fkey (
          *,
          bindings:book_bindings!book_bindings_book_edition_id_fkey (*)
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
   * Uses pre-grouped edition data to preserve search results structure
   */
  static async updateBookWithNewEditions(
    bookId: string,
    editionGroups: EditionGroup[],
  ): Promise<Book> {
    // Use the pre-grouped edition structure directly (no re-detection)
    // This preserves the exact search results that the user saw

    // Add new editions and bindings (existing ones will be skipped due to unique constraints)
    await this.createEditionsWithBindings(bookId, editionGroups);

    // Get the updated book with all editions
    const { data: updatedBook, error } = await this.getSupabase()
      .from('books')
      .select(
        `
        *,
        editions:book_editions!book_editions_book_id_fkey (
          *,
          bindings:book_bindings!book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('id', bookId)
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
   * Update book title and author
   */
  static async updateBook(
    bookId: string,
    userId: string,
    title: string,
    author: string,
  ): Promise<Book> {
    // First verify the user owns this book
    const book = await this.getBookById(bookId, userId);
    if (!book) {
      throw new Error('Book not found or access denied');
    }

    // Update the book
    const { error } = await this.getSupabase()
      .from('books')
      .update({
        title: title.trim(),
        author: author.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update book: ${error.message}`);
    }

    // Return the updated book with full details
    return this.getBookWithDetails(bookId, userId) as Promise<Book>;
  }

  /**
   * Get user's books with editions and bindings
   */
  static async getUserBooks(userId: string): Promise<Book[]> {
    const { data: books, error } = await this.getSupabase()
      .from('books')
      .select(
        `
        *,
        editions:book_editions!book_editions_book_id_fkey (
          *,
          bindings:book_bindings!book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch books: ${error.message}`);
    }

    return books.map(book => ({
      ...book,
      editions: book.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    }));
  }

  /**
   * Get user's books for dashboard display (simplified structure)
   */
  static async getUserBooksSimplified(userId: string) {
    const { data: result, error } = await this.getSupabase()
      .from('books')
      .select(
        `
        id,
        title,
        author,
        created_at,
        selected_edition_id,
        editions:book_editions!book_editions_book_id_fkey (
          id,
          edition_number,
          publication_year,
          bindings:book_bindings!book_bindings_book_edition_id_fkey (
            cover_image_url
          )
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch books: ${error.message}`);
    }

    return result.map(book => {
      // Calculate totals
      const totalEditions = book.editions?.length || 0;
      const totalBooks =
        book.editions?.reduce(
          (total, edition) => total + (edition.bindings?.length || 0),
          0,
        ) || 0;

      // Get primary edition (selected or latest by publication year)
      const primaryEdition = book.selected_edition_id
        ? book.editions?.find(e => e.id === book.selected_edition_id)
        : book.editions?.sort(
            (a, b) => (b.publication_year || 0) - (a.publication_year || 0),
          )?.[0];

      // Get cover image using consistent edition-based logic
      const coverImage = getBookPrimaryCover(book);

      return {
        id: book.id,
        title: book.title,
        author: book.author,
        created_at: book.created_at,
        total_editions: totalEditions,
        total_books: totalBooks,
        primary_edition: primaryEdition
          ? {
              edition_number: primaryEdition.edition_number,
              publication_year: primaryEdition.publication_year,
            }
          : null,
        cover_image: coverImage || null,
      };
    });
  }

  /**
   * Get a specific primary book by ID
   */
  static async getBookById(
    bookId: string,
    userId: string,
  ): Promise<Book | null> {
    const { data: book, error } = await this.getSupabase()
      .from('books')
      .select(
        `
        *,
        editions:book_editions!book_editions_book_id_fkey (
          *,
          bindings:book_bindings!book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('id', bookId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch book: ${error.message}`);
    }

    return {
      ...book,
      editions: book.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    };
  }

  /**
   * Update selected edition for a primary book
   */
  static async updateSelectedEdition(
    bookId: string,
    editionId: string,
  ): Promise<void> {
    const { error } = await this.getSupabase()
      .from('books')
      .update({ selected_edition_id: editionId })
      .eq('id', bookId);

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
   * Delete a book and all its editions/bindings
   * This will cascade delete all related editions and bindings
   */
  static async deleteBook(bookId: string, userId: string): Promise<void> {
    // First verify the book exists and user owns it
    const book = await this.getBookById(bookId, userId);
    if (!book) {
      throw new Error('Book not found or access denied');
    }

    // Delete the book - this will cascade delete editions and bindings
    // due to foreign key constraints with CASCADE DELETE
    const { error } = await this.getSupabase()
      .from('books')
      .delete()
      .eq('id', bookId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete book: ${error.message}`);
    }
  }

  /**
   * Get book with all editions and bindings for detail view
   */
  static async getBookWithDetails(
    bookId: string,
    userId: string,
  ): Promise<Book | null> {
    const { data: book, error } = await this.getSupabase()
      .from('books')
      .select(
        `
        *,
        editions:book_editions!book_editions_book_id_fkey (
          *,
          bindings:book_bindings!book_bindings_book_edition_id_fkey (*)
        )
      `,
      )
      .eq('id', bookId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch book details: ${error.message}`);
    }

    return {
      ...book,
      editions: book.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings || [],
      })),
    };
  }

  /**
   * Check if user already has this book
   */
  static async findExistingPrimaryBook(
    userId: string,
    title: string,
    author: string,
  ): Promise<Book | null> {
    const { data: book, error } = await this.getSupabase()
      .from('books')
      .select(
        `
        *,
        editions:book_editions!book_editions_book_id_fkey (
          *,
          bindings:book_bindings!book_bindings_book_edition_id_fkey (*)
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
      throw new Error(`Failed to check existing book: ${error.message}`);
    }

    return {
      ...book,
      editions: book.editions.map((edition: BookEdition) => ({
        ...edition,
        bindings: edition.bindings,
      })),
    };
  }

  /**
   * Add new editions to an existing primary book
   */
  static async addEditionsToBook(
    bookId: string,
    userId: string,
    newBooks: UIBook[],
  ): Promise<BookEdition[]> {
    // Verify ownership
    const existingBook = await this.getBookById(bookId, userId);
    if (!existingBook) {
      throw new Error('Book not found or access denied');
    }

    // Group new books by edition
    const editionGroups = EditionDetectionService.groupByEdition(newBooks);

    // Filter out editions that already exist
    const existingEditionNumbers = existingBook.editions.map(
      (e: BookEdition) => e.edition_number,
    );
    const newEditionGroups = editionGroups.filter(
      group => !existingEditionNumbers.includes(group.edition_number),
    );

    if (newEditionGroups.length === 0) {
      return []; // No new editions to add
    }

    // Create new editions
    return await this.createEditionsWithBindings(bookId, newEditionGroups);
  }

  /**
   * Private method to create editions with their bindings
   */
  private static async createEditionsWithBindings(
    bookId: string,
    editionGroups: EditionGroup[],
  ): Promise<BookEdition[]> {
    const editions: BookEdition[] = [];

    for (const group of editionGroups) {
      // Create edition record
      const editionData: BookEditionInsert = {
        book_id: bookId,
        edition_number: group.edition_number,
        publication_year: group.publication_year,
      };

      // Try to insert edition, but handle duplicates gracefully
      let edition;
      const { data: insertedEdition, error: editionError } =
        await this.getSupabase()
          .from('book_editions')
          .insert(editionData)
          .select()
          .single();

      if (editionError) {
        // If it's a duplicate constraint violation, fetch the existing edition
        if (editionError.code === '23505') {
          const { data: existingEdition, error: fetchError } =
            await this.getSupabase()
              .from('book_editions')
              .select('*')
              .eq('book_id', bookId)
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
      const bindingData: BookBindingInsert[] = group.books.map(book => ({
        book_edition_id: edition.id,
        isbn: book.isbn13 || book.isbn,
        binding_type: EditionDetectionService.normalizeBindingType(
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
            .from('book_bindings')
            .insert(binding)
            .select()
            .single();

        if (bindingError) {
          // If it's a duplicate constraint violation, fetch the existing binding
          if (bindingError.code === '23505') {
            const { data: existingBinding, error: fetchError } =
              await this.getSupabase()
                .from('book_bindings')
                .select('*')
                .eq('isbn', binding.isbn)
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
   * Get statistics for a book
   */
  static getBookStats(book: Book): {
    totalEditions: number;
    totalBindings: number;
    bindingTypes: string[];
    yearRange: { earliest?: number; latest?: number };
  } {
    const totalEditions = book.editions.length;
    const totalBindings = book.editions.reduce(
      (sum, edition) => sum + edition.bindings.length,
      0,
    );

    const bindingTypes = Array.from(
      new Set(
        book.editions.flatMap(edition =>
          edition.bindings.map(binding => binding.binding_type),
        ),
      ),
    );

    const years = book.editions
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

  /**
   * Get edition by ID with ownership validation
   */
  static async getEditionById(
    editionId: string,
    userId: string,
  ): Promise<BookEdition | null> {
    const { data: edition, error } = await this.getSupabase()
      .from('book_editions')
      .select(
        `
        *,
        book:books!book_editions_book_id_fkey (user_id),
        bindings:book_bindings!book_bindings_book_edition_id_fkey (*)
      `,
      )
      .eq('id', editionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch edition: ${error.message}`);
    }

    // Check if user owns the book that contains this edition
    if (edition.book.user_id !== userId) {
      return null; // Access denied
    }

    return {
      ...edition,
      bindings: edition.bindings || [],
    };
  }

  /**
   * Update edition details
   */
  static async updateEdition(
    editionId: string,
    userId: string,
    editionNumber: number,
    publicationYear?: number,
  ): Promise<BookEdition> {
    // First verify the user owns this edition
    const edition = await this.getEditionById(editionId, userId);
    if (!edition) {
      throw new Error('Edition not found or access denied');
    }

    // Update the edition
    const { error } = await this.getSupabase()
      .from('book_editions')
      .update({
        edition_number: editionNumber,
        publication_year: publicationYear || null,
      })
      .eq('id', editionId);

    if (error) {
      throw new Error(`Failed to update edition: ${error.message}`);
    }

    // Return the updated edition with full details
    const updatedEdition = await this.getEditionById(editionId, userId);
    if (!updatedEdition) {
      throw new Error('Failed to fetch updated edition');
    }

    return updatedEdition;
  }

  /**
   * Delete edition
   */
  static async deleteEdition(editionId: string, userId: string): Promise<void> {
    // First verify the user owns this edition
    const edition = await this.getEditionById(editionId, userId);
    if (!edition) {
      throw new Error('Edition not found or access denied');
    }

    // Delete the edition (will cascade to bindings)
    const { error } = await this.getSupabase()
      .from('book_editions')
      .delete()
      .eq('id', editionId);

    if (error) {
      throw new Error(`Failed to delete edition: ${error.message}`);
    }
  }

  /**
   * Get binding by ID with ownership validation
   */
  static async getBindingById(
    bindingId: string,
    userId: string,
  ): Promise<BookBinding | null> {
    const { data: binding, error } = await this.getSupabase()
      .from('book_bindings')
      .select(
        `
        *,
        edition:book_editions!book_bindings_book_edition_id_fkey (
          book:books!book_editions_book_id_fkey (user_id)
        )
      `,
      )
      .eq('id', bindingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch binding: ${error.message}`);
    }

    // Check if user owns the book that contains this binding
    if (binding.edition.book.user_id !== userId) {
      return null; // Access denied
    }

    return binding;
  }

  /**
   * Update binding details
   */
  static async updateBinding(
    bindingId: string,
    userId: string,
    updateData: {
      // Removed isbn since it's now read-only
      binding_type: string;
      price?: number;
      publisher?: string;
      cover_image_url?: string;
      description?: string;
      pages?: number;
      language: string;
    },
  ): Promise<BookBinding> {
    // First verify the user owns this binding
    const binding = await this.getBindingById(bindingId, userId);
    if (!binding) {
      throw new Error('Binding not found or access denied');
    }

    // Update the binding (excluding ISBN since it's read-only)
    const { error } = await this.getSupabase()
      .from('book_bindings')
      .update({
        // isbn: excluded since it's read-only
        binding_type: updateData.binding_type,
        price: updateData.price || null,
        publisher: updateData.publisher || null,
        cover_image_url: updateData.cover_image_url || null,
        description: updateData.description || null,
        pages: updateData.pages || null,
        language: updateData.language,
      })
      .eq('id', bindingId);

    if (error) {
      throw new Error(`Failed to update binding: ${error.message}`);
    }

    // Return the updated binding with full details
    const updatedBinding = await this.getBindingById(bindingId, userId);
    if (!updatedBinding) {
      throw new Error('Failed to fetch updated binding');
    }

    return updatedBinding;
  }

  /**
   * Delete binding
   */
  static async deleteBinding(bindingId: string, userId: string): Promise<void> {
    // First verify the user owns this binding
    const binding = await this.getBindingById(bindingId, userId);
    if (!binding) {
      throw new Error('Binding not found or access denied');
    }

    // Delete the binding
    const { error } = await this.getSupabase()
      .from('book_bindings')
      .delete()
      .eq('id', bindingId);

    if (error) {
      throw new Error(`Failed to delete binding: ${error.message}`);
    }
  }

  // Legacy method aliases for backwards compatibility during migration
  /** @deprecated Use createBook instead */
  static async createPrimaryBook(
    ...args: Parameters<typeof BookService.createBook>
  ): Promise<Book> {
    return this.createBook(...args);
  }

  /** @deprecated Use getUserBooks instead */
  static async getUserPrimaryBooks(
    ...args: Parameters<typeof BookService.getUserBooks>
  ): Promise<Book[]> {
    return this.getUserBooks(...args);
  }

  /** @deprecated Use getUserBooksSimplified instead */
  static async getUserPrimaryBooksSimplified(
    ...args: Parameters<typeof BookService.getUserBooksSimplified>
  ) {
    return this.getUserBooksSimplified(...args);
  }

  /** @deprecated Use getBookStats instead */
  static getPrimaryBookStats(book: Book) {
    return this.getBookStats(book);
  }
}
