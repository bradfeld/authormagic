import { auth } from '@clerk/nextjs/server';
import { Users, UserCheck, UserX, TrendingUp, Settings } from 'lucide-react';
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

  // Get waitlist statistics
  const stats = await waitlistService.getWaitlistStats();

  // Get recent waitlisted users (top 10)
  const recentUsers = await waitlistService.getWaitlistedUsers();
  const topWaitlistUsers = recentUsers.slice(0, 10);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage waitlist and user approvals</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Waitlisted */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Waitlisted
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_waitlisted}
              </div>
              <p className="text-xs text-muted-foreground">
                Users waiting for approval
              </p>
            </CardContent>
          </Card>

          {/* Total Approved */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Approved
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.total_approved}
              </div>
              <p className="text-xs text-muted-foreground">Active users</p>
            </CardContent>
          </Card>

          {/* Recent Signups */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Signups
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.recent_signups}
              </div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          {/* Active Admins */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Admins
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.total_admins}
              </div>
              <p className="text-xs text-muted-foreground">
                System administrators
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/admin/waitlist">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Waitlist ({stats.total_waitlisted} users)
                </Button>
              </Link>

              <Button
                className="w-full justify-start"
                variant="outline"
                disabled
              >
                <Settings className="w-4 h-4 mr-2" />
                System Settings (Coming Soon)
              </Button>

              <Button
                className="w-full justify-start"
                variant="outline"
                disabled
              >
                <UserX className="w-4 h-4 mr-2" />
                Blocked Users ({stats.total_blocked || 0})
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current platform health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Waitlist System</span>
                <Badge variant="default" className="bg-green-500">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Registration</span>
                <Badge variant="default" className="bg-green-500">
                  Open
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto-approvals</span>
                <Badge variant="secondary">Disabled</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email Notifications</span>
                <Badge variant="secondary">Pending Setup</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Waitlist Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Waitlist Users</CardTitle>
                <CardDescription>
                  Latest users waiting for approval
                </CardDescription>
              </div>
              <Link href="/admin/waitlist">
                <Button>View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topWaitlistUsers.length > 0 ? (
              <div className="space-y-4">
                {topWaitlistUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          #{user.waitlist_position}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {user.email || 'No email'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Position #{user.waitlist_position}
                      </Badge>
                      <div className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No users on waitlist
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
