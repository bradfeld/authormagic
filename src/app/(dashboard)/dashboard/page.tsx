import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { BookOpen, User } from 'lucide-react'
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
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous',
      email: user.emailAddresses?.[0]?.emailAddress || '',
      first_name: user.firstName || null,
      last_name: user.lastName || null,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">AuthorMagic</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <UserButton afterSignOutUrl="/">
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="View Profile"
                    labelIcon={<User size={16} />}
                    href="/dashboard/profile"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <BookManagementDashboard authorProfile={authorProfile} />
      </main>
    </div>
  )
} 