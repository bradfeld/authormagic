import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { WaitlistManagement } from '@/components/admin/WaitlistManagement';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WaitlistService } from '@/lib/services/waitlist.service';

// Force dynamic rendering for real-time admin data
export const dynamic = 'force-dynamic';

export default async function AdminWaitlistPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Check if user is admin (brad@feld.com)
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const userEmail = user.emailAddresses[0]?.emailAddress;
  const isAdmin = userEmail === 'brad@feld.com';

  if (!isAdmin) {
    redirect('/dashboard');
  }

  // Get waitlisted users
  const waitlistService = new WaitlistService();
  const users = await waitlistService.getWaitlistedUsers();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Waitlist Management
          </h1>
          <p className="text-gray-600">
            Manage user approvals and waitlist queue
          </p>
        </div>

        {/* Waitlist Management Component */}
        <WaitlistManagement initialUsers={users} />
      </div>
    </DashboardLayout>
  );
}
