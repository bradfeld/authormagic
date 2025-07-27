import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import {
  UserManagementDashboard,
  type ClerkUserData,
} from '@/components/admin/UserManagementDashboard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WaitlistService } from '@/lib/services/waitlist.service';

export default async function AdminUsersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const waitlistService = new WaitlistService();

  // Check if user is admin
  const isAdmin = await waitlistService.isUserAdmin(userId);

  if (!isAdmin) {
    redirect('/dashboard');
  }

  // Initial data will be loaded client-side by the dashboard component
  const initialUsers: ClerkUserData[] = [];
  const initialTotalCount = 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">
            Manage user accounts, roles, and permissions across your
            application.
          </p>
        </div>

        {/* User Management Dashboard */}
        <UserManagementDashboard
          initialUsers={initialUsers}
          initialTotalCount={initialTotalCount}
        />
      </div>
    </DashboardLayout>
  );
}
