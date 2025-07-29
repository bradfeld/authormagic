import { NextRequest } from 'next/server';

import { BookService } from '@/lib/services/book.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ editionId: string }> },
) {
  let requestId: string;
  try {
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    const { editionId } = await params;
    if (!editionId) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Edition ID is required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Parse request body
    const body = await request.json();
    const { edition_number, publication_year } = body;

    // Validate required fields
    if (edition_number === undefined || edition_number === null) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Edition number is required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Validate edition number
    if (
      !Number.isInteger(edition_number) ||
      edition_number < 1 ||
      edition_number > 999
    ) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Edition number must be an integer between 1 and 999'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Validate publication year if provided
    if (publication_year !== undefined && publication_year !== null) {
      if (
        !Number.isInteger(publication_year) ||
        publication_year < 1000 ||
        publication_year > new Date().getFullYear() + 10
      ) {
        return ApiErrorHandler.createErrorResponse(
          new Error(
            'Publication year must be a valid year between 1000 and 10 years in the future',
          ),
          STATUS_CODES.BAD_REQUEST,
          requestId,
        );
      }
    }

    const updatedEdition = await ApiErrorHandler.handleAsync(
      () =>
        BookService.updateEdition(
          editionId,
          userId,
          edition_number,
          publication_year,
        ),
      'Failed to update edition',
    );

    return ApiErrorHandler.createSuccessResponse(
      { edition: updatedEdition },
      'Edition updated successfully',
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
      error.message.includes('Edition not found or access denied')
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ editionId: string }> },
) {
  let requestId: string;
  try {
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    const { editionId } = await params;
    if (!editionId) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Edition ID is required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    await ApiErrorHandler.handleAsync(
      () => BookService.deleteEdition(editionId, userId),
      'Failed to delete edition',
    );

    return ApiErrorHandler.createSuccessResponse(
      { editionId },
      'Edition deleted successfully',
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
      error.message.includes('Edition not found or access denied')
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
