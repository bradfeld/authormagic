import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

import { PrimaryBookService } from '@/lib/services/primary-book.service';
import { UIBook } from '@/lib/types/ui-book';
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

    const { book, allEditionData } = validation.data;

    // Extract title and author from validated data
    const title = book.title;
    const author = Array.isArray(book.authors)
      ? book.authors.join(', ')
      : book.authors[0] || 'Unknown Author';

    // Convert validated books to UIBook format (adding IDs)
    const convertToUIBook = (bookData: typeof book): UIBook => ({
      ...bookData,
      id: crypto.randomUUID(), // Generate temporary ID for processing
    });

    // Use all edition data if provided, otherwise just the single book
    const searchResults: UIBook[] =
      allEditionData && allEditionData.length > 0
        ? allEditionData.map(convertToUIBook)
        : [convertToUIBook(book)];

    // Check if the book already exists
    const existingBook = await ApiErrorHandler.handleAsync(
      () => PrimaryBookService.findExistingBook(userId, title, author),
      'Failed to check for existing book',
    );

    let primaryBook;
    let message: string;
    let statusCode: number = STATUS_CODES.CREATED;

    if (existingBook) {
      // Update existing book with new edition data
      primaryBook = await ApiErrorHandler.handleAsync(
        () =>
          PrimaryBookService.updateBookWithNewEditions(
            existingBook.id,
            searchResults,
          ),
        'Failed to update book with new editions',
      );
      message = 'Book already in library - updated with latest edition data';
      statusCode = STATUS_CODES.OK;
    } else {
      // Create new primary book
      primaryBook = await ApiErrorHandler.handleAsync(
        () =>
          PrimaryBookService.createPrimaryBook(
            userId,
            title,
            author,
            searchResults,
          ),
        'Failed to create new book',
      );
      message = 'Book added to library successfully';
    }

    // Revalidate the dashboard page to show the new book
    revalidatePath('/dashboard');

    return ApiErrorHandler.createSuccessResponse(
      {
        primaryBook,
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
