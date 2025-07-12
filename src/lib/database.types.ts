export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      authors: {
        Row: {
          id: string
          clerk_user_id: string
          email: string
          name: string
          bio: string | null
          profile_image_url: string | null
          website_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id: string
          email: string
          name: string
          bio?: string | null
          profile_image_url?: string | null
          website_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_user_id?: string
          email?: string
          name?: string
          bio?: string | null
          profile_image_url?: string | null
          website_url?: string | null
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          author_id: string
          title: string
          subtitle: string | null
          description: string | null
          genre: string | null
          isbn: string | null
          publication_date: string | null
          cover_image_url: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          subtitle?: string | null
          description?: string | null
          genre?: string | null
          isbn?: string | null
          publication_date?: string | null
          cover_image_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          subtitle?: string | null
          description?: string | null
          genre?: string | null
          isbn?: string | null
          publication_date?: string | null
          cover_image_url?: string | null
          status?: string
          updated_at?: string
        }
      }
      sales_data: {
        Row: {
          id: string
          book_id: string
          platform: string
          sales_count: number | null
          revenue: number | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          platform: string
          sales_count?: number | null
          revenue?: number | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          platform?: string
          sales_count?: number | null
          revenue?: number | null
          date?: string
        }
      }
      marketing_campaigns: {
        Row: {
          id: string
          book_id: string
          name: string
          type: string
          status: string
          start_date: string | null
          end_date: string | null
          budget: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          name: string
          type: string
          status?: string
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          name?: string
          type?: string
          status?: string
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 