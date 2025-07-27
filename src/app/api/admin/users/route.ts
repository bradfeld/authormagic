import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { WaitlistService } from '@/lib/services/waitlist.service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const waitlistService = new WaitlistService();

    // Check if current user is admin
    const isAdmin = await waitlistService.isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role'); // 'admin', 'user', or null for all
    const searchQuery = searchParams.get('search'); // search term for name/email
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get users from Clerk
    const client = await clerkClient();

    let clerkUsersResponse;
    if (searchQuery) {
      // Search by email or name
      clerkUsersResponse = await client.users.getUserList({
        query: searchQuery,
        limit,
        orderBy: '-created_at',
      });
    } else {
      // Get all users
      clerkUsersResponse = await client.users.getUserList({
        limit,
        orderBy: '-created_at',
      });
    }

    const clerkUsers = clerkUsersResponse.data || [];

    if (!clerkUsers.length) {
      return NextResponse.json({ users: [] });
    }

    // Get roles for all users from Supabase
    const userIds = clerkUsers.map(user => user.id);
    const rolesResponse = await waitlistService.getUserRoles(userIds);

    // Combine Clerk user data with role data
    const usersWithRoles = clerkUsers.map(clerkUser => {
      const roleData = rolesResponse.find(
        r => r.clerk_user_id === clerkUser.id,
      );

      return {
        id: clerkUser.id,
        clerk_user_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || null,
        name:
          clerkUser.fullName ||
          `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
          null,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        profileImageUrl: clerkUser.imageUrl,
        emailVerified:
          clerkUser.emailAddresses[0]?.verification?.status === 'verified',
        createdAt: new Date(clerkUser.createdAt).toISOString(),
        lastSignInAt: clerkUser.lastSignInAt
          ? new Date(clerkUser.lastSignInAt).toISOString()
          : null,
        role: roleData?.role || null,
        // Remove waitlist-specific fields as they're no longer relevant
      };
    });

    // Filter by role if specified
    let filteredUsers = usersWithRoles;
    if (roleFilter && ['admin', 'user'].includes(roleFilter)) {
      if (roleFilter === 'user') {
        // Users with no role or explicit 'user' role
        filteredUsers = usersWithRoles.filter(
          user => !user.role || user.role === 'user',
        );
      } else {
        // Users with specific role
        filteredUsers = usersWithRoles.filter(user => user.role === roleFilter);
      }
    }

    return NextResponse.json({
      users: filteredUsers,
      totalCount: clerkUsersResponse.totalCount,
      message: `Found ${filteredUsers.length} users`,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in admin users API:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
