import { supabase } from './supabase'

// Authentication helper functions (client-side only)
export const auth = {
  // Sign up a new user
  signUp: async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  },

  // Sign in an existing user
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out the current user
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get the current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get the current user
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Listen for auth state changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// User profile helper functions (client-side only)
export const userProfile = {
  // Get a user profile by Supabase ID
  getBySupabaseId: async (supabaseId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('supabaseId', supabaseId)
      .single()
    
    return { data, error }
  },

  // Update a user profile
  update: async (supabaseId: string, updates: {
    name?: string
    username?: string
    bio?: string
    newsletterOptIn?: boolean
    emailNotifications?: boolean
    profilePublic?: boolean
  }) => {
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('supabaseId', supabaseId)
      .select()
      .single()
    
    return { data, error }
  },

  // Create a user profile via API route (server-side)
  create: async (supabaseId: string, userData: {
    email: string
    name?: string
    username?: string
    bio?: string
  }) => {
    // Call our API route to create user profile server-side
    const response = await fetch('/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supabaseId,
        userData
      })
    })
    
    if (!response.ok) {
      return { data: null, error: { message: 'Failed to create user profile' } }
    }
    
    const data = await response.json()
    return { data, error: null }
  }
} 