import { NextRequest } from 'next/server';
import { z } from 'zod';

import { WaitlistService } from '@/lib/services/waitlist.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';
import {
  validateRequestBody,
  sanitizeObject,
} from '@/lib/validation/api-schemas';

// Schema for bulk approval request
const BulkApprovalSchema = z.object({
  userIds: z
    .array(z.string().min(1, 'User ID cannot be empty'))
    .min(1, 'At least one user ID required'),
  adminNotes: z.string().max(500, 'Admin notes too long').optional(),
});

export async function POST(request: NextRequest) {
  let requestId: string;

  try {
    // Validate authentication and get request ID
    const { userId, requestId: id } = await ApiErrorHandler.validateAuth();
    requestId = id;

    // Check if user is admin
    const waitlistService = new WaitlistService();
    const isAdmin = await waitlistService.isUserAdmin(userId);

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

    const validation = validateRequestBody(BulkApprovalSchema, sanitizedBody);
    if (!validation.success) {
      return ApiErrorHandler.createErrorResponse(
        validation.error,
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        requestId,
      );
    }

    const { userIds, adminNotes } = validation.data;

    // Validate that userIds are not empty and are unique
    const uniqueUserIds = [
      ...new Set(userIds.filter(id => id.trim().length > 0)),
    ];

    if (uniqueUserIds.length === 0) {
      return ApiErrorHandler.createErrorResponse(
        new Error('No valid user IDs provided'),
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        requestId,
      );
    }

    // Bulk approve users
    await ApiErrorHandler.handleAsync(
      () => waitlistService.bulkApproveUsers(uniqueUserIds, userId, adminNotes),
      'Failed to approve users',
    );

    return ApiErrorHandler.createSuccessResponse(
      {
        approvedCount: uniqueUserIds.length,
        userIds: uniqueUserIds,
      },
      `Successfully approved ${uniqueUserIds.length} user(s)`,
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
