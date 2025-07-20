import { NextRequest } from 'next/server';
import { z } from 'zod';

import { WaitlistService } from '@/lib/services/waitlist.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';
import {
  validateRequestBody,
  sanitizeObject,
} from '@/lib/validation/api-schemas';

// Schema for single user approval request
const ApprovalSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
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

    const validation = validateRequestBody(ApprovalSchema, sanitizedBody);
    if (!validation.success) {
      return ApiErrorHandler.createErrorResponse(
        validation.error,
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        requestId,
      );
    }

    const { userId, adminNotes } = validation.data;

    // Check if user exists and is waitlisted
    const userStatus = await waitlistService.getUserStatus(userId);
    if (!userStatus) {
      return ApiErrorHandler.createErrorResponse(
        new Error('User not found'),
        STATUS_CODES.NOT_FOUND,
        requestId,
      );
    }

    if (userStatus.status !== 'waitlisted') {
      return ApiErrorHandler.createErrorResponse(
        new Error(`User is already ${userStatus.status}`),
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        requestId,
      );
    }

    // Approve the user
    await ApiErrorHandler.handleAsync(
      () => waitlistService.approveUser(userId, adminUserId, adminNotes),
      'Failed to approve user',
    );

    return ApiErrorHandler.createSuccessResponse(
      {
        userId,
        previousStatus: userStatus.status,
        newStatus: 'approved',
        approvedBy: adminUserId,
      },
      'User approved successfully',
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
