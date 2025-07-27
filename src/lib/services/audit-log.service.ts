import { createClient } from '@/lib/supabase/server';

// Types for audit logging
export interface AuditLogEntry {
  id?: string;
  action_type: string;
  action_category: 'user_management' | 'system' | 'security' | 'configuration';
  action_description: string;
  performed_by_user_id: string;
  performed_by_email?: string;
  performed_by_name?: string;
  target_user_id?: string;
  target_email?: string;
  target_resource_type?: string;
  target_resource_id?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: 'completed' | 'failed' | 'in_progress';
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemEvent {
  id?: string;
  event_type: string;
  event_category: 'monitoring' | 'maintenance' | 'security' | 'performance';
  event_description: string;
  service_name?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  event_data?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  status?: 'completed' | 'failed' | 'in_progress';
  error_details?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface SecurityEvent {
  id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string;
  user_email?: string;
  user_ip_address?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;
  request_headers?: Record<string, unknown>;
  threat_level?: 'low' | 'medium' | 'high' | 'critical';
  blocked?: boolean;
  action_taken?: string;
  location_data?: Record<string, unknown>;
  device_fingerprint?: string;
  session_data?: Record<string, unknown>;
  resolved?: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLogQuery {
  action_category?: string;
  action_type?: string;
  performed_by_user_id?: string;
  target_user_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface RecentActivity {
  id: string;
  action_type: string;
  action_category: string;
  action_description: string;
  performed_by_user_id: string;
  performed_by_email?: string;
  performed_by_name?: string;
  target_user_id?: string;
  target_email?: string;
  status: string;
  created_at: string;
  time_ago: string;
}

export class AuditLogService {
  private async getSupabaseClient() {
    return createClient();
  }

  /**
   * Log an audit event for admin actions
   */
  async logAuditEvent(entry: AuditLogEntry): Promise<string | null> {
    try {
      const supabase = await this.getSupabaseClient();

      // Use the database function for consistent logging
      const { data, error } = await supabase.rpc('log_audit_event', {
        p_action_type: entry.action_type,
        p_action_category: entry.action_category,
        p_action_description: entry.action_description,
        p_performed_by_user_id: entry.performed_by_user_id,
        p_performed_by_email: entry.performed_by_email || null,
        p_performed_by_name: entry.performed_by_name || null,
        p_target_user_id: entry.target_user_id || null,
        p_target_email: entry.target_email || null,
        p_target_resource_type: entry.target_resource_type || null,
        p_target_resource_id: entry.target_resource_id || null,
        p_before_state: entry.before_state || null,
        p_after_state: entry.after_state || null,
        p_metadata: entry.metadata || {},
        p_status: entry.status || 'completed',
        p_error_message: entry.error_message || null,
      });

      if (error) {
        throw error;
      }

      return data as string;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to log audit event:', error);
      }

      // Fallback to direct insert if function fails
      try {
        const { data, error: insertError } = await (
          await this.getSupabaseClient()
        )
          .from('audit_logs')
          .insert([entry])
          .select('id')
          .single();

        if (insertError) throw insertError;
        return data?.id || null;
      } catch (fallbackError) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Fallback audit log insert failed:', fallbackError);
        }
        return null;
      }
    }
  }

  /**
   * Log a system event
   */
  async logSystemEvent(event: SystemEvent): Promise<string | null> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase
        .from('system_events')
        .insert([event])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data?.id || null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to log system event:', error);
      }
      return null;
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<string | null> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase
        .from('security_events')
        .insert([event])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data?.id || null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to log security event:', error);
      }
      return null;
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(query: AuditLogQuery = {}): Promise<{
    data: AuditLogEntry[];
    count: number;
  }> {
    try {
      const supabase = await this.getSupabaseClient();
      let supabaseQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (query.action_category) {
        supabaseQuery = supabaseQuery.eq(
          'action_category',
          query.action_category,
        );
      }
      if (query.action_type) {
        supabaseQuery = supabaseQuery.eq('action_type', query.action_type);
      }
      if (query.performed_by_user_id) {
        supabaseQuery = supabaseQuery.eq(
          'performed_by_user_id',
          query.performed_by_user_id,
        );
      }
      if (query.target_user_id) {
        supabaseQuery = supabaseQuery.eq(
          'target_user_id',
          query.target_user_id,
        );
      }
      if (query.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }
      if (query.start_date) {
        supabaseQuery = supabaseQuery.gte('created_at', query.start_date);
      }
      if (query.end_date) {
        supabaseQuery = supabaseQuery.lte('created_at', query.end_date);
      }

      // Apply pagination
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(
          query.offset,
          query.offset + (query.limit || 50) - 1,
        );
      } else if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }

      const { data, error, count } = await supabaseQuery;

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        count: count || 0,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to get audit logs:', error);
      }
      return { data: [], count: 0 };
    }
  }

  /**
   * Get recent admin activity using the view
   */
  async getRecentActivity(limit = 50): Promise<RecentActivity[]> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase
        .from('recent_admin_activity')
        .select('*')
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to get recent activity:', error);
      }
      return [];
    }
  }

  /**
   * Get system events with filtering
   */
  async getSystemEvents(
    category?: string,
    severity?: string,
    limit = 100,
  ): Promise<SystemEvent[]> {
    try {
      const supabase = await this.getSupabaseClient();
      let query = supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq('event_category', category);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to get system events:', error);
      }
      return [];
    }
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(
    severity?: string,
    resolved?: boolean,
    limit = 100,
  ): Promise<SecurityEvent[]> {
    try {
      const supabase = await this.getSupabaseClient();
      let query = supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (severity) {
        query = query.eq('severity', severity);
      }
      if (typeof resolved === 'boolean') {
        query = query.eq('resolved', resolved);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to get security events:', error);
      }
      return [];
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(): Promise<{
    total_events: number;
    events_last_24h: number;
    events_last_7d: number;
    events_by_category: Record<string, number>;
    top_admins: Array<{ user_id: string; email: string; count: number }>;
  }> {
    try {
      const supabase = await this.getSupabaseClient();

      // Get total counts
      const { count: totalEvents } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      const { count: events24h } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      const { count: events7d } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // Get events by category
      const { data: categoryData } = await supabase
        .from('audit_logs')
        .select('action_category')
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      const eventsByCategory: Record<string, number> = {};
      categoryData?.forEach(row => {
        eventsByCategory[row.action_category] =
          (eventsByCategory[row.action_category] || 0) + 1;
      });

      // Get top admins
      const { data: adminData } = await supabase
        .from('audit_logs')
        .select('performed_by_user_id, performed_by_email')
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      const adminCounts: Record<string, { email: string; count: number }> = {};
      adminData?.forEach(row => {
        const userId = row.performed_by_user_id;
        if (!adminCounts[userId]) {
          adminCounts[userId] = {
            email: row.performed_by_email || '',
            count: 0,
          };
        }
        adminCounts[userId].count++;
      });

      const topAdmins = Object.entries(adminCounts)
        .map(([userId, data]) => ({
          user_id: userId,
          email: data.email,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total_events: totalEvents || 0,
        events_last_24h: events24h || 0,
        events_last_7d: events7d || 0,
        events_by_category: eventsByCategory,
        top_admins: topAdmins,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to get audit statistics:', error);
      }
      return {
        total_events: 0,
        events_last_24h: 0,
        events_last_7d: 0,
        events_by_category: {},
        top_admins: [],
      };
    }
  }

  /**
   * Mark a security event as resolved
   */
  async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    resolutionNotes?: string,
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();
      const { error } = await supabase
        .from('security_events')
        .update({
          resolved: true,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', eventId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to resolve security event:', error);
      }
      return false;
    }
  }

  /**
   * Helper method to log user role changes with proper context
   */
  async logUserRoleChange(
    adminUserId: string,
    adminEmail: string,
    adminName: string,
    targetUserId: string,
    targetEmail: string,
    oldRole: string | null,
    newRole: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<string | null> {
    const action = newRole === 'admin' ? 'user_promote' : 'user_demote';
    const description = success
      ? `${newRole === 'admin' ? 'Promoted' : 'Demoted'} user ${targetEmail} ${newRole === 'admin' ? 'to admin' : 'from admin'}`
      : `Failed to ${newRole === 'admin' ? 'promote' : 'demote'} user ${targetEmail}`;

    return this.logAuditEvent({
      action_type: action,
      action_category: 'user_management',
      action_description: description,
      performed_by_user_id: adminUserId,
      performed_by_email: adminEmail,
      performed_by_name: adminName,
      target_user_id: targetUserId,
      target_email: targetEmail,
      target_resource_type: 'user',
      target_resource_id: targetUserId,
      before_state: { role: oldRole },
      after_state: { role: newRole },
      status: success ? 'completed' : 'failed',
      error_message: errorMessage,
    });
  }

  /**
   * Specialized method for logging user deletion events
   */
  async logUserDeletion(
    adminUserId: string,
    deletedUserId: string,
    deletedUserData: {
      email?: string;
      username?: string;
      wasAdmin: boolean;
    },
    cleanupResult: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    return this.logAuditEvent({
      action_type: 'user_delete',
      action_category: 'user_management',
      action_description: `Deleted user: ${deletedUserData.email || deletedUserId}`,
      performed_by_user_id: adminUserId,
      target_user_id: deletedUserId,
      before_state: {
        user_id: deletedUserId,
        email: deletedUserData.email,
        username: deletedUserData.username,
        was_admin: deletedUserData.wasAdmin,
        existed: true,
      },
      after_state: {
        deleted: true,
        deleted_at: new Date().toISOString(),
        cleanup_summary: cleanupResult,
      },
      metadata: {
        deletion_type: 'admin_initiated',
        artifacts_cleaned: cleanupResult,
        confirmation_provided: true,
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown',
      },
      status: 'completed',
    });
  }

  /**
   * Log failed user deletion attempts
   */
  async logUserDeletionFailure(
    adminUserId: string,
    targetUserId: string,
    errorMessage: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    return this.logAuditEvent({
      action_type: 'user_delete_failed',
      action_category: 'user_management',
      action_description: `Failed to delete user: ${targetUserId}`,
      performed_by_user_id: adminUserId,
      target_user_id: targetUserId,
      metadata: {
        error_message: errorMessage,
        failure_timestamp: new Date().toISOString(),
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown',
      },
      status: 'failed',
    });
  }

  /**
   * Log bulk user deletion events
   */
  async logBulkUserDeletion(
    adminUserId: string,
    deletedUserIds: string[],
    results: { successful: number; failed: number; total: number },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    return this.logAuditEvent({
      action_type: 'user_bulk_delete',
      action_category: 'user_management',
      action_description: `Bulk deleted ${results.successful}/${results.total} users`,
      performed_by_user_id: adminUserId,
      metadata: {
        total_attempted: results.total,
        successful_deletions: results.successful,
        failed_deletions: results.failed,
        deleted_user_ids: deletedUserIds,
        bulk_operation: true,
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown',
      },
      status: results.failed === 0 ? 'completed' : 'failed',
    });
  }
}
