/**
 * Edition Detection Service
 * Groups books by edition using multiple detection strategies
 */

import { BookEdition, BookBinding } from '@/lib/types/primary-book';
import { UIBook } from '@/lib/types/ui-book';

export interface EditionGroup {
  edition_number: number;
  edition_type?: string; // For special editions like "unabridged", "revised", etc.
  publication_year?: number;
  books: UIBook[];
}

export class EditionDetectionService {
  /**
   * Main entry point: Group books by edition using explicit edition number parsing
   */
  static groupByEdition(books: UIBook[]): EditionGroup[] {
    if (!books || books.length === 0) return [];

    // Step 1: Filter and clean the book data
    const cleanBooks = this.filterAndCleanBooks(books);

    // Step 2: NORMALIZE AND CONSOLIDATE messy data
    const normalizedBooks = this.normalizeAndConsolidateBooks(cleanBooks);

    // Step 3: Normalize and group books by title similarity
    const titleGroups = this.groupByNormalizedTitle(normalizedBooks);
    const editionGroups: EditionGroup[] = [];

    // Step 4: For each title group, create edition groups using explicit edition parsing
    for (const titleBooks of titleGroups.values()) {
      const groups = this.createEditionGroupsByExplicitNumbers(titleBooks);
      editionGroups.push(...groups);
    }

    // Step 5: Sort edition groups by edition number (newest first)
    return editionGroups.sort((a, b) => {
      const editionA = a.edition_number || 0;
      const editionB = b.edition_number || 0;
      return editionB - editionA; // Newest edition first
    });
  }

  /**
   * NEW: Normalize and consolidate messy ISBNDB data
   * Handles: concatenated authors, missing metadata, duplicate records
   */
  private static normalizeAndConsolidateBooks(books: UIBook[]): UIBook[] {
    // Step 1: Normalize individual book records
    const normalizedBooks = books.map(book => this.normalizeBookRecord(book));

    // Step 2: Group potentially duplicate books
    const bookGroups = this.groupDuplicateBooks(normalizedBooks);

    // Step 3: Consolidate each group into single authoritative record
    return bookGroups.map(group => this.consolidateBookGroup(group));
  }

  /**
   * Normalize a single book record
   */
  private static normalizeBookRecord(book: UIBook): UIBook {
    return {
      ...book,
      // Parse and normalize authors
      authors: this.parseAndNormalizeAuthors(book.authors || []),
      // Normalize title (remove extra whitespace, etc.)
      title: book.title?.trim().replace(/\s+/g, ' ') || '',
      // Ensure binding is normalized
      binding: this.normalizeBindingType(book.binding || book.print_type),
    };
  }

  /**
   * Parse concatenated author strings and normalize author names
   */
  private static parseAndNormalizeAuthors(authors: string[]): string[] {
    const allAuthors: string[] = [];

    for (const authorField of authors) {
      if (!authorField || typeof authorField !== 'string') continue;

      // Handle comma-separated authors first
      if (authorField.includes(',')) {
        const commaSplit = authorField.split(',').map(name => name.trim());
        allAuthors.push(...commaSplit);
        continue;
      }

      // Special handling for known problematic patterns
      const normalized = authorField.trim();

      // Handle "Amy Batchelor Brad Feld" specifically
      if (normalized === 'Amy Batchelor Brad Feld') {
        allAuthors.push('Amy Batchelor', 'Brad Feld');
        continue;
      }

      // Handle "Brad Feld Sean Wise" pattern
      if (normalized === 'Brad Feld Sean Wise') {
        allAuthors.push('Brad Feld', 'Sean Wise');
        continue;
      }

      // More generic pattern: split if we have exactly 4 words that look like "First Last First Last"
      const words = normalized.split(/\s+/);
      if (words.length === 4) {
        const potentialFirstAuthor = `${words[0]} ${words[1]}`;
        const potentialSecondAuthor = `${words[2]} ${words[3]}`;

        // Check if both look like proper names (capitalized first letters)
        const namePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+$/;
        if (
          namePattern.test(potentialFirstAuthor) &&
          namePattern.test(potentialSecondAuthor)
        ) {
          allAuthors.push(potentialFirstAuthor, potentialSecondAuthor);
          continue;
        }
      }

      // Handle 3 words - could be "First Middle Last" or "First Last First"
      if (words.length === 3) {
        // Check if it's "First Last Brad" (where Brad suggests another author)
        if (
          words[2].toLowerCase() === 'brad' ||
          words[0].toLowerCase() === 'brad'
        ) {
          // Probably concatenated - try to split intelligently
          if (words[2].toLowerCase() === 'brad') {
            allAuthors.push(`${words[0]} ${words[1]}`, words[2]);
          } else {
            allAuthors.push(words[0], `${words[1]} ${words[2]}`);
          }
          continue;
        }
      }

      // If no special patterns matched, keep as single author
      allAuthors.push(normalized);
    }

    // Remove duplicates and normalize names
    const uniqueAuthors = Array.from(new Set(allAuthors))
      .map(name => this.normalizeAuthorName(name))
      .filter(name => name.length > 2); // Filter out initials only

    return uniqueAuthors;
  }

  /**
   * Normalize individual author name
   */
  private static normalizeAuthorName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b(Jr|Sr|III|IV)\b\.?$/i, '') // Remove suffixes
      .trim();
  }

  /**
   * Group books that are likely the same book with messy data
   */
  private static groupDuplicateBooks(books: UIBook[]): UIBook[][] {
    const groups: UIBook[][] = [];
    const processed = new Set<string>();

    for (const book of books) {
      if (processed.has(book.id)) continue;

      const group = [book];
      processed.add(book.id);

      // Find other books that are likely the same
      for (const otherBook of books) {
        if (processed.has(otherBook.id)) continue;

        if (this.areLikelySameBook(book, otherBook)) {
          group.push(otherBook);
          processed.add(otherBook.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Determine if two books are likely the same book with messy data
   */
  private static areLikelySameBook(book1: UIBook, book2: UIBook): boolean {
    // Normalize titles for comparison
    const title1 = this.normalizeTitleForComparison(book1.title || '');
    const title2 = this.normalizeTitleForComparison(book2.title || '');

    // Must have very similar titles
    const titleSimilarity = this.calculateTitleSimilarity(title1, title2);
    if (titleSimilarity < 0.8) return false;

    // Check author overlap
    const authors1 = new Set(book1.authors?.map(a => a.toLowerCase()) || []);
    const authors2 = new Set(book2.authors?.map(a => a.toLowerCase()) || []);

    // Must have at least one author in common OR one be subset of other
    const hasCommonAuthor = Array.from(authors1).some(a => authors2.has(a));
    const isSubset =
      Array.from(authors1).every(a => authors2.has(a)) ||
      Array.from(authors2).every(a => authors1.has(a));

    if (!hasCommonAuthor && !isSubset) return false;

    // IMPORTANT: Don't consolidate books with different bindings
    // We want to preserve Hardcover, Paperback, Kindle, etc. as separate books
    const binding1 = this.normalizeBindingType(
      book1.binding || book1.print_type,
    );
    const binding2 = this.normalizeBindingType(
      book2.binding || book2.print_type,
    );

    // If bindings are different and both are meaningful (not unknown), don't consolidate
    if (
      binding1 !== binding2 &&
      binding1 !== 'unknown' &&
      binding2 !== 'unknown'
    ) {
      return false;
    }

    // Check publication year proximity (same book, different formats)
    const year1 = this.extractPublicationYear(book1);
    const year2 = this.extractPublicationYear(book2);

    if (year1 && year2) {
      const yearDiff = Math.abs(year1 - year2);
      if (yearDiff > 5) return false; // Same book shouldn't be >5 years apart
    }

    return true;
  }

  /**
   * Calculate title similarity (0-1 score)
   */
  private static calculateTitleSimilarity(
    title1: string,
    title2: string,
  ): number {
    if (title1 === title2) return 1.0;

    const words1 = new Set(title1.split(/\s+/));
    const words2 = new Set(title2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Normalize title for comparison (remove subtitles, punctuation, etc.)
   */
  private static normalizeTitleForComparison(title: string): string {
    return title
      .toLowerCase()
      .replace(/[:\-–—].+$/, '') // Remove subtitle after : or -
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Consolidate a group of duplicate books into single authoritative record
   */
  private static consolidateBookGroup(books: UIBook[]): UIBook {
    if (books.length === 1) return books[0];

    // Use the record with most complete metadata as base
    const baseBook = this.selectMostCompleteBook(books);

    // Merge metadata from all books
    const consolidatedAuthors = this.consolidateAuthors(books);
    const consolidatedTitle = this.consolidateTitles(books);
    const consolidatedSubtitle = this.consolidateSubtitles(books);
    const consolidatedDescription = this.consolidateDescriptions(books);

    return {
      ...baseBook,
      authors: consolidatedAuthors,
      title: consolidatedTitle,
      subtitle: consolidatedSubtitle,
      description: consolidatedDescription,
      // Keep the earliest publication date
      published_date: this.getEarliestDate(books),
    };
  }

  /**
   * Select the book record with most complete metadata
   */
  private static selectMostCompleteBook(books: UIBook[]): UIBook {
    return books.reduce((best, current) => {
      const bestScore = this.calculateCompletenessScore(best);
      const currentScore = this.calculateCompletenessScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculate completeness score for a book record
   */
  private static calculateCompletenessScore(book: UIBook): number {
    let score = 0;
    if (book.title) score += 2;
    if (book.subtitle) score += 1;
    if (book.authors?.length) score += book.authors.length;
    if (book.description) score += 2;
    if (book.publisher) score += 1;
    if (book.published_date) score += 1;
    if (book.page_count) score += 1;
    return score;
  }

  /**
   * Consolidate authors from multiple records
   */
  private static consolidateAuthors(books: UIBook[]): string[] {
    const allAuthors = new Set<string>();

    books.forEach(book => {
      book.authors?.forEach(author => {
        if (author && author.trim()) {
          allAuthors.add(this.normalizeAuthorName(author));
        }
      });
    });

    // Sort authors for consistency (primary author first if Brad Feld is present)
    const authorList = Array.from(allAuthors);
    return authorList.sort((a, b) => {
      if (a.toLowerCase().includes('brad feld')) return -1;
      if (b.toLowerCase().includes('brad feld')) return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Consolidate titles (prefer longest/most descriptive)
   */
  private static consolidateTitles(books: UIBook[]): string {
    const titles = books.map(b => b.title || '').filter(t => t.length > 0);
    return titles.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
    );
  }

  /**
   * Consolidate subtitles (prefer first non-empty)
   */
  private static consolidateSubtitles(books: UIBook[]): string | undefined {
    for (const book of books) {
      if (book.subtitle && book.subtitle.trim()) {
        return book.subtitle;
      }
    }
    return undefined;
  }

  /**
   * Consolidate descriptions (prefer longest)
   */
  private static consolidateDescriptions(books: UIBook[]): string | undefined {
    const descriptions = books
      .map(b => b.description || '')
      .filter(d => d.length > 0);
    if (descriptions.length === 0) return undefined;

    return descriptions.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
    );
  }

  /**
   * Get earliest publication date from group
   */
  private static getEarliestDate(books: UIBook[]): string | undefined {
    const dates = books.map(b => b.published_date).filter(d => d);
    if (dates.length === 0) return undefined;

    return dates.sort()[0]; // Lexicographic sort works for ISO dates
  }

  /**
   * Filter books to remove non-English books and bad data
   */
  private static filterAndCleanBooks(books: UIBook[]): UIBook[] {
    return books.filter(book => {
      // Filter out non-English books
      if (
        book.language &&
        !['en', 'eng', 'english', undefined, null, ''].includes(
          book.language.toLowerCase(),
        )
      ) {
        return false;
      }

      // Filter out German books by title
      const title = book.title?.toLowerCase() || '';
      if (
        title.includes('seien sie') ||
        title.includes('klüger') ||
        title.includes('anwalt') ||
        title.includes('risikokapitalgeber') ||
        title.includes('german edition')
      ) {
        return false;
      }

      // Filter out obviously bad publication years
      const year = this.extractPublicationYear(book);
      if (year && (year < 1990 || year > new Date().getFullYear() + 2)) {
        return false;
      }

      // Filter out books with suspicious ISBNs or titles
      if (book.title?.includes('[') || book.title?.includes('--by')) {
        return false;
      }

      return true;
    });
  }

  /**
   * Group books by normalized title (removing edition indicators)
   */
  private static groupByNormalizedTitle(
    books: UIBook[],
  ): Map<string, UIBook[]> {
    const titleGroups = new Map<string, UIBook[]>();

    for (const book of books) {
      const normalizedTitle = this.normalizeBookTitle(book.title);
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      titleGroups.get(normalizedTitle)!.push(book);
    }

    return titleGroups;
  }

  /**
   * Normalize book title by removing edition indicators, subtitles, and publisher info
   */
  private static normalizeBookTitle(title: string): string {
    if (!title) return '';

    return (
      title
        .toLowerCase()
        // Remove edition indicators first
        .replace(
          /,?\s*(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|\d+(?:st|nd|rd|th)?)\s+edition/gi,
          '',
        )
        .replace(/\s*edition\s*\d*/gi, '')
        .replace(/,?\s*\d+(?:st|nd|rd|th)?\s*edition/gi, '')
        // Remove subtitle after colon
        .replace(/:.*$/, '')
        // Remove parentheticals (including language indicators)
        .replace(/\([^)]*\)/g, '')
        // Remove common suffixes and prefixes
        .replace(/\s*--by\s+.*$/i, '')
        .replace(/^\s*the\s+/i, '')
        // Normalize punctuation and whitespace
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Create edition groups based on explicit edition numbers from titles
   * Uses binding hierarchy: Hardcover > Paperback > Kindle > Others
   */
  private static createEditionGroupsByExplicitNumbers(
    books: UIBook[],
  ): EditionGroup[] {
    // Step 1: Parse explicit edition numbers from all books
    const booksWithEditions = books.map(book => ({
      book,
      editionNumber: this.parseExplicitEditionNumber(book),
      binding: this.normalizeBindingType(book.binding || book.print_type),
      publicationYear: this.extractPublicationYear(book),
    }));

    // Step 2: Group books by explicit edition numbers
    const editionMap = new Map<number, typeof booksWithEditions>();
    const unmappedBooks: typeof booksWithEditions = [];

    for (const bookData of booksWithEditions) {
      if (bookData.editionNumber !== null) {
        if (!editionMap.has(bookData.editionNumber)) {
          editionMap.set(bookData.editionNumber, []);
        }
        editionMap.get(bookData.editionNumber)!.push(bookData);
      } else {
        unmappedBooks.push(bookData);
      }
    }

    // Step 2.5: If no explicit Edition 1 exists but we have unmapped books,
    // create Edition 1 from earliest unmapped books
    if (!editionMap.has(1) && unmappedBooks.length > 0) {
      // Find the earliest publication year among unmapped books
      const unmappedWithYears = unmappedBooks.filter(b => b.publicationYear);
      if (unmappedWithYears.length > 0) {
        const earliestYear = Math.min(
          ...unmappedWithYears.map(b => b.publicationYear!),
        );

        // Create Edition 1 from books from the earliest year (or within 1 year)
        const edition1Books = unmappedBooks.filter(
          b =>
            !b.publicationYear ||
            Math.abs(b.publicationYear - earliestYear) <= 1,
        );

        if (edition1Books.length > 0) {
          editionMap.set(1, edition1Books);

          // Remove these books from unmapped list
          const edition1Isbns = new Set(edition1Books.map(b => b.book.isbn));
          unmappedBooks.splice(
            0,
            unmappedBooks.length,
            ...unmappedBooks.filter(b => !edition1Isbns.has(b.book.isbn)),
          );
        }
      }
    }

    // Step 3: Create authoritative edition timeline using binding hierarchy
    const editionTimeline = this.createEditionTimeline(editionMap);

    // Step 4: Map remaining unmapped books to editions based on publication date ranges
    this.mapBooksByDateRange(unmappedBooks, editionTimeline, editionMap);

    // Step 5: Convert to EditionGroup format
    const editionGroups: EditionGroup[] = [];

    for (const [editionNumber, bookDataList] of editionMap.entries()) {
      const books = bookDataList.map(bd => bd.book);
      const authoritativeBook = this.findAuthoritativeBook(bookDataList);

      editionGroups.push({
        edition_number: editionNumber,
        edition_type: this.detectEditionType(
          authoritativeBook?.book,
          editionNumber,
        ),
        publication_year: authoritativeBook?.publicationYear,
        books: books,
      });
    }

    return editionGroups;
  }

  /**
   * Parse explicit edition number from book title and metadata
   */
  private static parseExplicitEditionNumber(book: UIBook): number | null {
    // Step 1: Check edition metadata first (from ISBNDB edition field)
    if (book.edition || book.content_version) {
      const editionText = (
        book.edition ||
        book.content_version ||
        ''
      ).toLowerCase();

      // Try to extract number from edition metadata
      const metadataNumber = this.extractEditionNumberFromText(editionText);
      if (metadataNumber !== null) {
        return metadataNumber;
      }
    }

    // Step 2: Fall back to title parsing if no metadata edition found
    const title = book.title?.toLowerCase() || '';
    return this.extractEditionNumberFromText(title);
  }

  /**
   * Extract edition number from any text (title or metadata)
   */
  private static extractEditionNumberFromText(text: string): number | null {
    // Look for explicit edition patterns
    const patterns = [
      /(\d+)(?:st|nd|rd|th)\s+edition/i, // "4th Edition", "1st Edition"
      /edition\s+(\d+)/i, // "Edition 4"
      /(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+edition/i,
      /^(\d+)$/, // Just a number (for metadata fields)
      /(unabridged|revised|updated)\s+(\d+)/i,
    ];

    // Word to number mapping
    const wordToNumber: Record<string, number> = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      tenth: 10,
    };

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const captured = match[1] || match[2];
        if (captured) {
          // Try to parse as number first
          const num = parseInt(captured, 10);
          if (!isNaN(num)) return num;

          // Try word-to-number conversion
          const wordNum = wordToNumber[captured.toLowerCase()];
          if (wordNum) return wordNum;
        }
      }
    }

    return null;
  }

  /**
   * Create timeline of editions using binding hierarchy
   * Priority: Hardcover > Paperback > Kindle > Others
   */
  private static createEditionTimeline(
    editionMap: Map<
      number,
      Array<{
        book: UIBook;
        editionNumber: number | null;
        binding: string;
        publicationYear: number | undefined;
      }>
    >,
  ): Array<{ edition: number; year: number; binding: string }> {
    const timeline: Array<{ edition: number; year: number; binding: string }> =
      [];

    for (const [editionNumber, bookDataList] of editionMap.entries()) {
      const authoritativeBook = this.findAuthoritativeBook(bookDataList);
      if (authoritativeBook?.publicationYear) {
        timeline.push({
          edition: editionNumber,
          year: authoritativeBook.publicationYear,
          binding: authoritativeBook.binding,
        });
      }
    }

    // Sort by year to create chronological timeline
    return timeline.sort((a, b) => a.year - b.year);
  }

  /**
   * Find the most authoritative book using binding hierarchy
   */
  private static findAuthoritativeBook(
    bookDataList: Array<{
      book: UIBook;
      editionNumber: number | null;
      binding: string;
      publicationYear: number | undefined;
    }>,
  ) {
    const bindingPriority = [
      'hardcover',
      'paperback',
      'ebook',
      'kindle',
      'audiobook',
      'unknown',
    ];

    // Sort books by binding priority and publication year
    const sorted = bookDataList.sort((a, b) => {
      const priorityA =
        bindingPriority.indexOf(a.binding) !== -1
          ? bindingPriority.indexOf(a.binding)
          : 999;
      const priorityB =
        bindingPriority.indexOf(b.binding) !== -1
          ? bindingPriority.indexOf(b.binding)
          : 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower index = higher priority
      }

      // If same binding priority, prefer earlier publication year
      return (a.publicationYear || 0) - (b.publicationYear || 0);
    });

    return sorted[0];
  }

  /**
   * Map books without explicit edition numbers to editions based on publication date ranges
   */
  private static mapBooksByDateRange(
    unmappedBooks: Array<{
      book: UIBook;
      editionNumber: number | null;
      binding: string;
      publicationYear: number | undefined;
    }>,
    timeline: Array<{ edition: number; year: number; binding: string }>,
    editionMap: Map<
      number,
      Array<{
        book: UIBook;
        editionNumber: number | null;
        binding: string;
        publicationYear: number | undefined;
      }>
    >,
  ) {
    for (const bookData of unmappedBooks) {
      if (!bookData.publicationYear) continue;

      const pubYear = bookData.publicationYear;

      // Find which edition this book belongs to based on date range
      let targetEdition: number | null = null;

      for (let i = 0; i < timeline.length; i++) {
        const currentEdition = timeline[i];
        const nextEdition = timeline[i + 1];

        // Check if book falls within this edition's date range
        if (pubYear >= currentEdition.year) {
          if (!nextEdition || pubYear < nextEdition.year) {
            targetEdition = currentEdition.edition;
            break;
          }
        }
      }

      // If we found a target edition, add the book to it
      if (targetEdition !== null) {
        if (!editionMap.has(targetEdition)) {
          editionMap.set(targetEdition, []);
        }
        editionMap.get(targetEdition)!.push(bookData);
      }
    }
  }

  /**
   * Detect edition type from title and other metadata
   */
  private static detectEditionType(
    book: UIBook,
    editionNumber: number,
  ): string | undefined {
    const title = book.title?.toLowerCase() || '';

    // Check for explicit edition mentions in title (most reliable)
    if (title.includes('fourth edition') || title.includes('4th edition'))
      return 'Fourth Edition';
    if (title.includes('third edition') || title.includes('3rd edition'))
      return 'Third Edition';
    if (title.includes('second edition') || title.includes('2nd edition'))
      return 'Second Edition';
    if (title.includes('first edition') || title.includes('1st edition'))
      return 'First Edition';

    // Check for special types
    if (title.includes('revised')) return 'Revised Edition';
    if (title.includes('updated')) return 'Updated Edition';
    if (title.includes('expanded')) return 'Expanded Edition';
    if (book.content_version?.toLowerCase().includes('unabridged'))
      return 'Unabridged';

    // Default ordinal naming based on chronological position
    if (editionNumber === 1) return 'First Edition';
    if (editionNumber === 2) return 'Second Edition';
    if (editionNumber === 3) return 'Third Edition';
    if (editionNumber === 4) return 'Fourth Edition';
    if (editionNumber === 5) return 'Fifth Edition';

    return `${editionNumber}${this.getOrdinalSuffix(editionNumber)} Edition`;
  }

  /**
   * Check if a print_type indicates an audiobook format
   */
  private static isAudiobookFormat(printType?: string): boolean {
    if (!printType) return false;

    const audioFormats = [
      'mp3 cd',
      'mp3_cd',
      'audio cd',
      'audio_cd',
      'audiobook',
      'audible',
      'audio book',
      'audio_book',
      'audio',
      'cd',
    ];

    const normalized = printType.toLowerCase().trim();
    return audioFormats.some(format => normalized.includes(format));
  }

  /**
   * Group audiobook with appropriate print edition based on title and date
   */
  private static groupAudiobookWithEdition(
    audiobook: UIBook,
    editionGroups: Map<string, EditionGroup>,
  ): EditionGroup | null {
    // Primary strategy: Check if audiobook title contains edition information
    const titleEdition = this.extractEditionFromTitle(audiobook.title);
    if (titleEdition > 1) {
      // Find matching print edition by number
      for (const [, group] of editionGroups) {
        if (group.edition_number === titleEdition && !group.edition_type) {
          return group;
        }
      }
    }

    // Secondary strategy: Date-based grouping
    const audiobookYear = this.extractPublicationYear(audiobook);
    if (audiobookYear) {
      // Get all print editions sorted by edition number
      const printEditions = Array.from(editionGroups.values())
        .filter(group => !group.edition_type) // Only numeric editions
        .sort((a, b) => a.edition_number - b.edition_number);

      if (printEditions.length > 0) {
        // Find the appropriate edition based on date ranges
        for (let i = 0; i < printEditions.length; i++) {
          const currentEdition = printEditions[i];
          const nextEdition = printEditions[i + 1];

          const currentEditionYear = currentEdition.publication_year;
          const nextEditionYear = nextEdition?.publication_year;

          if (currentEditionYear) {
            // Check if audiobook falls within this edition's date range
            const isAfterCurrent = audiobookYear >= currentEditionYear;
            const isBeforeNext =
              !nextEditionYear || audiobookYear < nextEditionYear;

            // If audiobook is within the date range, group it with this edition
            if (isAfterCurrent && isBeforeNext) {
              return currentEdition;
            }
          }
        }

        // If no specific match found, check if it's close to any edition (within 2 years)
        for (const edition of printEditions) {
          if (
            edition.publication_year &&
            Math.abs(audiobookYear - edition.publication_year) <= 2
          ) {
            return edition;
          }
        }
      }
    }

    return null;
  }

  /**
   * Create unique key for grouping books into editions
   */
  private static detectEditionKey(book: UIBook): string {
    // Handle special content_version values that aren't numeric editions
    if (book.content_version && book.content_version !== '') {
      const versionStr = book.content_version.toLowerCase();

      // Special edition types that should be treated as separate editions
      const specialEditions = [
        'unabridged',
        'abridged',
        'revised',
        'updated',
        'expanded',
        'annotated',
        'illustrated',
        'deluxe',
        'limited',
        'special',
      ];

      for (const special of specialEditions) {
        if (versionStr.includes(special)) {
          const key = `edition-${special}`;
          return key;
        }
      }
    }

    // Use normalized edition number to create consistent keys for numeric editions
    const editionNum = this.extractEditionNumber(book);
    const key = `edition-${editionNum}`;
    return key;
  }

  /**
   * Extract special edition type from content_version
   */
  private static extractEditionType(book: UIBook): string | undefined {
    if (book.content_version && book.content_version !== '') {
      const versionStr = book.content_version.toLowerCase();

      // Special edition types that should be treated as separate editions
      const specialEditions = [
        'unabridged',
        'abridged',
        'revised',
        'updated',
        'expanded',
        'annotated',
        'illustrated',
        'deluxe',
        'limited',
        'special',
      ];

      for (const special of specialEditions) {
        if (versionStr.includes(special)) {
          return special;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract edition number from various sources
   */
  private static extractEditionNumber(book: UIBook): number {
    // Strategy 1: ISBNDB content_version field
    if (book.content_version && book.content_version !== '') {
      // Handle different content_version formats
      const versionStr = book.content_version.toLowerCase();

      // Extract number from formats like "2nd", "2", "1st", "1"
      let editionNum: number;
      if (versionStr.includes('2nd') || versionStr === '2') {
        editionNum = 2;
      } else if (versionStr.includes('1st') || versionStr === '1') {
        editionNum = 1;
      } else if (versionStr.includes('3rd') || versionStr === '3') {
        editionNum = 3;
      } else {
        // Try to parse as integer
        editionNum = parseInt(versionStr, 10);
      }

      // Filter out numbers that are too high to be realistic edition numbers
      // Years like "2011" should not be treated as editions
      if (!isNaN(editionNum) && editionNum > 0 && editionNum <= 99) {
        return editionNum;
      }
    }

    // Strategy 2: Extract from title
    const titleEdition = this.extractEditionFromTitle(book.title);
    if (titleEdition > 1) {
      return titleEdition;
    }

    // Strategy 3: Use publication year as rough edition indicator
    const year = this.extractPublicationYear(book);
    if (year) {
      // Very rough heuristic: newer books are "higher editions"
      // This is imperfect but gives some ordering
      return year >= 2020 ? 2 : 1;
    }

    return 1; // Default to first edition
  }

  /**
   * Extract edition number from book title
   */
  private static extractEditionFromTitle(title: string): number {
    if (!title) return 1;

    // Common patterns for edition in titles
    const patterns = [
      /(\d+)(?:st|nd|rd|th)?\s+edition/i,
      /edition\s+(\d+)/i,
      /(\d+)(?:st|nd|rd|th)?\s+ed\.?/i,
      /ed\.?\s+(\d+)/i,
      /revised\s+edition/i, // Treat as 2nd edition
      /updated\s+edition/i, // Treat as 2nd edition
      /new\s+edition/i, // Treat as 2nd edition
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        if (match[1]) {
          const edition = parseInt(match[1], 10);
          // Filter out numbers that are too high to be realistic edition numbers
          // Years like "2011" should not be treated as editions
          if (!isNaN(edition) && edition > 0 && edition <= 99) {
            return edition;
          }
        } else {
          // For patterns like "revised edition", "updated edition"
          return 2;
        }
      }
    }

    return 1; // Default to first edition
  }

  /**
   * Extract publication year from book data
   */
  private static extractPublicationYear(book: UIBook): number | undefined {
    // Strategy 1: Direct date_published field
    if (book.date_published) {
      const year = parseInt(book.date_published.substring(0, 4), 10);
      if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear() + 5) {
        return year;
      }
    }

    // Strategy 2: Try published_date field (alternative naming)
    if (book.published_date) {
      const year = parseInt(book.published_date.substring(0, 4), 10);
      if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear() + 5) {
        return year;
      }
    }

    // Strategy 3: Extract from title (sometimes has year)
    const titleYearMatch = book.title.match(/\((\d{4})\)/);
    if (titleYearMatch) {
      const year = parseInt(titleYearMatch[1], 10);
      if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear() + 5) {
        return year;
      }
    }

    return undefined;
  }

  /**
   * Convert grouped editions to Primary Book structure
   */
  static convertToBookEditions(
    editionGroups: EditionGroup[],
    primaryBookId: string,
  ): BookEdition[] {
    return editionGroups.map(group => ({
      id: '', // Will be generated by database
      primary_book_id: primaryBookId,
      edition_number: group.edition_number,
      publication_year: group.publication_year,
      created_at: new Date().toISOString(),
      bindings: this.convertToBookBindings(group.books, ''),
    }));
  }

  /**
   * Convert UI books to book bindings
   */
  private static convertToBookBindings(
    books: UIBook[],
    editionId: string,
  ): BookBinding[] {
    return books.map(book => {
      return {
        id: '', // Will be generated by database
        book_edition_id: editionId,
        isbn: book.isbn,
        binding_type: this.normalizeBindingType(book.print_type),
        price: undefined, // No price field in UIBook
        publisher: book.publisher,
        cover_image_url: undefined, // No image field in UIBook
        description: book.description,
        pages: book.page_count,
        language: book.language || 'en',
        created_at: new Date().toISOString(),
      };
    });
  }

  /**
   * Normalize binding type to standard format
   */
  static normalizeBindingType(binding?: string): string {
    if (!binding) return 'unknown';

    const normalized = binding.toLowerCase().trim();

    // Map common variations to standard types
    const bindingMap: { [key: string]: string } = {
      // Hardcover variations
      hardcover: 'hardcover',
      hardback: 'hardcover',
      'hard cover': 'hardcover',
      cloth: 'hardcover',
      bound: 'hardcover',

      // Paperback variations
      paperback: 'paperback',
      softcover: 'paperback',
      'soft cover': 'paperback',
      'mass market': 'paperback',
      'mass market paperback': 'paperback',
      'trade paperback': 'paperback',
      paper: 'paperback',

      // Digital variations
      ebook: 'ebook',
      'e-book': 'ebook',
      electronic: 'ebook',
      digital: 'ebook',
      kindle: 'ebook',
      epub: 'ebook',
      pdf: 'ebook',

      // Audio variations
      audiobook: 'audiobook',
      'audio book': 'audiobook',
      'mp3 cd': 'audiobook',
      'audio cd': 'audiobook',
      'compact disc': 'audiobook',
      cd: 'audiobook',
      audible: 'audiobook',
      unabridged: 'audiobook', // Often indicates audiobook

      // Special formats
      'board book': 'board book',
      spiral: 'spiral bound',
      'spiral bound': 'spiral bound',
      'ring bound': 'spiral bound',
    };

    // Try exact match first
    if (bindingMap[normalized]) {
      return bindingMap[normalized];
    }

    // Try partial matches
    for (const [key, value] of Object.entries(bindingMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    // Return original if no match found
    return normalized || 'unknown';
  }

  /**
   * Get human-readable edition display name
   */
  static getEditionDisplayName(edition: EditionGroup): string {
    const { edition_number, edition_type, publication_year } = edition;

    let display = '';

    if (edition_type) {
      display = edition_type;
    } else if (edition_number > 1) {
      const suffix = this.getOrdinalSuffix(edition_number);
      display = `${edition_number}${suffix} Edition`;
    } else {
      display = 'First Edition';
    }

    if (publication_year) {
      display += ` (${publication_year})`;
    }

    return display;
  }

  /**
   * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
   */
  private static getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }
}
