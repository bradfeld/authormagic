'use client';

import { useUser, Waitlist } from '@clerk/nextjs';
import {
  BookOpen,
  CheckCircle,
  Share2,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function WaitlistPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state for signed-in users
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Show waitlist for non-authenticated users
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-black" />
              <h1 className="text-2xl font-semibold text-black">AuthorMagic</h1>
            </div>
            <div className="text-sm text-gray-600">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                Coming Soon
              </span>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section with Waitlist */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-black mb-6 leading-tight">
            An Author-Centric Book Management System
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your book&apos;s success with intelligent marketing
            automation, comprehensive sales analytics, and AI-driven content
            generation. Join the waitlist for exclusive early access.
          </p>

          {/* Clerk Waitlist Component */}
          <div className="max-w-md mx-auto mb-8">
            <Waitlist
              appearance={{
                elements: {
                  formButtonPrimary:
                    'bg-black hover:bg-gray-800 text-white font-medium px-8 py-3 rounded-lg transition-colors',
                  formFieldInput:
                    'border border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                  card: 'shadow-none border border-gray-200 rounded-xl p-8',
                  headerTitle: 'text-2xl font-semibold text-black mb-2',
                  headerSubtitle: 'text-gray-600 mb-6',
                },
              }}
            />
          </div>

          {/* Social Sharing */}
          <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
            <span>Share with fellow authors:</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'AuthorMagic - AI-Powered Book Marketing',
                      text: 'Join the waitlist for the book marketing platform authors have been waiting for!',
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Preview */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-black mb-4">
              What You&apos;ll Get When We Launch
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The complete marketing toolkit designed specifically for authors
              who want to sell more books.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <TrendingUp className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-semibold text-black">
                  Unified Sales Analytics
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Track sales across Amazon, Barnes & Noble, and all major
                  platforms in one dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Real-time sales tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Revenue attribution modeling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Predictive sales forecasting</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <Zap className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-semibold text-black">
                  AI Content Generation
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Create compelling marketing content with Claude AI-powered
                  generation tools.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Social media campaigns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Email marketing sequences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Press release templates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-semibold text-black">
                  Media Outreach
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Connect with podcasters, bloggers, and media contacts at
                  scale.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Curated media database</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Personalized pitch generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Automated follow-up sequences</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-6 w-6 text-black" />
            <span className="text-lg font-semibold text-black">
              AuthorMagic
            </span>
          </div>
          <p className="text-sm text-gray-600">
            © 2025 AuthorMagic. The book management platform for serious
            authors.
          </p>
        </div>
      </footer>
    </div>
  );
}
