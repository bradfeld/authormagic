import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

import { Database } from '@/lib/database.types';

type UserStatus = 'waitlisted' | 'approved' | 'blocked';
type UserRole = 'admin' | 'user';

interface WaitlistUser {
  id: string;
  clerk_user_id: string;
  status: UserStatus;
  waitlist_position: number | null;
  approved_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Clerk data
  name: string | null;
  email: string | null;
  profile_image_url: string | null;
  // Role data
  role: UserRole | null;
}

interface WaitlistStats {
  total_waitlisted: number;
  total_approved: number;
  total_blocked: number;
  total_admins: number;
  recent_signups: number; // Last 7 days
  recent_approvals: number; // Last 7 days
}

export class WaitlistService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    // Ensure environment variables are loaded (especially for server-side operations)
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  // ===== USER STATUS MANAGEMENT =====

  /**
   * Get user's current status and waitlist position
   */
  async getUserStatus(clerkUserId: string): Promise<{
    status: UserStatus;
    waitlist_position: number | null;
    approved_at: string | null;
  } | null> {
    const { data, error } = await this.supabase
      .from('authors')
      .select('status, waitlist_position, approved_at')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User doesn't exist yet
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Check if user is an admin
   */
  async isUserAdmin(clerkUserId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('clerk_user_id', clerkUserId)
      .eq('role', 'admin')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  /**
   * Get user's role (admin, user, or null if no role)
   */
  async getUserRole(clerkUserId: string): Promise<UserRole | null> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.role || null;
  }

  /**
   * Get roles for multiple users at once
   */
  async getUserRoles(
    clerkUserIds: string[],
  ): Promise<Array<{ clerk_user_id: string; role: UserRole }>> {
    if (clerkUserIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('user_roles')
      .select('clerk_user_id, role')
      .in('clerk_user_id', clerkUserIds);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Promote user to admin role
   */
  async promoteToAdmin(
    clerkUserId: string,
    adminClerkUserId: string,
  ): Promise<void> {
    // First, ensure user is approved
    await this.updateUserStatus(
      clerkUserId,
      'approved',
      adminClerkUserId,
      'Promoted to admin',
    );

    // Remove existing user role if it exists
    await this.supabase
      .from('user_roles')
      .delete()
      .eq('clerk_user_id', clerkUserId);

    // Add admin role
    const { error } = await this.supabase.from('user_roles').insert({
      clerk_user_id: clerkUserId,
      role: 'admin',
      granted_by: adminClerkUserId,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Demote admin to regular user
   */
  async demoteFromAdmin(
    clerkUserId: string,
    adminClerkUserId: string,
  ): Promise<void> {
    // Remove admin role
    await this.supabase
      .from('user_roles')
      .delete()
      .eq('clerk_user_id', clerkUserId)
      .eq('role', 'admin');

    // Add regular user role
    const { error } = await this.supabase.from('user_roles').insert({
      clerk_user_id: clerkUserId,
      role: 'user',
      granted_by: adminClerkUserId,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Get all admin users
   */
  async getAllAdmins(): Promise<WaitlistUser[]> {
    // Get admin user IDs
    const { data: adminRoles, error: rolesError } = await this.supabase
      .from('user_roles')
      .select('clerk_user_id')
      .eq('role', 'admin');

    if (rolesError) {
      throw rolesError;
    }

    if (!adminRoles.length) {
      return [];
    }

    const adminUserIds = adminRoles.map(role => role.clerk_user_id);

    // Get admin user details
    const { data: adminUsers, error: usersError } = await this.supabase
      .from('authors')
      .select('*')
      .in('clerk_user_id', adminUserIds);

    if (usersError) {
      throw usersError;
    }

    // Enrich with Clerk data
    const enrichedAdmins = await Promise.all(
      adminUsers.map(async user => {
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
            role: 'admin' as const,
          };
        } catch {
          return {
            ...user,
            name: null,
            email: null,
            profile_image_url: null,
            role: 'admin' as const,
          };
        }
      }),
    );

    return enrichedAdmins;
  }

  /**
   * Setup initial admin user (brad@feld.com)
   */
  async setupInitialAdmin(bradClerkUserId: string): Promise<void> {
    try {
      // Call the database function to setup initial admin
      const { error } = await this.supabase.rpc('setup_initial_admin', {
        brad_clerk_user_id: bradClerkUserId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // ===== ADMIN OPERATIONS =====

  /**
   * Get all waitlisted users with their details
   */
  async getWaitlistedUsers(): Promise<WaitlistUser[]> {
    try {
      // NEW APPROACH: Query Clerk for all users, then find who's NOT in Supabase
      // This correctly identifies waitlisted users (in Clerk but not approved to Supabase)

      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList({
        limit: 100,
      });

      // Get existing approved/blocked users from Supabase
      const { data: existingProfiles, error } = await this.supabase
        .from('authors')
        .select('clerk_user_id');

      if (error) {
        throw error;
      }

      const existingClerkIds = new Set(
        existingProfiles.map(p => p.clerk_user_id),
      );

      // Users in Clerk but NOT in Supabase are waitlisted
      const waitlistedClerkUsers = clerkUsers.data.filter(
        user => !existingClerkIds.has(user.id),
      );

      // Convert Clerk users to our WaitlistUser format
      const waitlistedUsers = waitlistedClerkUsers.map((user, index) => ({
        id: `waitlist-${user.id}`, // Temporary ID for UI
        clerk_user_id: user.id,
        bio: null,
        website_url: null,
        created_at: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : new Date().toISOString(),
        updated_at: user.updatedAt
          ? new Date(user.updatedAt).toISOString()
          : new Date().toISOString(),
        twitter_username: null,
        linkedin_url: null,
        facebook_url: null,
        github_username: null,
        goodreads_url: null,
        status: 'waitlisted' as const,
        waitlist_position: index + 1,
        approved_at: null,
        admin_notes: null,
        amazon_author_url: null,
        role: null, // Waitlisted users don't have roles yet
        // Add Clerk data directly
        name:
          user.fullName ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          null,
        email: user.emailAddresses[0]?.emailAddress || null,
        profile_image_url: user.imageUrl || null,
      }));

      return waitlistedUsers;
    } catch {
      // Fallback to empty array if Clerk fails - admin dashboard should handle gracefully
      // Note: In production, this would indicate Clerk API connectivity issues
      return [];
    }
  }

  /**
   * Approve a single user
   */
  async approveUser(
    clerkUserId: string,
    adminClerkUserId: string,
    adminNotes?: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('authors')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes || 'Approved by admin',
      })
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      throw error;
    }

    // Add user role
    await this.supabase.from('user_roles').insert({
      clerk_user_id: clerkUserId,
      role: 'user',
      granted_by: adminClerkUserId,
    });
  }

  /**
   * Approve multiple users at once
   */
  async bulkApproveUsers(
    clerkUserIds: string[],
    adminClerkUserId: string,
    adminNotes?: string,
  ): Promise<void> {
    // Update authors table
    const { error: authorsError } = await this.supabase
      .from('authors')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes || 'Bulk approved by admin',
      })
      .in('clerk_user_id', clerkUserIds);

    if (authorsError) {
      throw authorsError;
    }

    // Add user roles
    const roleInserts = clerkUserIds.map(clerkUserId => ({
      clerk_user_id: clerkUserId,
      role: 'user' as UserRole,
      granted_by: adminClerkUserId,
    }));

    const { error: rolesError } = await this.supabase
      .from('user_roles')
      .insert(roleInserts);

    if (rolesError) {
      throw rolesError;
    }
  }

  /**
   * Update user status (approve, block, or re-waitlist)
   */
  async updateUserStatus(
    clerkUserId: string,
    newStatus: UserStatus,
    adminClerkUserId: string,
    adminNotes?: string,
  ): Promise<void> {
    const updateData: {
      status: UserStatus;
      admin_notes?: string;
      approved_at?: string;
    } = {
      status: newStatus,
      admin_notes: adminNotes,
    };

    // Set approved_at timestamp for approved users
    if (newStatus === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('authors')
      .update(updateData)
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      throw error;
    }

    // Manage user role
    if (newStatus === 'approved') {
      // Add user role
      await this.supabase.from('user_roles').insert({
        clerk_user_id: clerkUserId,
        role: 'user',
        granted_by: adminClerkUserId,
      });
    } else {
      // Remove user role for blocked/waitlisted users
      await this.supabase
        .from('user_roles')
        .delete()
        .eq('clerk_user_id', clerkUserId)
        .eq('role', 'user');
    }
  }

  // ===== STATISTICS =====

  /**
   * Get waitlist statistics for admin dashboard
   */
  async getWaitlistStats(): Promise<WaitlistStats> {
    // NEW APPROACH: Get waitlisted users from Clerk, other stats from Supabase

    // Get approved/blocked counts from Supabase
    const { data: statusCounts, error: statusError } = await this.supabase
      .from('authors')
      .select('status, created_at, approved_at');

    if (statusError) {
      throw statusError;
    }

    // Get admin count
    const { data: adminRoles, error: adminError } = await this.supabase
      .from('user_roles')
      .select('clerk_user_id')
      .eq('role', 'admin');

    if (adminError) {
      throw adminError;
    }

    // NEW: Get waitlisted users from Clerk (not Supabase)
    const waitlistedUsers = await this.getWaitlistedUsers();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count approved/blocked users from Supabase
    const supabaseStats = statusCounts.reduce(
      (acc, user) => {
        // Only count approved/blocked (waitlisted is now handled separately)
        if (user.status === 'approved') acc.total_approved++;
        else if (user.status === 'blocked') acc.total_blocked++;

        // Count recent signups (last 7 days) - Supabase users only
        if (new Date(user.created_at) >= sevenDaysAgo) {
          acc.recent_signups++;
        }

        // Count recent approvals (last 7 days)
        if (user.approved_at && new Date(user.approved_at) >= sevenDaysAgo) {
          acc.recent_approvals++;
        }

        return acc;
      },
      {
        total_approved: 0,
        total_blocked: 0,
        recent_signups: 0,
        recent_approvals: 0,
      },
    );

    // Count recent waitlisted signups from Clerk
    const recentWaitlistedSignups = waitlistedUsers.filter(
      user => new Date(user.created_at) >= sevenDaysAgo,
    ).length;

    const stats: WaitlistStats = {
      total_waitlisted: waitlistedUsers.length, // NEW: Count from Clerk
      total_approved: supabaseStats.total_approved,
      total_blocked: supabaseStats.total_blocked,
      total_admins: adminRoles?.length || 0,
      recent_signups: supabaseStats.recent_signups + recentWaitlistedSignups, // Combined
      recent_approvals: supabaseStats.recent_approvals,
    };

    return stats;
  }

  /**
   * Get comprehensive admin dashboard data (stats + recent users)
   * Ensures consistency between dashboard stats and user lists
   */
  async getAdminDashboardData(): Promise<{
    stats: WaitlistStats;
    recentWaitlistedUsers: WaitlistUser[];
  }> {
    // Get stats and recent users in parallel for efficiency
    const [stats, recentUsers] = await Promise.all([
      this.getWaitlistStats(),
      this.getWaitlistedUsers(),
    ]);

    // Return top 10 most recent waitlisted users
    const recentWaitlistedUsers = recentUsers.slice(0, 10);

    return {
      stats,
      recentWaitlistedUsers,
    };
  }

  /**
   * Get current waitlist queue with positions
   */
  async getWaitlistQueue(): Promise<WaitlistUser[]> {
    return this.getWaitlistedUsers();
  }

  // ===== POSITION MANAGEMENT =====

  /**
   * Reorder waitlist positions (for drag & drop admin interface)
   */
  async reorderWaitlist(
    newOrder: { clerk_user_id: string; position: number }[],
  ): Promise<void> {
    const updates = newOrder.map(item =>
      this.supabase
        .from('authors')
        .update({ waitlist_position: item.position })
        .eq('clerk_user_id', item.clerk_user_id)
        .eq('status', 'waitlisted'),
    );

    await Promise.all(updates);
  }

  /**
   * Get user's current position in waitlist
   */
  async getUserWaitlistPosition(clerkUserId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('authors')
      .select('waitlist_position')
      .eq('clerk_user_id', clerkUserId)
      .eq('status', 'waitlisted')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.waitlist_position || null;
  }
}
