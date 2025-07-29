import { NextRequest } from 'next/server';

import { BookService } from '@/lib/services/book.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';

export async function GET(
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

    // Get the book with all editions and bindings
    const book = await ApiErrorHandler.handleAsync(
      () => BookService.getBookWithDetails(bookId, userId),
      'Failed to fetch book details',
    );

    if (!book) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Book not found'),
        STATUS_CODES.NOT_FOUND,
        requestId,
      );
    }

    return ApiErrorHandler.createSuccessResponse(
      { book },
      'Book details retrieved successfully',
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

    // Handle all other errors
    return ApiErrorHandler.createErrorResponse(
      error,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      requestId!,
    );
  }
}

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  let requestId: string;
  try {
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    const { bookId } = await params;
    if (!bookId) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Book ID is required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, author } = body;

    // Validate required fields
    if (!title || !author) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Title and author are required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Validate field lengths
    if (title.trim().length === 0 || title.length > 500) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Title must be between 1 and 500 characters'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    if (author.trim().length === 0 || author.length > 200) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Author must be between 1 and 200 characters'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    const updatedBook = await ApiErrorHandler.handleAsync(
      () => BookService.updateBook(bookId, userId, title, author),
      'Failed to update book',
    );

    return ApiErrorHandler.createSuccessResponse(
      { book: updatedBook },
      'Book updated successfully',
      STATUS_CODES.OK,
      requestId,
    );
  } catch (error) {
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
    return ApiErrorHandler.createErrorResponse(
      error,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      requestId!,
    );
  }
}
