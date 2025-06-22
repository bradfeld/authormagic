import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { supabaseId, userData } = await request.json()

    if (!supabaseId || !userData?.email) {
      return NextResponse.json(
        { error: 'Missing required fields: supabaseId and userData.email' },
        { status: 400 }
      )
    }

    // Create user profile using Supabase client with existing database schema (camelCase)
    const now = new Date().toISOString()
    const userRecord = {
      id: crypto.randomUUID(), // Manual ID generation
      supabaseId: supabaseId, // Using existing camelCase column name
      email: userData.email,
      name: userData.name || null,
      username: userData.username || null,
      bio: userData.bio || null,
      newsletterOptIn: true, // Using existing camelCase column name
      emailNotifications: true, // Using existing camelCase column name
      profilePublic: true, // Using existing camelCase column name
      createdAt: now, // Using existing camelCase column name
      updatedAt: now // Using existing camelCase column name
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

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 