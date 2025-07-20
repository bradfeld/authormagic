import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { Database } from '@/lib/database.types';
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
    const statusParam = searchParams.get('status'); // 'waitlisted', 'approved', 'blocked'

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Build query for authors
    let authorsQuery = supabase.from('authors').select('*');

    if (
      statusParam &&
      ['waitlisted', 'approved', 'blocked'].includes(statusParam)
    ) {
      authorsQuery = authorsQuery.eq(
        'status',
        statusParam as 'waitlisted' | 'approved' | 'blocked',
      );
    }

    const { data: users, error: usersError } = await authorsQuery.order(
      'created_at',
      { ascending: false },
    );

    if (usersError) {
      throw usersError;
    }

    if (!users.length) {
      return NextResponse.json({ users: [] });
    }

    // Get roles for all users
    const userIds = users.map(user => user.clerk_user_id);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('clerk_user_id, role')
      .in('clerk_user_id', userIds);

    const roleMap = new Map(roles?.map(r => [r.clerk_user_id, r.role]) || []);

    // Filter by role if specified
    let filteredUsers = users;
    if (roleFilter) {
      filteredUsers = users.filter(user => {
        const userRole = roleMap.get(user.clerk_user_id);
        return userRole === roleFilter;
      });
    }

    // Enrich with Clerk data
    const enrichedUsers = await Promise.all(
      filteredUsers.map(async user => {
        try {
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(user.clerk_user_id);

          return {
            ...user,
            name:
              clerkUser.fullName ||
              `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
              null,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            profile_image_url: clerkUser.imageUrl || null,
            role: roleMap.get(user.clerk_user_id) || null,
          };
        } catch (clerkError) {
          // eslint-disable-next-line no-console
          console.error(
            `Error fetching Clerk user ${user.clerk_user_id}:`,
            clerkError,
          );
          return {
            ...user,
            name: null,
            email: null,
            profile_image_url: null,
            role: roleMap.get(user.clerk_user_id) || null,
          };
        }
      }),
    );

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in admin users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
