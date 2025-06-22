import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          supabaseId: string
          name: string | null
          username: string | null
          email: string
          emailVerified: string | null
          bio: string | null
          newsletterOptIn: boolean
          emailNotifications: boolean
          profilePublic: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          supabaseId: string
          name?: string | null
          username?: string | null
          email: string
          emailVerified?: string | null
          bio?: string | null
          newsletterOptIn?: boolean
          emailNotifications?: boolean
          profilePublic?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          supabaseId?: string
          name?: string | null
          username?: string | null
          email?: string
          emailVerified?: string | null
          bio?: string | null
          newsletterOptIn?: boolean
          emailNotifications?: boolean
          profilePublic?: boolean
          createdAt?: string
          updatedAt?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          name: string
          email: string
          website: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          website?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          website?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
    }
  }
} 