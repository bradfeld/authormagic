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
          name: string | null
          email: string | null
          bio: string | null
          website: string | null
          social_media: Json | null
          profile_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id: string
          name?: string | null
          email?: string | null
          bio?: string | null
          website?: string | null
          social_media?: Json | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_user_id?: string
          name?: string | null
          email?: string | null
          bio?: string | null
          website?: string | null
          social_media?: Json | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          series: string | null
          series_number: number | null
          primary_isbn: string | null
          publication_year: number | null
          genre: string[] | null
          language: string | null
          description: string | null
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          series?: string | null
          series_number?: number | null
          primary_isbn?: string | null
          publication_year?: number | null
          genre?: string[] | null
          language?: string | null
          description?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          series?: string | null
          series_number?: number | null
          primary_isbn?: string | null
          publication_year?: number | null
          genre?: string[] | null
          language?: string | null
          description?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      book_authors: {
        Row: {
          id: string
          book_id: string
          author_id: string
          author_role: string | null
          author_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          author_id: string
          author_role?: string | null
          author_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          author_id?: string
          author_role?: string | null
          author_order?: number | null
          created_at?: string
        }
      }
      book_editions: {
        Row: {
          id: string
          book_id: string
          edition_name: string | null
          publisher: string | null
          publication_date: string | null
          isbn_13: string | null
          isbn_10: string | null
          language: string | null
          page_count: number | null
          dimensions: string | null
          weight_grams: number | null
          description: string | null
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          edition_name?: string | null
          publisher?: string | null
          publication_date?: string | null
          isbn_13?: string | null
          isbn_10?: string | null
          language?: string | null
          page_count?: number | null
          dimensions?: string | null
          weight_grams?: number | null
          description?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          edition_name?: string | null
          publisher?: string | null
          publication_date?: string | null
          isbn_13?: string | null
          isbn_10?: string | null
          language?: string | null
          page_count?: number | null
          dimensions?: string | null
          weight_grams?: number | null
          description?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      book_bindings: {
        Row: {
          id: string
          edition_id: string
          binding_type: string
          isbn_13: string | null
          isbn_10: string | null
          price_usd: number | null
          availability: string | null
          format_specific_data: Json | null
          retailer_urls: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          edition_id: string
          binding_type: string
          isbn_13?: string | null
          isbn_10?: string | null
          price_usd?: number | null
          availability?: string | null
          format_specific_data?: Json | null
          retailer_urls?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          edition_id?: string
          binding_type?: string
          isbn_13?: string | null
          isbn_10?: string | null
          price_usd?: number | null
          availability?: string | null
          format_specific_data?: Json | null
          retailer_urls?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      external_book_data: {
        Row: {
          id: string
          book_id: string
          source: string
          external_id: string
          data: Json
          last_synced: string
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          source: string
          external_id: string
          data: Json
          last_synced?: string
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          source?: string
          external_id?: string
          data?: Json
          last_synced?: string
          created_at?: string
        }
      }
      sales_data: {
        Row: {
          id: string
          author_id: string
          book_id: string | null
          platform: string
          sales_date: string
          units_sold: number | null
          revenue: number | null
          royalty_rate: number | null
          currency: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          book_id?: string | null
          platform: string
          sales_date: string
          units_sold?: number | null
          revenue?: number | null
          royalty_rate?: number | null
          currency?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          book_id?: string | null
          platform?: string
          sales_date?: string
          units_sold?: number | null
          revenue?: number | null
          royalty_rate?: number | null
          currency?: string | null
          created_at?: string
        }
      }
      marketing_campaigns: {
        Row: {
          id: string
          author_id: string
          campaign_name: string
          campaign_type: string
          platform: string
          start_date: string
          end_date: string | null
          budget: number | null
          spent: number | null
          impressions: number | null
          clicks: number | null
          conversions: number | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          campaign_name: string
          campaign_type: string
          platform: string
          start_date: string
          end_date?: string | null
          budget?: number | null
          spent?: number | null
          impressions?: number | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          campaign_name?: string
          campaign_type?: string
          platform?: string
          start_date?: string
          end_date?: string | null
          budget?: number | null
          spent?: number | null
          impressions?: number | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
        }
      }
      media_contacts: {
        Row: {
          id: string
          author_id: string
          contact_name: string
          organization: string | null
          email: string | null
          phone: string | null
          contact_type: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          contact_name: string
          organization?: string | null
          email?: string | null
          phone?: string | null
          contact_type: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          contact_name?: string
          organization?: string | null
          email?: string | null
          phone?: string | null
          contact_type?: string
          notes?: string | null
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          author_id: string
          event_name: string
          event_type: string
          event_date: string
          location: string | null
          description: string | null
          attendees: number | null
          books_sold: number | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          event_name: string
          event_type: string
          event_date: string
          location?: string | null
          description?: string | null
          attendees?: number | null
          books_sold?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          event_name?: string
          event_type?: string
          event_date?: string
          location?: string | null
          description?: string | null
          attendees?: number | null
          books_sold?: number | null
          created_at?: string
        }
      }
      website_analytics: {
        Row: {
          id: string
          author_id: string
          date: string
          page_views: number | null
          unique_visitors: number | null
          bounce_rate: number | null
          conversion_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          date: string
          page_views?: number | null
          unique_visitors?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          date?: string
          page_views?: number | null
          unique_visitors?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          created_at?: string
        }
      }
      content_generated: {
        Row: {
          id: string
          author_id: string
          content_type: string
          prompt: string | null
          generated_content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content_type: string
          prompt?: string | null
          generated_content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          content_type?: string
          prompt?: string | null
          generated_content?: string | null
          created_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 