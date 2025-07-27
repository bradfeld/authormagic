import { auth, clerkClient } from '@clerk/nextjs/server';
import { Users, TrendingUp, Shield, UserCheck } from 'lucide-react';
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

  // Get system statistics
  const client = await clerkClient();
  const totalUsersResponse = await client.users.getUserList({ limit: 1 });
  const totalUsers = totalUsersResponse.totalCount || 0;

  // Get recent users (last 5)
  const recentUsersResponse = await client.users.getUserList({
    limit: 5,
    orderBy: '-created_at',
  });
  const recentUsers = recentUsersResponse.data || [];

  // Get admin count from our role system
  const adminStats = await waitlistService.getAdminDashboardData();
  const totalAdmins = adminStats.stats.total_admins;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System administration and management</p>
        </div>

        {/* System Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">System Overview</CardTitle>
                  <CardDescription>
                    Monitor users and system activity
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/users">
                  <Button variant="outline" size="sm">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>
                <Button size="sm" asChild>
                  <a
                    href="https://dashboard.clerk.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Clerk Dashboard
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Key Metrics */}
            <div className="mb-6 flex gap-4">
              <div className="flex-1 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                <div className="text-3xl font-bold text-blue-900">
                  {totalUsers}
                </div>
                <div className="mt-1 text-sm text-blue-700">Total Users</div>
              </div>
              <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                <div className="text-3xl font-bold text-green-900">
                  {totalAdmins}
                </div>
                <div className="mt-1 text-sm text-green-700">Admins</div>
              </div>
              <div className="flex-1 rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
                <div className="text-3xl font-bold text-purple-900">
                  {recentUsers.length}
                </div>
                <div className="mt-1 text-sm text-purple-700">Recent Users</div>
              </div>
              <div className="flex-1 rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
                <div className="text-3xl font-bold text-orange-900">100%</div>
                <div className="mt-1 text-sm text-orange-700">Uptime</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <TrendingUp className="h-4 w-4" />
                Recent Users
              </h4>

              {recentUsers.length > 0 ? (
                <div className="space-y-3">
                  {recentUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                          <UserCheck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {user.fullName ||
                              `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                              'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.emailAddresses[0]?.emailAddress || 'No email'}{' '}
                            • {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {user.lastSignInAt ? 'Active' : 'New'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 py-6 text-center text-gray-500">
                  <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <div className="text-sm">No recent user activity</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks and tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" asChild className="h-auto flex-col p-4">
                <Link href="/admin/users">
                  <Users className="mb-2 h-6 w-6" />
                  <span className="font-medium">User Management</span>
                  <span className="text-xs text-gray-500">
                    Manage roles & profiles
                  </span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto flex-col p-4">
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <UserCheck className="mb-2 h-6 w-6" />
                  <span className="font-medium">Clerk Dashboard</span>
                  <span className="text-xs text-gray-500">
                    User auth & waitlist
                  </span>
                </a>
              </Button>
              <Button variant="outline" asChild className="h-auto flex-col p-4">
                <Link href="/admin/analytics">
                  <TrendingUp className="mb-2 h-6 w-6" />
                  <span className="font-medium">Analytics</span>
                  <span className="text-xs text-gray-500">Usage metrics</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
