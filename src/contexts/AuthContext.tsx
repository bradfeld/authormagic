'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { auth } from '@/lib/auth'

// Auth imports verified

// Local user profile functions to avoid import issues
const createUserProfile = async (supabaseId: string, userData: {
  email: string
  name?: string
  username?: string
  bio?: string
}) => {
  try {
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
      const errorData = await response.text()
      return { data: null, error: { message: `Failed to create user profile: ${errorData}` } }
    }
    
    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
  }
}

const getUserProfile = async (supabaseId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('supabaseId', supabaseId)
    .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows gracefully
  
  return { data, error }
}

// User profile type
interface UserProfile {
  id: string
  supabaseId: string
  email: string
  name: string | null
  username: string | null
  bio: string | null
  newsletterOptIn: boolean
  emailNotifications: boolean
  profilePublic: boolean
  createdAt: string
  updatedAt: string
}

// Auth response types
interface AuthResponse {
  data: unknown
  error: { message: string } | null
}

// Types for our auth context
interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<AuthResponse>
  signIn: (email: string, password: string) => Promise<AuthResponse>
  signOut: () => Promise<{ error: { message: string } | null }>
  refreshProfile: () => Promise<void>
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load initial session and user profile
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { session: initialSession } = await auth.getSession()
        setSession(initialSession)
        setUser(initialSession?.user || null)

        if (initialSession?.user) {
          await loadUserProfile(initialSession.user.id)
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user || null)

      if (session?.user) {
        // Small delay to ensure profile creation is complete
        setTimeout(() => loadUserProfile(session.user.id), 100)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load user profile from our custom users table
  const loadUserProfile = async (supabaseId: string) => {
    try {
      const { data, error } = await getUserProfile(supabaseId)
      if (error) {
        console.error('Error loading user profile:', error)
        return
      }
      if (!data) {
        return
      }
      setUserProfile(data)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // Sign up function with profile creation
  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    try {
      const { data, error } = await auth.signUp(email, password, metadata)
      
      if (data.user && !error) {
        // Create user profile record
        const profileData = {
          email,
          name: typeof metadata?.name === 'string' ? metadata.name : undefined,
          username: typeof metadata?.username === 'string' ? metadata.username : undefined,
          bio: typeof metadata?.bio === 'string' ? metadata.bio : undefined
        }
        
        const { error: profileError } = await createUserProfile(data.user.id, profileData)
        if (profileError) {
          console.error('Error creating user profile:', profileError)
          return { data, error: profileError }
        }
      }
      
      return { data, error }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    return await auth.signIn(email, password)
  }

  // Sign out function
  const signOut = async () => {
    const result = await auth.signOut()
    setUserProfile(null)
    return result
  }

  // Refresh user profile
  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 