import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { ProfileView } from '@/components/profile/ProfileView'
import { authorProfileService } from '@/lib/services/author-profile.service'
import { CustomUserButton } from '@/components/ui/custom-user-button'

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
      first_name: user.firstName || null,
      last_name: user.lastName || null,
      email: user.emailAddresses?.[0]?.emailAddress || '',
    })
  }

  // Extract plain data for client components
  const userPlainData = user ? {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    imageUrl: user.imageUrl || '',
    email: user.emailAddresses?.[0]?.emailAddress || '',
  } : null

  // Extract plain data from author profile
  const authorPlainData = authorProfile ? {
    id: authorProfile.id,
    clerk_user_id: authorProfile.clerk_user_id,
    name: authorProfile.name,
    first_name: authorProfile.first_name,
    last_name: authorProfile.last_name,
    email: authorProfile.email,
    bio: authorProfile.bio,
    website_url: authorProfile.website_url,
    twitter_username: authorProfile.twitter_username,
    linkedin_url: authorProfile.linkedin_url,
    facebook_url: authorProfile.facebook_url,
    github_username: authorProfile.github_username,
    goodreads_url: authorProfile.goodreads_url,
    created_at: authorProfile.created_at,
    updated_at: authorProfile.updated_at,
  } : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">AuthorMagic</h1>
            </div>
            <div className="flex items-center space-x-4">
              <CustomUserButton />
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileView userPlainData={userPlainData} authorProfile={authorPlainData} />
      </div>
    </div>
  )
} 