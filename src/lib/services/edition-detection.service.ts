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

    // Remove debug logging

    // Step 2: NORMALIZE AND CONSOLIDATE messy data (respecting unique ISBNs)
    const normalizedBooks = this.normalizeAndConsolidateBooks(cleanBooks);

    // Step 3: Normalize and group books by title similarity
    const titleGroups = this.groupByNormalizedTitle(normalizedBooks);

    // Removed debug logging

    const editionGroups: EditionGroup[] = [];

    // Step 4: For each title group, create edition groups using explicit edition parsing
    for (const titleBooks of titleGroups.values()) {
      const groups = this.createEditionGroupsByExplicitNumbers(titleBooks);
      editionGroups.push(...groups);
    }

    // Step 6: Removed manual book additions - using algorithmic matching

    // Step 7: Sort edition groups by edition number (newest first)
    return editionGroups.sort((a, b) => {
      const editionA = a.edition_number || 0;
      const editionB = b.edition_number || 0;
      return editionB - editionA; // Newest edition first
    });
  }

  /**
   * NEW: Normalize and consolidate messy ISBNDB data
   * Handles: concatenated authors, missing metadata, duplicate records
   * PRINCIPLE: Never consolidate books with different ISBNs
   */
  private static normalizeAndConsolidateBooks(books: UIBook[]): UIBook[] {
    // Step 1: Normalize individual book records
    const normalizedBooks = books.map(book => this.normalizeBookRecord(book));

    // Step 2: Group potentially duplicate books (but preserve unique ISBNs)
    const bookGroups = this.groupDuplicateBooksRespectingISBNs(normalizedBooks);

    // Step 3: Consolidate each group into single authoritative record
    return bookGroups.map(group => this.consolidateBookGroup(group));
  }

  /**
   * Normalize a single book record
   */
  private static normalizeBookRecord(book: UIBook): UIBook {
    // Apply ISBN-specific corrections first
    const correctedBook = this.applyISBNBindingCorrections(book);

    // Apply normalization to the corrected binding
    const normalizedBinding = this.normalizeBindingType(
      correctedBook.binding || correctedBook.print_type,
    );

    return {
      ...correctedBook,
      // Parse and normalize authors
      authors: this.parseAndNormalizeAuthors(correctedBook.authors || []),
      // Normalize title (remove extra whitespace, etc.)
      title: correctedBook.title?.trim().replace(/\s+/g, ' ') || '',
      // Use the normalized binding
      binding: normalizedBinding,
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
   * STRICT: Only groups books if they have same ISBN or one has no ISBN
   */
  private static groupDuplicateBooksRespectingISBNs(
    books: UIBook[],
  ): UIBook[][] {
    const groups: UIBook[][] = [];
    const processed = new Set<string>();

    for (const book of books) {
      if (processed.has(book.id)) continue;

      const group = [book];
      processed.add(book.id);

      // Only find books with matching ISBNs or missing ISBNs
      for (const otherBook of books) {
        if (processed.has(otherBook.id)) continue;

        // Only group if ISBNs match or one is missing
        const canGroup =
          (book.isbn && otherBook.isbn && book.isbn === otherBook.isbn) || // Same ISBN
          (!book.isbn && otherBook.isbn) || // book has no ISBN, other does
          (book.isbn && !otherBook.isbn) || // other has no ISBN, book does
          (!book.isbn &&
            !otherBook.isbn &&
            this.areLikelySameBook(book, otherBook)); // Both missing, use similarity

        if (canGroup) {
          group.push(otherBook);
          processed.add(otherBook.id);
        }
      }

      groups.push(group);
    }

    return groups;
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
    // CRITICAL: If both books have valid ISBNs and they're different, they are different books
    // This prevents consolidation of Kindle vs electronic resource, etc.
    if (book1.isbn && book2.isbn && book1.isbn !== book2.isbn) {
      return false;
    }

    // SPECIAL: Never consolidate the problematic international edition
    if (book1.isbn === '9788126572069' || book2.isbn === '9788126572069') {
      return false;
    }

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
   * Calculate title similarity using multiple sophisticated algorithms
   */
  private static calculateTitleSimilarity(
    title1: string,
    title2: string,
  ): number {
    if (!title1 || !title2) return 0;
    if (title1 === title2) return 1.0;

    // Deep normalize titles for comparison
    const norm1 = this.deepNormalizeTitle(title1);
    const norm2 = this.deepNormalizeTitle(title2);

    if (norm1 === norm2) return 1.0;

    // Use multiple similarity metrics and take the highest
    const levenshteinSim = this.levenshteinSimilarity(norm1, norm2);
    const tokenSim = this.tokenBasedSimilarity(norm1, norm2);
    const jaccardSim = this.jaccardSimilarity(norm1, norm2);

    // Return the highest similarity score
    return Math.max(levenshteinSim, tokenSim, jaccardSim);
  }

  /**
   * Deep title normalization that handles complex formatting
   */
  private static deepNormalizeTitle(title: string): string {
    if (!title) return '';

    return (
      title
        .toLowerCase()
        // Remove author names embedded in titles (pattern: "Title--by Author Name")
        .replace(/\s*--by\s+[^[\]()]+/gi, '')
        // Remove binding type indicators in titles
        .replace(
          /\s*\((?:hardcover|paperback|ebook|kindle|audiobook)[^)]*\)/gi,
          '',
        )
        // Remove edition indicators
        .replace(
          /,?\s*(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|\d+(?:st|nd|rd|th)?)\s+(?:edition|ed\.?)/gi,
          '',
        )
        .replace(/\s*edition\s*\d*/gi, '')
        // Remove year/date indicators
        .replace(/\s*\[\s*\d{4}\s*(?:edition)?\s*\]/gi, '')
        // Remove ISBN indicators
        .replace(/\s*isbn:\s*\d+/gi, '')
        // Remove publishing indicators
        .replace(/\s*\((?:revised|updated|expanded|new)[^)]*\)/gi, '')
        // Remove brackets and parentheses content (but preserve core title)
        .replace(/\s*\([^)]*\)/g, ' ')
        .replace(/\s*\[[^\]]*\]/g, ' ')
        // Remove leading articles
        .replace(/^(?:a|an|the)\s+/i, '')
        // Clean up punctuation and whitespace
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Calculate Levenshtein-based similarity
   */
  private static levenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Token-based similarity using word overlap with intelligent filtering
   */
  private static tokenBasedSimilarity(title1: string, title2: string): number {
    // Filter out common stop words and short tokens
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);

    const tokens1 = new Set(
      title1
        .split(/\s+/)
        .filter(
          token => token.length > 2 && !stopWords.has(token.toLowerCase()),
        ),
    );
    const tokens2 = new Set(
      title2
        .split(/\s+/)
        .filter(
          token => token.length > 2 && !stopWords.has(token.toLowerCase()),
        ),
    );

    if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set(
      [...tokens1].filter(token => tokens2.has(token)),
    );
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Jaccard similarity coefficient for character-level comparison
   */
  private static jaccardSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));

    const intersection = new Set([...set1].filter(char => set2.has(char)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Determine if two titles share the same core concept using multiple strategies
   */
  private static areCoretitlesRelated(title1: string, title2: string): boolean {
    if (!title1 || !title2) return false;

    // Strategy 1: Core word matching (first 2-3 significant words)
    const getCore = (title: string) => {
      const words = title.split(' ').filter(word => word.length > 2);
      return words.slice(0, Math.min(3, words.length)).join(' ');
    };

    const core1 = getCore(title1);
    const core2 = getCore(title2);

    if (core1 === core2 && core1.length > 5) return true;

    // Strategy 2: Significant word overlap (>70% of meaningful words)
    const getSignificantWords = (title: string) => {
      const stopWords = new Set([
        'a',
        'an',
        'the',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
      ]);
      return new Set(
        title
          .split(' ')
          .filter(word => word.length > 2 && !stopWords.has(word)),
      );
    };

    const words1 = getSignificantWords(title1);
    const words2 = getSignificantWords(title2);

    if (words1.size === 0 || words2.size === 0) return false;

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const minWords = Math.min(words1.size, words2.size);

    // If 70% or more of the smaller set's words are in the intersection
    return intersection.size / minWords >= 0.7;
  }

  /**
   * Check publisher consistency for additional validation
   */
  private static arePublishersConsistent(
    book1: UIBook,
    book2: UIBook,
  ): boolean {
    if (!book1.publisher || !book2.publisher) return true; // No conflict if unknown

    const pub1 = book1.publisher
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    const pub2 = book2.publisher
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();

    // Same publisher
    if (pub1 === pub2) return true;

    // Publisher variations (e.g., "Wiley" vs "John Wiley & Sons")
    const variations = [
      ['wiley', 'john wiley', 'wiley sons'],
      ['penguin', 'penguin random house', 'penguin books'],
      ['harpercollins', 'harper collins', 'harper'],
      ['macmillan', 'st martins', 'st martins press'],
    ];

    for (const group of variations) {
      const pub1Match = group.some(variant => pub1.includes(variant));
      const pub2Match = group.some(variant => pub2.includes(variant));
      if (pub1Match && pub2Match) return true;
    }

    return false;
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
    const filtered = books.filter(book => {
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

    return filtered;
  }

  /**
   * Group books by normalized title (removing edition indicators)
   * Uses similarity-based grouping to handle title variations
   */
  private static groupByNormalizedTitle(
    books: UIBook[],
  ): Map<string, UIBook[]> {
    const titleGroups = new Map<string, UIBook[]>();

    for (const book of books) {
      const normalizedTitle = this.normalizeBookTitle(book.title);

      // Check if this title is similar to any existing group
      let foundSimilarGroup = false;

      for (const [existingTitle, existingBooks] of titleGroups.entries()) {
        // Check if one title is a prefix/subset of the other (handles "Startup Life" vs "Startup Life: Surviving...")
        const isSubset =
          normalizedTitle.includes(existingTitle) ||
          existingTitle.includes(normalizedTitle);

        // Enhanced core title matching
        const hasSameCore = this.areCoretitlesRelated(
          normalizedTitle,
          existingTitle,
        );

        // Calculate similarity between titles using multiple algorithms
        const similarity = this.calculateTitleSimilarity(
          normalizedTitle,
          existingTitle,
        );

        // Publisher consistency check (books should have compatible publishers)
        const publisherConsistent =
          existingBooks.length === 0 ||
          existingBooks.some(existingBook =>
            this.arePublishersConsistent(book, existingBook),
          );

        // Pattern-based fallback for malformed titles
        const isProblematicTitle = this.hasProblematicTitlePattern(
          book.title,
          existingBooks[0]?.title,
        );

        // Enhanced grouping criteria with multiple algorithmic approaches
        const shouldGroup =
          similarity > 0.7 || // High similarity threshold (more lenient)
          (isSubset && similarity > 0.4) || // Subset with minimal similarity
          (hasSameCore && publisherConsistent && similarity > 0.3) || // Core title match with publisher check
          (similarity > 0.5 && publisherConsistent) || // Good similarity with publisher validation
          (hasSameCore && similarity > 0.4) || // Core title match with reasonable similarity (fallback)
          isProblematicTitle; // Pattern-based fallback for malformed titles

        if (shouldGroup) {
          existingBooks.push(book);
          foundSimilarGroup = true;
          break;
        }
      }

      // If no similar group found, create new group
      if (!foundSimilarGroup) {
        titleGroups.set(normalizedTitle, [book]);
      }
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
        // DON'T remove subtitle - normalize the full title for better grouping
        // This allows "Startup Life: Surviving..." and "Startup Life Surviving..." to group together
        // .replace(/:.*$/, '') // REMOVED - was causing edition splitting
        // Remove parentheticals (including language indicators)
        .replace(/\([^)]*\)/g, '')
        // Remove common suffixes and prefixes
        .replace(/\s*--by\s+.*$/i, '')
        .replace(/^\s*the\s+/i, '')
        // Normalize punctuation and whitespace - treat punctuation as spaces
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

    // Step 3: Handle audiobooks specially - try to group them with print editions
    const audiobooks: typeof unmappedBooks = [];
    const nonAudiobooks: typeof unmappedBooks = [];

    for (const bookData of unmappedBooks) {
      if (
        this.isAudiobookFormat(
          bookData.book.binding || bookData.book.print_type,
        )
      ) {
        audiobooks.push(bookData);
      } else {
        nonAudiobooks.push(bookData);
      }
    }

    // Try to group audiobooks with existing print editions using simple date matching
    for (const audiobookData of audiobooks) {
      let wasGrouped = false;

      if (audiobookData.publicationYear) {
        // Find the closest edition by publication year (within 5 years)
        let closestEdition: number | null = null;
        let closestYearDiff = Infinity;

        for (const [editionNum, bookList] of editionMap.entries()) {
          if (bookList.length > 0 && bookList[0].publicationYear) {
            const yearDiff = Math.abs(
              audiobookData.publicationYear - bookList[0].publicationYear,
            );
            if (yearDiff <= 5 && yearDiff < closestYearDiff) {
              closestEdition = editionNum;
              closestYearDiff = yearDiff;
            }
          }
        }

        // Add audiobook to the closest edition if found
        if (closestEdition !== null) {
          editionMap.get(closestEdition)!.push(audiobookData);
          wasGrouped = true;
        }
      }

      // If audiobook couldn't be grouped by date, treat it as regular unmapped book
      if (!wasGrouped) {
        nonAudiobooks.push(audiobookData);
      }
    }

    // Step 4: Create authoritative edition timeline using binding hierarchy
    const editionTimeline = this.createEditionTimeline(editionMap);

    // Step 5: Map remaining unmapped books to editions based on publication date ranges
    this.mapBooksByDateRange(nonAudiobooks, editionTimeline, editionMap);

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
    // Step 0: Check ISBN-specific edition corrections first
    if (book.isbn) {
      const isbnEditionCorrections: { [isbn: string]: number } = {
        // Startup Opportunities - ISBNDB missing edition metadata for known 2nd edition books
        '9781119378198': 2, // ISBNDB shows Edition: 2 but API doesn't return it
        '9788126572069': 2, // ISBNDB shows Edition: 2
      };

      const correctedEdition = isbnEditionCorrections[book.isbn];
      if (correctedEdition) {
        return correctedEdition;
      }
    }

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

        // If no specific match found, check if it's close to any edition (within 5 years)
        for (const edition of printEditions) {
          if (
            edition.publication_year &&
            Math.abs(audiobookYear - edition.publication_year) <= 5
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
    // Strategy 1: Direct year field (most common)
    if (book.year && typeof book.year === 'number') {
      if (book.year > 1800 && book.year <= new Date().getFullYear() + 5) {
        return book.year;
      }
    }

    // Strategy 2: Direct date_published field
    if (book.date_published) {
      const year = parseInt(book.date_published.substring(0, 4), 10);
      if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear() + 5) {
        return year;
      }
    }

    // Strategy 3: Try published_date field (alternative naming)
    if (book.published_date) {
      const dateStr = book.published_date.toString();
      const year = parseInt(dateStr.substring(0, 4), 10);
      if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear() + 5) {
        return year;
      }
    }

    // Strategy 4: Extract from title (sometimes has year)
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
      'kindle edition': 'ebook',
      kindle: 'ebook',
      epub: 'ebook',
      pdf: 'ebook',

      // Electronic resource - needs context-aware detection
      // NOTE: Don't auto-map "electronic" - let it fall through to contextual detection

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

    // Special handling for ambiguous terms before partial matching
    if (
      normalized.includes('electronic resource') ||
      normalized === 'electronic resource'
    ) {
      // Context-aware detection for electronic resource
      return this.detectElectronicResourceType(binding);
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
   * Context-aware detection for "electronic resource" binding type
   * Some electronic resources are actually audiobooks, not ebooks
   */
  private static detectElectronicResourceType(binding?: string): string {
    if (!binding) return 'ebook';

    const normalized = binding.toLowerCase();

    // Check for audiobook indicators in the binding string
    if (
      normalized.includes('audio') ||
      normalized.includes('mp3') ||
      normalized.includes('unabridged') ||
      normalized.includes('narrator')
    ) {
      return 'audiobook';
    }

    // Default to ebook for electronic resources
    return 'ebook';
  }

  /**
   * Apply ISBN-specific binding corrections for known data quality issues
   */
  static applyISBNBindingCorrections(book: UIBook): UIBook {
    if (!book.isbn) return book;

    // Known binding corrections based on external verification
    const isbnCorrections: { [isbn: string]: string } = {
      // Startup Life - Google Books has wrong binding type
      '9781118443644': 'hardcover', // Amazon confirms this is hardcover, not paperback

      // Startup Life - ISBNDB missing binding info, but Open Library groups it with other ebooks
      '9781118516850': 'ebook', // Open Library confirms this is same work as other ebook ISBNs

      // Add more corrections as we discover data quality issues
    };

    const correctedBinding = isbnCorrections[book.isbn];
    if (correctedBinding) {
      return {
        ...book,
        binding: correctedBinding,
        print_type: correctedBinding,
      };
    }

    return book;
  }

  /**
   * Detect problematic title patterns that need special handling
   */
  private static hasProblematicTitlePattern(
    title1?: string,
    title2?: string,
  ): boolean {
    if (!title1 || !title2) return false;

    // Patterns that indicate malformed titles needing special handling
    const problematicPatterns = [
      // Title with embedded author, binding, year, ISBN
      /--by\s+[^[\]()]+.*\[.*\d{4}.*edition.*\].*isbn/i,
      // Title with binding info in parentheses
      /\((?:hardcover|paperback|ebook|kindle|audiobook)\)/i,
      // Title with edition and year embedded
      /,?\s*\d+(?:st|nd|rd|th)?\s+ed\.\s*\[.*\d{4}/i,
    ];

    const hasProblematicPattern = (title: string) =>
      problematicPatterns.some(pattern => pattern.test(title));

    // If one title has problematic patterns, check if they share core concepts
    const title1Problematic = hasProblematicPattern(title1);
    const title2Problematic = hasProblematicPattern(title2);

    if (title1Problematic || title2Problematic) {
      // Extract core title words (first 2-3 meaningful words)
      const extractCore = (title: string) => {
        return title
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2)
          .slice(0, 3)
          .join(' ');
      };

      const core1 = extractCore(title1);
      const core2 = extractCore(title2);

      // If cores share 2+ words, likely the same book
      const words1 = new Set(core1.split(' '));
      const words2 = new Set(core2.split(' '));
      const intersection = new Set(
        [...words1].filter(word => words2.has(word)),
      );

      return intersection.size >= 2;
    }

    return false;
  }

  // Removed hardcoded ISBN relations - now using algorithmic title matching

  // Removed manual missing book handling - using algorithmic matching

  /**
   * Get the best metadata (publication date, page count, etc.) from books in an edition
   * Priority: Hardcover → Paperback → Ebook → Audiobook → First available
   */
  static getBestMetadata(books: UIBook[]): Partial<UIBook> {
    if (!books.length) return {};

    // Group books by normalized binding type
    const bindingGroups: { [binding: string]: UIBook[] } = {};
    books.forEach(book => {
      const binding = this.normalizeBindingType(
        book.binding || book.print_type,
      );
      if (!bindingGroups[binding]) bindingGroups[binding] = [];
      bindingGroups[binding].push(book);
    });

    // Remove debug logging

    // Priority order for metadata selection
    const bindingPriority = ['hardcover', 'paperback', 'ebook', 'audiobook'];

    // Find the highest priority binding with useful metadata
    for (const bindingType of bindingPriority) {
      const booksInBinding = bindingGroups[bindingType];
      if (booksInBinding?.length) {
        // Find book with most complete metadata in this binding
        const bestBook = booksInBinding.reduce((best, current) => {
          const bestScore = this.getMetadataScore(best);
          const currentScore = this.getMetadataScore(current);
          return currentScore > bestScore ? current : best;
        });

        if (this.getMetadataScore(bestBook) > 0) {
          return {
            published_date:
              bestBook.published_date || bestBook.year?.toString(),
            page_count: bestBook.page_count || bestBook.pages,
            publisher: bestBook.publisher,
            description: bestBook.description,
            image: bestBook.image || bestBook.thumbnail,
            language: bestBook.language,
          };
        }
      }
    }

    // Fallback: use any book with the best metadata
    const bestBook = books.reduce((best, current) => {
      const bestScore = this.getMetadataScore(best);
      const currentScore = this.getMetadataScore(current);
      return currentScore > bestScore ? current : best;
    });

    return {
      published_date: bestBook.published_date || bestBook.year?.toString(),
      page_count: bestBook.page_count || bestBook.pages,
      publisher: bestBook.publisher,
      description: bestBook.description,
      image: bestBook.image || bestBook.thumbnail,
      language: bestBook.language,
    };
  }

  /**
   * Score a book's metadata completeness (higher is better)
   */
  private static getMetadataScore(book: UIBook): number {
    let score = 0;
    if (book.published_date || book.year) score += 3;
    if (book.page_count || book.pages) score += 2;
    if (book.publisher) score += 1;
    if (book.description) score += 1;
    if (book.image || book.thumbnail) score += 1;
    return score;
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
