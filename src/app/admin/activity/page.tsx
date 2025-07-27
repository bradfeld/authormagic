import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WaitlistService } from '@/lib/services/waitlist.service';

export default async function AdminActivityPage() {
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Activity & Audit Logs
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor all administrative actions, track system events, and
            maintain compliance through comprehensive audit trails.
          </p>
        </div>

        {/* Admin Audit Log Dashboard */}
        <AdminAuditLog />
      </div>
    </DashboardLayout>
  );
}
