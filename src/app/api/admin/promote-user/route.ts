import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { WaitlistService } from '@/lib/services/waitlist.service';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetUserId, action } = body;

    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: targetUserId, action' },
        { status: 400 },
      );
    }

    if (!['promote', 'demote'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "promote" or "demote"' },
        { status: 400 },
      );
    }

    // Prevent self-demotion
    if (action === 'demote' && targetUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 400 },
      );
    }

    // Execute the role change
    if (action === 'promote') {
      await waitlistService.promoteToAdmin(targetUserId, userId);
    } else {
      await waitlistService.demoteFromAdmin(targetUserId, userId);
    }

    return NextResponse.json({
      success: true,
      message: `User ${action === 'promote' ? 'promoted to admin' : 'demoted to user'} successfully`,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in promote-user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
