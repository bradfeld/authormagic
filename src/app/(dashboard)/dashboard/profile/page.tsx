import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { BookOpen } from 'lucide-react'
import { ProfileView } from '@/components/profile/ProfileView'
import { authorProfileService } from '@/lib/services/author-profile.service'

export default async function ProfilePage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect('/sign-in')
  }

  // Get or create author profile
  let authorProfile = null
  if (user) {
    authorProfile = await authorProfileService.getOrCreateProfile(user.id, {
      clerk_user_id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown Author',
      email: user.emailAddresses[0]?.emailAddress || ''
    })
  }

  const firstName = user?.firstName || 'Author'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">AuthorMagic</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome back, {firstName}!</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile</h2>
          <p className="text-gray-600">Manage your author profile and social connections</p>
        </div>

        {/* Profile Content */}
        <ProfileView 
          user={user}
          authorProfile={authorProfile}
        />
      </main>
    </div>
  )
} 