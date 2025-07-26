import { WaitlistService } from '@/lib/services/waitlist.service';
import { ApiErrorHandler, STATUS_CODES } from '@/lib/utils/api-error-handler';

export async function GET() {
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

    // Get all waitlisted users with improved error handling
    const users = await ApiErrorHandler.handleAsync(
      () => waitlistService.getWaitlistedUsers(),
      'Failed to fetch waitlisted users',
    );

    return ApiErrorHandler.createSuccessResponse(
      {
        users,
        count: users.length,
        message: `Found ${users.length} waitlisted users`,
      },
      'Waitlisted users retrieved successfully',
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
