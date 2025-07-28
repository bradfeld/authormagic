import { auth } from '@clerk/nextjs/server';
import { User, Bell, Shield, Palette } from 'lucide-react';
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

export default async function SettingsPage() {
  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  let userId = null;
  if (!isCI) {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      redirect('/sign-in');
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Settings Categories */}
        <div className="grid gap-6">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your profile information and account details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-6 text-center">
                <p className="mb-4 text-gray-600">
                  Account settings are managed through your profile page.
                </p>
                <Button variant="outline">Go to Profile</Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications and updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Bell className="h-6 w-6 text-gray-400" />
                </div>
                <p className="mb-4 text-gray-600">
                  Notification preferences coming soon!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Control your privacy settings and account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Shield className="h-6 w-6 text-gray-400" />
                </div>
                <p className="mb-4 text-gray-600">
                  Privacy and security settings coming soon!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Palette className="h-6 w-6 text-gray-400" />
                </div>
                <p className="mb-4 text-gray-600">
                  Theme and appearance options coming soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
