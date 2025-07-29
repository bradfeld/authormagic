import { NextRequest } from 'next/server';

import { BookService } from '@/lib/services/book.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bindingId: string }> },
) {
  let requestId: string;
  try {
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    const { bindingId } = await params;
    if (!bindingId) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Binding ID is required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      // Removed isbn since it's now read-only
      binding_type,
      price,
      publisher,
      cover_image_url,
      description,
      pages,
      language,
    } = body;

    // Validate required fields
    if (!binding_type || !language) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Binding type and language are required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Validate binding type
    const validBindingTypes = [
      'hardcover',
      'paperback',
      'ebook',
      'audiobook',
      'mass_market',
      'trade_paperback',
      'other',
    ];
    if (!validBindingTypes.includes(binding_type.toLowerCase())) {
      return ApiErrorHandler.createErrorResponse(
        new Error(
          `Invalid binding type. Must be one of: ${validBindingTypes.join(', ')}`,
        ),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    // Validate price if provided
    if (price !== undefined && price !== null) {
      if (typeof price !== 'number' || price < 0 || price > 99999.99) {
        return ApiErrorHandler.createErrorResponse(
          new Error('Price must be a number between 0 and 99999.99'),
          STATUS_CODES.BAD_REQUEST,
          requestId,
        );
      }
    }

    // Validate pages if provided
    if (pages !== undefined && pages !== null) {
      if (!Number.isInteger(pages) || pages < 1 || pages > 99999) {
        return ApiErrorHandler.createErrorResponse(
          new Error('Pages must be an integer between 1 and 99999'),
          STATUS_CODES.BAD_REQUEST,
          requestId,
        );
      }
    }

    // Validate field lengths
    if (publisher && publisher.length > 200) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Publisher must be 200 characters or less'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    if (cover_image_url && cover_image_url.length > 500) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Cover image URL must be 500 characters or less'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    if (description && description.length > 2000) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Description must be 2000 characters or less'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    if (language && language.length > 10) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Language must be 10 characters or less'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    const updatedBinding = await ApiErrorHandler.handleAsync(
      () =>
        BookService.updateBinding(bindingId, userId, {
          binding_type: binding_type.toLowerCase(),
          price,
          publisher,
          cover_image_url,
          description,
          pages,
          language,
        }),
      'Failed to update binding',
    );

    return ApiErrorHandler.createSuccessResponse(
      { binding: updatedBinding },
      'Binding updated successfully',
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
      error.message.includes('Binding not found or access denied')
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
  { params }: { params: Promise<{ bindingId: string }> },
) {
  let requestId: string;
  try {
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    const { bindingId } = await params;
    if (!bindingId) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Binding ID is required'),
        STATUS_CODES.BAD_REQUEST,
        requestId,
      );
    }

    await ApiErrorHandler.handleAsync(
      () => BookService.deleteBinding(bindingId, userId),
      'Failed to delete binding',
    );

    return ApiErrorHandler.createSuccessResponse(
      { bindingId },
      'Binding deleted successfully',
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
      error.message.includes('Binding not found or access denied')
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
