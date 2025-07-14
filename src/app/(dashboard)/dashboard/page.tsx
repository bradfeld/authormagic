import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { BookOpen } from 'lucide-react'
import { BookManagementDashboard } from "@/components/book-management/BookManagementDashboard"
import { authorProfileService } from '@/lib/services/author-profile.service'

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect('/sign-in')
  }

  // Ensure user has an author profile
  let authorProfile = null
  if (user) {
    authorProfile = await authorProfileService.getOrCreateProfile(user.id, {
      clerk_user_id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.emailAddresses[0]?.emailAddress || '',
      first_name: user.firstName || '',
      last_name: user.lastName || '',
    })
  }

  const firstName = user?.firstName || 'there'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">AuthorMagic</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome back, {firstName}!</span>
              <UserButton 
                afterSignOutUrl="/"
                userProfileProps={{
                  additionalOAuthScopes: {
                    twitter: ['read'],
                    linkedin: ['r_liteprofile', 'r_emailaddress'],
                    facebook: ['email', 'public_profile'],
                    github: ['user:email']
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Book Library</h2>
            <BookManagementDashboard />
          </div>
        </div>
      </main>
    </div>
  )
} 