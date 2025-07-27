import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { AuditLogService } from '@/lib/services/audit-log.service';
import { WaitlistService } from '@/lib/services/waitlist.service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const waitlistService = new WaitlistService();
    const auditLogService = new AuditLogService();

    // Check if current user is admin
    const isAdmin = await waitlistService.isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const action_category = searchParams.get('category') || undefined;
    const action_type = searchParams.get('type') || undefined;
    const performed_by_user_id = searchParams.get('performer') || undefined;
    const target_user_id = searchParams.get('target') || undefined;
    const status = searchParams.get('status') || undefined;
    const start_date = searchParams.get('start_date') || undefined;
    const end_date = searchParams.get('end_date') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const include_stats = searchParams.get('include_stats') === 'true';

    // Fetch audit logs with filters
    const { data: auditLogs, count } = await auditLogService.getAuditLogs({
      action_category,
      action_type,
      performed_by_user_id,
      target_user_id,
      status,
      start_date,
      end_date,
      limit,
      offset,
    });

    let statistics = null;
    if (include_stats) {
      statistics = await auditLogService.getAuditStatistics();
    }

    // Get recent activity for quick overview
    const recentActivity = await auditLogService.getRecentActivity(10);

    return NextResponse.json({
      audit_logs: auditLogs,
      total_count: count,
      limit,
      offset,
      has_more: offset + limit < count,
      recent_activity: recentActivity,
      statistics,
      filters: {
        action_category,
        action_type,
        performed_by_user_id,
        target_user_id,
        status,
        start_date,
        end_date,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in audit logs API:', error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
