import { UIBook } from '../types/ui-book';

/**
 * Extract unique ISBNs from a collection of books from various sources
 * Normalizes ISBN-10 to ISBN-13 format for consistency
 */
export function extractUniqueISBNs(books: UIBook[]): string[] {
  const isbnSet = new Set<string>();

  books.forEach(book => {
    if (!book.isbn) return;

    // Clean the ISBN (remove hyphens, spaces, etc.)
    const cleanISBN = book.isbn.replace(/[-\s]/g, '');

    // Add ISBN-13 if available
    if (cleanISBN.length === 13) {
      isbnSet.add(cleanISBN);
    }
    // Convert ISBN-10 to ISBN-13 if needed
    else if (cleanISBN.length === 10) {
      const isbn13 = convertISBN10to13(cleanISBN);
      if (isbn13) {
        isbnSet.add(isbn13);
      }
    }
  });

  return Array.from(isbnSet);
}

/**
 * Convert ISBN-10 to ISBN-13 format
 * Standard algorithm: add 978 prefix, recalculate check digit
 */
function convertISBN10to13(isbn10: string): string | null {
  // Validate ISBN-10 format
  const digits = isbn10.replace(/[^0-9X]/g, '');
  if (digits.length !== 10) return null;

  // Build ISBN-13 prefix (978 + first 9 digits of ISBN-10)
  const prefix = '978' + digits.slice(0, 9);

  // Calculate ISBN-13 check digit
  const checkDigit = calculateISBN13CheckDigit(prefix);

  return prefix + checkDigit;
}

/**
 * Calculate check digit for ISBN-13
 * Algorithm: alternating weight sum modulo 10
 */
function calculateISBN13CheckDigit(prefix: string): string {
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    const digit = parseInt(prefix[i]);
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return checkDigit.toString();
}

/**
 * Validate ISBN-13 format
 */
export function isValidISBN13(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (cleaned.length !== 13) return false;

  const checkDigit = calculateISBN13CheckDigit(cleaned.slice(0, 12));
  return checkDigit === cleaned[12];
}

/**
 * Validate ISBN-10 format
 */
export function isValidISBN10(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (cleaned.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }

  const checkDigit = cleaned[9];
  const remainder = sum % 11;
  const expectedCheck =
    remainder === 0 ? '0' : remainder === 1 ? 'X' : (11 - remainder).toString();

  return checkDigit.toUpperCase() === expectedCheck;
}
