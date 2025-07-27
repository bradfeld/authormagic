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
    const period = searchParams.get('period') || '30'; // days
    const compare = searchParams.get('compare') === 'true';

    // Calculate date ranges
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(period));
    const prevEndDate = new Date(startDate);

    // Get user data from Clerk
    const clerk = await clerkClient();

    // Get all users (paginated)
    let allUsers: Array<{
      id: string;
      createdAt: number;
      lastSignInAt: number | null;
      emailVerified: boolean;
    }> = [];
    let offset = 0;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      const usersResponse = await clerk.users.getUserList({
        limit,
        offset,
        orderBy: '-created_at',
      });

      allUsers = [
        ...allUsers,
        ...usersResponse.data.map(user => ({
          id: user.id,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
          emailVerified:
            user.emailAddresses?.[0]?.verification?.status === 'verified',
        })),
      ];

      if (usersResponse.data.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    // Get role data from Supabase
    const userIds = allUsers.map(user => user.id);
    const userRoles = await waitlistService.getUserRoles(userIds);
    const roleMap = new Map(userRoles.map(r => [r.clerk_user_id, r.role]));

    // Enhance users with role data
    const enhancedUsers = allUsers.map(user => ({
      ...user,
      role: roleMap.get(user.id) || null,
    }));

    // Filter users by date range
    const periodUsers = enhancedUsers.filter(user => {
      const createdAt = new Date(user.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const prevPeriodUsers = compare
      ? enhancedUsers.filter(user => {
          const createdAt = new Date(user.createdAt);
          return createdAt >= prevStartDate && createdAt < prevEndDate;
        })
      : [];

    // Calculate metrics
    const totalUsers = enhancedUsers.length;
    const newUsers = periodUsers.length;
    const prevNewUsers = prevPeriodUsers.length;

    const verifiedUsers = enhancedUsers.filter(u => u.emailVerified).length;
    const adminUsers = enhancedUsers.filter(
      u => roleMap.get(u.id) === 'admin',
    ).length;

    const periodVerified = periodUsers.filter(u => u.emailVerified).length;
    const prevPeriodVerified = prevPeriodUsers.filter(
      u => u.emailVerified,
    ).length;

    // Calculate growth rates
    const userGrowthRate =
      prevNewUsers > 0
        ? ((newUsers - prevNewUsers) / prevNewUsers) * 100
        : newUsers > 0
          ? 100
          : 0;

    const verificationRate =
      periodUsers.length > 0 ? (periodVerified / periodUsers.length) * 100 : 0;

    const prevVerificationRate =
      prevPeriodUsers.length > 0
        ? (prevPeriodVerified / prevPeriodUsers.length) * 100
        : 0;

    // Daily breakdown for charts
    const dailyStats = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayUsers = enhancedUsers.filter(user => {
        const createdAt = new Date(user.createdAt);
        return createdAt >= dayStart && createdAt <= dayEnd;
      });

      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        users: dayUsers.length,
        verified: dayUsers.filter(u => u.emailVerified).length,
        admins: dayUsers.filter(u => roleMap.get(u.id) === 'admin').length,
      });
    }

    // User activity patterns (based on last sign in)
    const activityPatterns = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      inactive: 0,
    };

    const now = new Date();
    enhancedUsers.forEach(user => {
      if (!user.lastSignInAt) {
        activityPatterns.inactive++;
        return;
      }

      const lastSignIn = new Date(user.lastSignInAt);
      const daysSinceLastSignIn = Math.floor(
        (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastSignIn <= 1) {
        activityPatterns.daily++;
      } else if (daysSinceLastSignIn <= 7) {
        activityPatterns.weekly++;
      } else if (daysSinceLastSignIn <= 30) {
        activityPatterns.monthly++;
      } else {
        activityPatterns.inactive++;
      }
    });

    // Response data
    const analyticsData = {
      summary: {
        totalUsers,
        newUsers,
        userGrowthRate: Math.round(userGrowthRate * 100) / 100,
        verifiedUsers,
        verificationRate: Math.round(verificationRate * 100) / 100,
        adminUsers,
        activeUsers: activityPatterns.daily + activityPatterns.weekly,
      },
      comparison: compare
        ? {
            prevNewUsers,
            prevVerificationRate: Math.round(prevVerificationRate * 100) / 100,
          }
        : null,
      dailyStats,
      activityPatterns,
      demographics: {
        byRole: {
          admin: adminUsers,
          user: totalUsers - adminUsers,
        },
        byVerification: {
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers,
        },
      },
      metadata: {
        period: parseInt(period),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in analytics users API:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
