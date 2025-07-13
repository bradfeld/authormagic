/**
 * Edition Detection Service
 * Groups books by edition using multiple detection strategies
 */

import { UIBook } from '@/lib/types/ui-book';
import { BookEdition, BookBinding } from '@/lib/types/primary-book';

export interface EditionGroup {
  edition_number: number;
  edition_type?: string; // For special editions like "unabridged", "revised", etc.
  publication_year?: number;
  books: UIBook[];
}

export class EditionDetectionService {
  /**
   * Main entry point: Group books by edition
   */
  static groupByEdition(books: UIBook[]): EditionGroup[] {
    // First, identify print editions (non-audiobook formats)
    const printBooks = books.filter(book => !this.isAudiobookFormat(book.print_type));
    const audiobooks = books.filter(book => this.isAudiobookFormat(book.print_type));
    
    // Create initial groups from print books
    const editionGroups = new Map<string, EditionGroup>();
    
    for (const book of printBooks) {
      const editionKey = this.detectEditionKey(book);
      
      if (!editionGroups.has(editionKey)) {
        const editionType = this.extractEditionType(book);
        editionGroups.set(editionKey, {
          edition_number: this.extractEditionNumber(book),
          edition_type: editionType,
          publication_year: this.extractPublicationYear(book),
          books: []
        });
      }
      
      editionGroups.get(editionKey)!.books.push(book);
    }
    
    // Now process audiobooks with enhanced algorithm
    for (const audiobook of audiobooks) {
      const audiobookGroup = this.groupAudiobookWithEdition(audiobook, editionGroups);
      if (audiobookGroup) {
        audiobookGroup.books.push(audiobook);
      } else {
        // If no suitable print edition found, create separate audiobook group
        const editionKey = this.detectEditionKey(audiobook);
        if (!editionGroups.has(editionKey)) {
          const editionType = this.extractEditionType(audiobook);
          editionGroups.set(editionKey, {
            edition_number: this.extractEditionNumber(audiobook),
            edition_type: editionType,
            publication_year: this.extractPublicationYear(audiobook),
            books: []
          });
        }
        editionGroups.get(editionKey)!.books.push(audiobook);
      }
    }
    
    // Sort by edition type first (special editions last), then by edition number descending
    return Array.from(editionGroups.values())
      .sort((a, b) => {
        // Special editions come after numeric editions
        if (a.edition_type && !b.edition_type) return 1;
        if (!a.edition_type && b.edition_type) return -1;
        if (a.edition_type && b.edition_type) {
          return a.edition_type.localeCompare(b.edition_type);
        }
        return b.edition_number - a.edition_number;
      });
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
      'cd'
    ];
    
    const normalized = printType.toLowerCase().trim();
    return audioFormats.some(format => normalized.includes(format));
  }

  /**
   * Group audiobook with appropriate print edition based on title and date
   */
  private static groupAudiobookWithEdition(
    audiobook: UIBook, 
    editionGroups: Map<string, EditionGroup>
  ): EditionGroup | null {
    // Primary strategy: Check if audiobook title contains edition information
    const titleEdition = this.extractEditionFromTitle(audiobook.title);
    if (titleEdition > 1) {
      // Find matching print edition by number
      for (const [key, group] of editionGroups) {
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
            const isBeforeNext = !nextEditionYear || audiobookYear < nextEditionYear;
            
            // If audiobook is within the date range, group it with this edition
            if (isAfterCurrent && isBeforeNext) {
              return currentEdition;
            }
          }
        }
        
        // If no specific match found, check if it's close to any edition (within 2 years)
        for (const edition of printEditions) {
          if (edition.publication_year && 
              Math.abs(audiobookYear - edition.publication_year) <= 2) {
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
      const specialEditions = ['unabridged', 'abridged', 'revised', 'updated', 'expanded', 'annotated', 'illustrated', 'deluxe', 'limited', 'special'];
      
      for (const special of specialEditions) {
        if (versionStr.includes(special)) {
          const key = `edition-${special}`;
          console.log(`🔍 Edition key for "${book.title}" (content_version: "${book.content_version}" → special: ${special}): ${key}`);
          return key;
        }
      }
    }
    
    // Use normalized edition number to create consistent keys for numeric editions
    const editionNum = this.extractEditionNumber(book);
    const key = `edition-${editionNum}`;
    console.log(`🔍 Edition key for "${book.title}" (content_version: "${book.content_version}" → edition: ${editionNum}): ${key}`);
    return key;
  }

  /**
   * Extract special edition type from content_version
   */
  private static extractEditionType(book: UIBook): string | undefined {
    if (book.content_version && book.content_version !== '') {
      const versionStr = book.content_version.toLowerCase();
      
      // Special edition types that should be treated as separate editions
      const specialEditions = ['unabridged', 'abridged', 'revised', 'updated', 'expanded', 'annotated', 'illustrated', 'deluxe', 'limited', 'special'];
      
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
      let versionStr = book.content_version.toLowerCase();
      
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
      /new\s+edition/i,     // Treat as 2nd edition
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        if (match[1]) {
          const edition = parseInt(match[1], 10);
          console.log(`Edition extraction: title="${title}", matched="${match[1]}", parsed=${edition}`);
          // Filter out numbers that are too high to be realistic edition numbers
          // Years like "2011" should not be treated as editions
          if (!isNaN(edition) && edition > 0 && edition <= 99) {
            console.log(`✅ Accepted edition: ${edition}`);
            return edition;
          } else {
            console.log(`❌ Rejected edition: ${edition} (too high, likely a year)`);
          }
        } else {
          // For patterns like "revised edition", "updated edition"
          console.log(`Treating as 2nd edition: ${title}`);
          return 2;
        }
      }
    }

    console.log(`No edition found in title, defaulting to 1: ${title}`);
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
    primaryBookId: string
  ): BookEdition[] {
    return editionGroups.map(group => ({
      id: '', // Will be generated by database
      primary_book_id: primaryBookId,
      edition_number: group.edition_number,
      publication_year: group.publication_year,
      created_at: new Date().toISOString(),
      bindings: this.convertToBookBindings(group.books, '')
    }));
  }

  /**
   * Convert UI books to book bindings
   */
  private static convertToBookBindings(books: UIBook[], editionId: string): BookBinding[] {
    return books.map(book => {
      console.log(`🔍 Converting book to binding - Title: "${book.title}", print_type: "${book.print_type}"`);
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
        created_at: new Date().toISOString()
      };
    });
  }

  /**
   * Normalize binding type to consistent values
   */
  private static normalizeBindingType(binding?: string): string {
    if (!binding) {
      console.log(`⚠️ No binding provided, returning 'unknown'`);
      return 'unknown';
    }
    
    const normalized = binding.toLowerCase().trim();
    console.log(`🔍 Normalizing binding: "${binding}" -> "${normalized}"`);
    
    // Map common variations to standard types
    const bindingMap: { [key: string]: string } = {
      'hardcover': 'hardcover',
      'hardback': 'hardcover',
      'hard cover': 'hardcover',
      'hc': 'hardcover',
      
      'paperback': 'paperback',
      'softcover': 'paperback',
      'soft cover': 'paperback',
      'pb': 'paperback',
      'trade paperback': 'paperback',
      
      'ebook': 'ebook',
      'e-book': 'ebook',
      'digital': 'ebook',
      'kindle': 'ebook',
      'kindle edition': 'ebook',
      'epub': 'ebook',
      
      'audiobook': 'audiobook',
      'audio book': 'audiobook',
      'audio_book': 'audiobook',
      'audio': 'audiobook',
      'mp3 cd': 'audiobook',
      'mp3_cd': 'audiobook',
      'audio cd': 'audiobook',
      'audio_cd': 'audiobook',
      'audible': 'audiobook',
      'cd': 'audiobook',
      
      'mass market': 'mass market paperback',
      'mass market paperback': 'mass market paperback',
      'mmpb': 'mass market paperback'
    };
    
    const result = bindingMap[normalized] || normalized;
    console.log(`🔍 Final binding result: "${binding}" -> "${result}"`);
    return result;
  }

  /**
   * Get user-friendly edition display name
   */
  static getEditionDisplayName(edition: EditionGroup): string {
    if (edition.edition_type) {
      // Special edition type - capitalize first letter
      const displayType = edition.edition_type.charAt(0).toUpperCase() + edition.edition_type.slice(1);
      const year = edition.publication_year ? ` (${edition.publication_year})` : '';
      return `${displayType} Edition${year}`;
    } else {
      // Numeric edition
      const ordinal = this.getOrdinal(edition.edition_number);
      const year = edition.publication_year ? ` (${edition.publication_year})` : '';
      return `${ordinal} Edition${year}`;
    }
  }

  /**
   * Convert number to ordinal (1st, 2nd, 3rd, etc.)
   */
  private static getOrdinal(num: number): string {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  }
} 