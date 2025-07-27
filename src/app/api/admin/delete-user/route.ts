import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { AuditLogService } from '@/lib/services/audit-log.service';
import { UserDeletionService } from '@/lib/services/user-deletion.service';
import { WaitlistService } from '@/lib/services/waitlist.service';

export async function DELETE(request: NextRequest) {
  try {
    // Admin authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const waitlistService = new WaitlistService();
    const isAdmin = await waitlistService.isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { userIdToDelete, confirmationText } = body;

    if (!userIdToDelete) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    // Safety check: Prevent self-deletion
    if (userIdToDelete === userId) {
      return NextResponse.json(
        {
          error: 'Cannot delete your own account',
        },
        { status: 400 },
      );
    }

    // Get user details before deletion for audit log
    const clerk = await clerkClient();
    let userToDelete;
    try {
      userToDelete = await clerk.users.getUser(userIdToDelete);
    } catch {
      return NextResponse.json(
        {
          error: 'User not found',
        },
        { status: 404 },
      );
    }

    // Check if user is an admin (prevent deleting last admin)
    const isTargetAdmin = await waitlistService.isUserAdmin(userIdToDelete);
    if (isTargetAdmin) {
      // Count total admins
      const allUsers = await clerk.users.getUserList({ limit: 500 });
      const adminCount = await Promise.all(
        allUsers.data.map(user => waitlistService.isUserAdmin(user.id)),
      ).then(results => results.filter(Boolean).length);

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: 'Cannot delete the last admin user',
          },
          { status: 400 },
        );
      }
    }

    // Validate confirmation text (should be username or email)
    const expectedConfirmation =
      userToDelete.username ||
      userToDelete.emailAddresses[0]?.emailAddress ||
      '';
    if (confirmationText !== expectedConfirmation) {
      return NextResponse.json(
        {
          error: 'Confirmation text does not match',
        },
        { status: 400 },
      );
    }

    // Initialize deletion service
    const deletionService = new UserDeletionService();

    // Perform comprehensive cleanup
    const cleanupResult =
      await deletionService.deleteUserAndArtifacts(userIdToDelete);

    // Get admin user details for audit log
    const adminUser = await clerk.users.getUser(userId);

    // Log the deletion event
    const auditService = new AuditLogService();
    await auditService.logAuditEvent({
      action_type: 'user_delete',
      action_category: 'user_management',
      action_description: `Deleted user: ${userToDelete.emailAddresses[0]?.emailAddress}`,
      performed_by_user_id: userId,
      target_user_id: userIdToDelete,
      before_state: {
        user_id: userToDelete.id,
        email: userToDelete.emailAddresses[0]?.emailAddress,
        username: userToDelete.username,
        created_at: userToDelete.createdAt,
        was_admin: isTargetAdmin,
      },
      after_state: {
        deleted: true,
        deleted_at: new Date().toISOString(),
        cleanup_summary: cleanupResult,
      },
      metadata: {
        admin_email: adminUser.emailAddresses[0]?.emailAddress,
        confirmation_provided: true,
        artifacts_cleaned: cleanupResult.artifactsRemoved,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Log success in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('✅ User deletion completed:', {
        deletedUser: userToDelete.emailAddresses[0]?.emailAddress,
        adminPerformer: adminUser.emailAddresses[0]?.emailAddress,
        cleanupResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      cleanupSummary: cleanupResult,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('❌ User deletion error:', error);
    }

    // Log the failed deletion attempt
    try {
      const { userId } = await auth();
      if (userId) {
        const auditService = new AuditLogService();
        await auditService.logAuditEvent({
          action_type: 'user_delete_failed',
          action_category: 'user_management',
          action_description: 'Failed user deletion attempt',
          performed_by_user_id: userId,
          status: 'failed',
          metadata: {
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
          },
        });
      }
    } catch {
      // Silent fail for audit logging to not mask original error
    }

    return NextResponse.json(
      {
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
