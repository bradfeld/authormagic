import { auth, clerkClient } from '@clerk/nextjs/server';
import { Users, UserPlus, Search, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function AdminUsersPage() {
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage user accounts, roles, and permissions.
            </p>
          </div>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Admin Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Shield className="h-5 w-5" />
              Admin Area
            </CardTitle>
            <CardDescription className="text-blue-700">
              You have admin access to manage users and system settings.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* User Management Features */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Active Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Users
              </CardTitle>
              <CardDescription>
                View and manage all active user accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">
                  Advanced user management coming soon!
                </p>
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Search Users
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions
              </CardTitle>
              <CardDescription>
                Manage user roles and access permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">
                  Role management system coming soon!
                </p>
                <Button variant="outline">Configure Roles</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks and shortcuts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Export Users
              </Button>
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Audit Log
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
