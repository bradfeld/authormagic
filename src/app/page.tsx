'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, TrendingUp, Users, Zap } from 'lucide-react'

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard')
    }
  }, [isLoaded, isSignedIn, router])

  // Show loading state while authentication is being checked
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render the page if user is signed in (will redirect)
  if (isSignedIn) {
    return null
  }

  return (
    <HomePage />
  )
}

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">AuthorMagic</h1>
          </div>
          <div className="flex space-x-4">
            <SignInButton>
              <Button variant="outline">Sign In</Button>
            </SignInButton>
            <SignUpButton>
              <Button>Get Started</Button>
            </SignUpButton>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          AI-Powered Book Marketing
          <span className="block text-indigo-600">Made Simple</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Empower your book&apos;s success with intelligent marketing automation, comprehensive sales analytics, 
          and AI-driven content generation. Everything you need to market your book effectively.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <SignUpButton>
            <Button size="lg" className="text-lg px-8 py-3">
              Start Free Trial
            </Button>
          </SignUpButton>
          <Button size="lg" variant="outline" className="text-lg px-8 py-3">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Market Your Book
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>Sales Analytics</CardTitle>
              <CardDescription>
                Track sales across all platforms with unified analytics and revenue attribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Multi-platform sales tracking</li>
                <li>• Revenue attribution modeling</li>
                <li>• Real-time performance metrics</li>
                <li>• Predictive analytics</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Zap className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>AI Content Generation</CardTitle>
              <CardDescription>
                Create compelling marketing content with Claude AI-powered generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Social media posts</li>
                <li>• Email campaigns</li>
                <li>• Press releases</li>
                <li>• Book descriptions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Users className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>Media Outreach</CardTitle>
              <CardDescription>
                Connect with podcasters, bloggers, and media contacts effectively
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Media contact database</li>
                <li>• Personalized pitch generation</li>
                <li>• Follow-up automation</li>
                <li>• Event management</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Book Marketing?
          </h3>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of authors who have already boosted their book sales with AuthorMagic
          </p>
          <SignUpButton>
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Get Started Free
            </Button>
          </SignUpButton>
        </div>
      </section>
    </div>
  )
}
