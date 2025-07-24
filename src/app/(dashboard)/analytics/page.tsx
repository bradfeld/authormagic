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
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
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
            <Calendar className="h-4 w-4 mr-2" />
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
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
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
              <div className="flex items-center text-xs text-muted-foreground">
                <Target className="h-3 w-3 mr-1" />
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
              <div className="flex items-center text-xs text-muted-foreground">
                <Eye className="h-3 w-3 mr-1" />
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
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Reading Insights Coming Soon
                </h3>
                <p className="text-gray-600 mb-4">
                  We&apos;re building powerful analytics to help you track your
                  reading journey and discover patterns in your literary
                  preferences.
                </p>
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
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
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Eye className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Profile Insights Coming Soon
                </h3>
                <p className="text-gray-600 mb-4">
                  See how readers discover and engage with your author profile
                  and book collection.
                </p>
                <Button variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
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
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                Reading goal tracking and progress monitoring coming soon!
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  Set Goals
                </Button>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
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
