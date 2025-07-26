import { NextRequest } from 'next/server';
import { z } from 'zod';

import { WaitlistService } from '@/lib/services/waitlist.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';
import {
  validateRequestBody,
  sanitizeObject,
} from '@/lib/validation/api-schemas';

// Schema for bulk user removal request
const BulkRemovalSchema = z.object({
  userIds: z
    .array(z.string().min(1, 'User ID is required'))
    .min(1, 'At least one user ID is required'),
  adminNotes: z.string().max(500, 'Admin notes too long').optional(),
});

export async function POST(request: NextRequest) {
  let requestId: string;

  try {
    // Validate authentication and get request ID
    const { userId: adminUserId, requestId: id } =
      await ApiErrorHandler.validateAuth();
    requestId = id;

    // Check if user is admin
    const waitlistService = new WaitlistService();
    const isAdmin = await waitlistService.isUserAdmin(adminUserId);

    if (!isAdmin) {
      return ApiErrorHandler.createErrorResponse(
        new Error('Admin access required'),
        STATUS_CODES.FORBIDDEN,
        requestId,
      );
    }

    // Parse and validate request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);

    const validation = validateRequestBody(BulkRemovalSchema, sanitizedBody);
    if (!validation.success) {
      return ApiErrorHandler.createErrorResponse(
        validation.error,
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        requestId,
      );
    }

    const { userIds, adminNotes } = validation.data;

    // Process each user removal
    const results = await Promise.allSettled(
      userIds.map(async userId => {
        // Check if user exists and is waitlisted
        const userStatus = await waitlistService.getUserStatus(userId);
        if (!userStatus) {
          throw new Error(`User ${userId} not found`);
        }

        if (userStatus.status !== 'waitlisted') {
          throw new Error(
            `User ${userId} is not waitlisted (current status: ${userStatus.status})`,
          );
        }

        // Remove the user by setting status to 'blocked'
        await waitlistService.updateUserStatus(
          userId,
          'blocked',
          adminUserId,
          adminNotes || 'Removed from waitlist by admin',
        );

        return { userId, success: true };
      }),
    );

    // Separate successful and failed removals
    const successful = results
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{
          userId: string;
          success: boolean;
        }> => result.status === 'fulfilled',
      )
      .map(result => result.value);

    const failed = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      )
      .map(result => result.reason.message);

    return ApiErrorHandler.createSuccessResponse(
      {
        removedUsers: successful,
        removedCount: successful.length,
        failedCount: failed.length,
        errors: failed,
        removedBy: adminUserId,
      },
      `Successfully removed ${successful.length} of ${userIds.length} users from waitlist`,
      STATUS_CODES.OK,
      requestId,
    );
  } catch (error) {
    return ApiErrorHandler.createErrorResponse(
      error as Error,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      requestId!,
    );
  }
}
