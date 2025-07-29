import { NextRequest } from 'next/server';

import { BookService } from '@/lib/services/book.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  let requestId: string;

  try {
    // Validate authentication and get request ID
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    // Get book ID from params
    const { bookId } = await params;

    if (!bookId) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Book ID is required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Delete the book and all its editions/bindings
    await ApiErrorHandler.handleAsync(
      () => BookService.deleteBook(bookId, userId),
      'Failed to delete book',
    );

    return ApiErrorHandler.createSuccessResponse(
      { bookId },
      'Book deleted successfully',
      STATUS_CODES.OK,
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

    // Handle book not found errors
    if (
      error instanceof Error &&
      error.message.includes('Book not found or access denied')
    ) {
      return ApiErrorHandler.createErrorResponse(
        error,
        STATUS_CODES.NOT_FOUND,
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
