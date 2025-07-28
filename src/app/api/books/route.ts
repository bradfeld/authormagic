import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

import { BookService } from '@/lib/services/book.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';
import {
  BookCreateRequestSchema,
  validateRequestBody,
  sanitizeObject,
} from '@/lib/validation/api-schemas';

export async function POST(request: NextRequest) {
  let requestId: string;

  try {
    // Validate authentication and get request ID
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    // Parse and validate request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);

    const validation = validateRequestBody(
      BookCreateRequestSchema,
      sanitizedBody,
    );
    if (!validation.success) {
      return ApiErrorHandler.createErrorResponse(
        validation.error,
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        requestId,
      );
    }

    const { book: bookData, editionGroups } = validation.data;

    // Add IDs to books to match UIBook type (preserving structure)
    const editionGroupsWithIds = editionGroups.map(editionGroup => ({
      ...editionGroup,
      books: editionGroup.books.map(bookData => ({
        ...bookData,
        id: crypto.randomUUID(), // Generate ID for UIBook compatibility
      })),
    }));

    // Extract title and author from validated data
    const title = bookData.title;
    const author = Array.isArray(bookData.authors)
      ? bookData.authors.join(', ')
      : bookData.authors[0] || 'Unknown Author';

    // Check if the book already exists
    const existingBook = await ApiErrorHandler.handleAsync(
      () => BookService.findExistingBook(userId, title, author),
      'Failed to check for existing book',
    );

    let book;
    let message: string;
    let statusCode: number = STATUS_CODES.CREATED;

    if (existingBook) {
      // Update existing book with new edition data (preserve structure)
      book = await ApiErrorHandler.handleAsync(
        () =>
          BookService.updateBookWithNewEditions(
            existingBook.id,
            editionGroupsWithIds,
          ),
        'Failed to update book with new editions',
      );
      message = 'Book already in collection - updated with latest edition data';
      statusCode = STATUS_CODES.OK;
    } else {
      // Create new book (preserve structure)
      book = await ApiErrorHandler.handleAsync(
        () =>
          BookService.createBook(userId, title, author, editionGroupsWithIds),
        'Failed to create new book',
      );
      message = 'Book added to collection successfully';
    }

    // Revalidate the dashboard page to show the new book
    revalidatePath('/dashboard');

    return ApiErrorHandler.createSuccessResponse(
      {
        book,
        isUpdate: !!existingBook,
      },
      message,
      statusCode,
      requestId,
    );
  } catch (error) {
    // Handle authentication errors with proper status codes
    if (
      error instanceof Error &&
      error.message.includes('Authentication required')
    ) {
      return ApiErrorHandler.createErrorResponse(
        error,
        STATUS_CODES.UNAUTHORIZED,
        requestId!,
      );
    }

    // Handle all other errors
    return ApiErrorHandler.createErrorResponse(
      error,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      requestId!,
    );
  }
}
