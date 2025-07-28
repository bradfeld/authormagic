import { auth } from '@clerk/nextjs/server';
import {
  BarChart3,
  TrendingUp,
  BookOpen,
  Target,
  Eye,
  Calendar,
} from 'lucide-react';
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

export default async function AnalyticsPage() {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">
              Track your reading progress and author insights.
            </p>
          </div>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            View Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Books Read</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex items-center text-xs">
                <TrendingUp className="mr-1 h-3 w-3" />
                This month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                Reading Goals
              </CardDescription>
              <CardTitle className="text-2xl">0%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex items-center text-xs">
                <Target className="mr-1 h-3 w-3" />
                Progress
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                Profile Views
              </CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex items-center text-xs">
                <Eye className="mr-1 h-3 w-3" />
                This week
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Features */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Reading Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Reading Analytics
              </CardTitle>
              <CardDescription>
                Track your reading habits and progress over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Reading Insights Coming Soon
                </h3>
                <p className="mb-4 text-gray-600">
                  We&apos;re building powerful analytics to help you track your
                  reading journey and discover patterns in your literary
                  preferences.
                </p>
                <Button variant="outline">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Charts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Author Profile Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Profile Analytics
              </CardTitle>
              <CardDescription>
                Monitor your author profile engagement and reach.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Eye className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Profile Insights Coming Soon
                </h3>
                <p className="mb-4 text-gray-600">
                  See how readers discover and engage with your author profile
                  and book collection.
                </p>
                <Button variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Trends
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals & Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Reading Goals
            </CardTitle>
            <CardDescription>
              Set and track your reading goals and milestones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center">
              <p className="mb-4 text-gray-600">
                Reading goal tracking and progress monitoring coming soon!
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline">
                  <Target className="mr-2 h-4 w-4" />
                  Set Goals
                </Button>
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Progress
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
