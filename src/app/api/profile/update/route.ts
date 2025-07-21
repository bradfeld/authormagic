import { NextRequest } from 'next/server';

import { AuthorProfileService } from '@/lib/services/author-profile.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';
import { AuthorMetadata } from '@/lib/utils/clerk-metadata';
import {
  ProfileUpdateSchema,
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

    const validation = validateRequestBody(ProfileUpdateSchema, sanitizedBody);
    if (!validation.success) {
      return ApiErrorHandler.createErrorResponse(
        validation.error,
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        requestId,
      );
    }

    const updates = validation.data as Partial<AuthorMetadata>;

    // Initialize the author profile service
    const authorService = new AuthorProfileService();

    // Update the author metadata in Clerk
    await ApiErrorHandler.handleAsync(
      () => authorService.updateAuthorMetadata(userId, updates),
      'Failed to update author metadata',
    );

    // Get the complete updated profile
    const updatedProfile = await ApiErrorHandler.handleAsync(
      () => authorService.getCompleteProfileByClerkUserId(userId),
      'Failed to retrieve updated profile',
    );

    if (!updatedProfile) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Profile not found after update'),
        STATUS_CODES.NOT_FOUND,
        requestId,
      );
    }

    // Add verification data for debugging
    const verificationData = {
      sent_twitter_username: updates.twitter_username,
      stored_twitter_username: updatedProfile.twitter_username,
      sent_bio: updates.bio,
      stored_bio: updatedProfile.bio,
    };

    return ApiErrorHandler.createSuccessResponse(
      {
        profile: updatedProfile,
        verification: verificationData, // Add verification data to response
      },
      'Profile updated successfully',
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
