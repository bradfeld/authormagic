import { NextRequest, NextResponse } from 'next/server'
import { withAuthentication, checkRateLimit } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  // Rate limiting: max 5 requests per minute per IP
  const rateLimitResult = checkRateLimit(request, 5, 60000)
  if (rateLimitResult) return rateLimitResult

  return withAuthentication(request, async (user, supabase) => {
    try {
      const body = await request.json()
      const { userData } = body

      if (!userData?.email) {
        return NextResponse.json(
          { error: 'Missing required field: userData.email' },
          { status: 400 }
        )
      }

      // SECURE: Use the authenticated user's ID from the verified session
      const now = new Date().toISOString()
      const userRecord = {
        id: crypto.randomUUID(),
        supabaseId: user.id, // ✅ SECURE: Use verified user ID from session
        email: userData.email,
        name: userData.name || null,
        username: userData.username || null,
        bio: userData.bio || null,
        newsletterOptIn: true,
        emailNotifications: true,
        profilePublic: true,
        createdAt: now,
        updatedAt: now
      }

      const { data, error } = await supabase
        .from('users')
        .insert(userRecord)
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      console.log('✅ Secure profile created for user:', user.id)
      return NextResponse.json(data)
    } catch (error) {
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function GET(request: NextRequest) {
  // Rate limiting: max 10 requests per minute per IP
  const rateLimitResult = checkRateLimit(request, 10, 60000)
  if (rateLimitResult) return rateLimitResult

  return withAuthentication(request, async (user, supabase) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', user.id) // ✅ SECURE: Only get current user's profile
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    } catch (error) {
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function PUT(request: NextRequest) {
  // Rate limiting: max 5 requests per minute per IP
  const rateLimitResult = checkRateLimit(request, 5, 60000)
  if (rateLimitResult) return rateLimitResult

  return withAuthentication(request, async (user, supabase) => {
    try {
      const body = await request.json()
      const { userData } = body

      if (!userData) {
        return NextResponse.json(
          { error: 'Missing userData' },
          { status: 400 }
        )
      }

      const updateData = {
        name: userData.name,
        username: userData.username,
        bio: userData.bio,
        newsletterOptIn: userData.newsletterOptIn,
        emailNotifications: userData.emailNotifications,
        profilePublic: userData.profilePublic,
        updatedAt: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('supabaseId', user.id) // ✅ SECURE: Only update current user's profile
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        )
      }

      console.log('✅ Profile updated securely for user:', user.id)
      return NextResponse.json(data)
    } catch (error) {
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
} 