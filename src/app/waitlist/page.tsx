import { auth } from '@clerk/nextjs/server';
import { Clock, Users, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CustomUserButton } from '@/components/ui/custom-user-button';
import { WaitlistService } from '@/lib/services/waitlist.service';

export default async function WaitlistPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const waitlistService = new WaitlistService();

  // Get user's waitlist status
  const userStatus = await waitlistService.getUserStatus(userId);

  // If user is approved, redirect to dashboard
  if (userStatus?.status === 'approved') {
    redirect('/dashboard');
  }

  // If user is blocked, redirect to sign-in
  if (userStatus?.status === 'blocked') {
    redirect('/sign-in');
  }

  // Get waitlist statistics for context
  const stats = await waitlistService.getWaitlistStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <CustomUserButton />
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              You&apos;re on the List! 🎉
            </h1>
            <p className="text-xl text-gray-600">
              Thanks for your interest in AuthorMagic. We&apos;re building
              something special and want to ensure the best experience for
              everyone.
            </p>
          </div>

          {/* Status Card */}
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                  <Badge className="absolute -top-2 -right-2 bg-green-500">
                    Active
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-2xl">Your Position</CardTitle>
              <CardDescription>Current status in our waitlist</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Position */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    #{userStatus?.waitlist_position || '?'}
                  </div>
                  <div className="text-sm text-gray-600">Position in Queue</div>
                </div>

                {/* Status */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600 mb-2 capitalize">
                    {userStatus?.status || 'Waitlisted'}
                  </div>
                  <div className="text-sm text-gray-600">Current Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Happens Next */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                What Happens Next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold">
                    We&apos;re reviewing applications
                  </h3>
                  <p className="text-gray-600">
                    Our team is carefully reviewing each application to ensure
                    the best experience.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold">You&apos;ll get notified</h3>
                  <p className="text-gray-600">
                    When it&apos;s your turn, we&apos;ll send you an email with
                    access instructions.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold">Full access unlocked</h3>
                  <p className="text-gray-600">
                    Once approved, you&apos;ll have access to all AuthorMagic
                    features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community Stats */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Community Stats</CardTitle>
              <CardDescription>
                See how our community is growing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total_waitlisted}
                  </div>
                  <div className="text-sm text-gray-600">On Waitlist</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.total_approved}
                  </div>
                  <div className="text-sm text-gray-600">Active Authors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.recent_signups}
                  </div>
                  <div className="text-sm text-gray-600">Joined This Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.recent_approvals}
                  </div>
                  <div className="text-sm text-gray-600">Recent Approvals</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Questions?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                We&apos;re here to help! If you have any questions about your
                waitlist status or AuthorMagic in general, don&apos;t hesitate
                to reach out.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:support@authormagic.com"
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </a>
                <a
                  href="https://twitter.com/authormagic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Follow Updates
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
