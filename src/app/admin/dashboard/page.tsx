import { auth } from '@clerk/nextjs/server';
import { Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WaitlistService } from '@/lib/services/waitlist.service';

// Force dynamic rendering for real-time admin data
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
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

  // Get unified admin dashboard data (stats + recent users)
  const { stats, recentWaitlistedUsers } =
    await waitlistService.getAdminDashboardData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System administration and management</p>
        </div>

        {/* Waitlist Management */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Waitlist Management</CardTitle>
                  <CardDescription>
                    Monitor and manage user approvals
                  </CardDescription>
                </div>
              </div>
              <Link href="/admin/waitlist">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  View Waitlist
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Key Metrics */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-3xl font-bold text-blue-900">
                  {stats.total_waitlisted}
                </div>
                <div className="text-sm text-blue-700 mt-1">Waitlisted</div>
              </div>
              <div className="flex-1 text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-3xl font-bold text-green-900">
                  {stats.total_approved}
                </div>
                <div className="text-sm text-green-700 mt-1">Approved</div>
              </div>
              <div className="flex-1 text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-3xl font-bold text-gray-900">
                  {stats.recent_signups}
                </div>
                <div className="text-sm text-gray-700 mt-1">This Week</div>
              </div>
              <div className="flex-1 text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-3xl font-bold text-orange-900">
                  {stats.total_admins}
                </div>
                <div className="text-sm text-orange-700 mt-1">Admins</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recent Activity
              </h4>

              {recentWaitlistedUsers.length > 0 ? (
                <div className="space-y-3">
                  {recentWaitlistedUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            #{user.waitlist_position}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {user.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email || 'No email'} •{' '}
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Waiting
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div className="text-sm">No users currently on waitlist</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
