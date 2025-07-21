export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      authors: {
        Row: {
          id: string;
          clerk_user_id: string;
          bio: string | null;
          website_url: string | null;
          twitter_username: string | null;
          linkedin_url: string | null;
          facebook_url: string | null;
          github_username: string | null;
          goodreads_url: string | null;
          amazon_author_url: string | null;
          created_at: string;
          updated_at: string;
          // Waitlist system fields
          status: 'waitlisted' | 'approved' | 'blocked';
          waitlist_position: number | null;
          approved_at: string | null;
          admin_notes: string | null;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          bio?: string | null;
          website_url?: string | null;
          twitter_username?: string | null;
          linkedin_url?: string | null;
          facebook_url?: string | null;
          github_username?: string | null;
          goodreads_url?: string | null;
          amazon_author_url?: string | null;
          created_at?: string;
          updated_at?: string;
          // Waitlist system fields
          status?: 'waitlisted' | 'approved' | 'blocked';
          waitlist_position?: number | null;
          approved_at?: string | null;
          admin_notes?: string | null;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          bio?: string | null;
          website_url?: string | null;
          twitter_username?: string | null;
          linkedin_url?: string | null;
          facebook_url?: string | null;
          github_username?: string | null;
          goodreads_url?: string | null;
          amazon_author_url?: string | null;
          created_at?: string;
          updated_at?: string;
          // Waitlist system fields
          status?: 'waitlisted' | 'approved' | 'blocked';
          waitlist_position?: number | null;
          approved_at?: string | null;
          admin_notes?: string | null;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          series: string | null;
          series_number: number | null;
          primary_isbn: string | null;
          publication_year: number | null;
          genre: string[] | null;
          language: string | null;
          description: string | null;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          series?: string | null;
          series_number?: number | null;
          primary_isbn?: string | null;
          publication_year?: number | null;
          genre?: string[] | null;
          language?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          series?: string | null;
          series_number?: number | null;
          primary_isbn?: string | null;
          publication_year?: number | null;
          genre?: string[] | null;
          language?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      book_authors: {
        Row: {
          id: string;
          book_id: string;
          author_id: string;
          author_role: string | null;
          author_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          author_id: string;
          author_role?: string | null;
          author_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          author_id?: string;
          author_role?: string | null;
          author_order?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_authors_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'book_authors_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'authors';
            referencedColumns: ['id'];
          },
        ];
      };
      book_editions: {
        Row: {
          id: string;
          book_id: string;
          edition_name: string | null;
          publisher: string | null;
          publication_date: string | null;
          isbn_13: string | null;
          isbn_10: string | null;
          language: string | null;
          page_count: number | null;
          dimensions: string | null;
          weight_grams: number | null;
          description: string | null;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          edition_name?: string | null;
          publisher?: string | null;
          publication_date?: string | null;
          isbn_13?: string | null;
          isbn_10?: string | null;
          language?: string | null;
          page_count?: number | null;
          dimensions?: string | null;
          weight_grams?: number | null;
          description?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          edition_name?: string | null;
          publisher?: string | null;
          publication_date?: string | null;
          isbn_13?: string | null;
          isbn_10?: string | null;
          language?: string | null;
          page_count?: number | null;
          dimensions?: string | null;
          weight_grams?: number | null;
          description?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_editions_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
        ];
      };
      book_bindings: {
        Row: {
          id: string;
          edition_id: string;
          binding_type: string;
          isbn_13: string | null;
          isbn_10: string | null;
          price_usd: number | null;
          availability: string | null;
          format_specific_data: Json | null;
          retailer_urls: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          binding_type: string;
          isbn_13?: string | null;
          isbn_10?: string | null;
          price_usd?: number | null;
          availability?: string | null;
          format_specific_data?: Json | null;
          retailer_urls?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          edition_id?: string;
          binding_type?: string;
          isbn_13?: string | null;
          isbn_10?: string | null;
          price_usd?: number | null;
          availability?: string | null;
          format_specific_data?: Json | null;
          retailer_urls?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_bindings_edition_id_fkey';
            columns: ['edition_id'];
            isOneToOne: false;
            referencedRelation: 'book_editions';
            referencedColumns: ['id'];
          },
        ];
      };
      external_book_data: {
        Row: {
          id: string;
          book_id: string;
          source: string;
          external_id: string;
          data: Json;
          last_synced: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          source: string;
          external_id: string;
          data: Json;
          last_synced?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          source?: string;
          external_id?: string;
          data?: Json;
          last_synced?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'external_book_data_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
        ];
      };
      sales_data: {
        Row: {
          id: string;
          book_id: string;
          platform: string;
          sales_count: number | null;
          revenue: number | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          platform: string;
          sales_count?: number | null;
          revenue?: number | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          platform?: string;
          sales_count?: number | null;
          revenue?: number | null;
          date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sales_data_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
        ];
      };
      marketing_campaigns: {
        Row: {
          id: string;
          book_id: string;
          name: string;
          type: string;
          status: string | null;
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          name: string;
          type: string;
          status?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          budget?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          name?: string;
          type?: string;
          status?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          budget?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'marketing_campaigns_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
        ];
      };
      media_contacts: {
        Row: {
          id: string;
          author_id: string;
          name: string;
          email: string | null;
          organization: string | null;
          type: string | null;
          notes: string | null;
          contacted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          name: string;
          email?: string | null;
          organization?: string | null;
          type?: string | null;
          notes?: string | null;
          contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          name?: string;
          email?: string | null;
          organization?: string | null;
          type?: string | null;
          notes?: string | null;
          contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'media_contacts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'authors';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          book_id: string;
          title: string;
          description: string | null;
          event_type: string | null;
          date: string | null;
          time: string | null;
          location: string | null;
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          title: string;
          description?: string | null;
          event_type?: string | null;
          date?: string | null;
          time?: string | null;
          location?: string | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          title?: string;
          description?: string | null;
          event_type?: string | null;
          date?: string | null;
          time?: string | null;
          location?: string | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
        ];
      };
      website_analytics: {
        Row: {
          id: string;
          author_id: string;
          page_views: number | null;
          unique_visitors: number | null;
          bounce_rate: number | null;
          conversion_rate: number | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          page_views?: number | null;
          unique_visitors?: number | null;
          bounce_rate?: number | null;
          conversion_rate?: number | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          page_views?: number | null;
          unique_visitors?: number | null;
          bounce_rate?: number | null;
          conversion_rate?: number | null;
          date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'website_analytics_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'authors';
            referencedColumns: ['id'];
          },
        ];
      };
      content_generated: {
        Row: {
          id: string;
          book_id: string;
          content_type: string;
          content: string;
          platform: string | null;
          used: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          content_type: string;
          content: string;
          platform?: string | null;
          used?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          content_type?: string;
          content?: string;
          platform?: string | null;
          used?: boolean | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'content_generated_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
        ];
      };
      primary_books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string;
          selected_edition_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author: string;
          selected_edition_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author?: string;
          selected_edition_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_primary_books_selected_edition';
            columns: ['selected_edition_id'];
            isOneToOne: false;
            referencedRelation: 'primary_book_editions';
            referencedColumns: ['id'];
          },
        ];
      };
      primary_book_editions: {
        Row: {
          id: string;
          primary_book_id: string;
          edition_number: number;
          publication_year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          primary_book_id: string;
          edition_number: number;
          publication_year?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          primary_book_id?: string;
          edition_number?: number;
          publication_year?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'primary_book_editions_primary_book_id_fkey';
            columns: ['primary_book_id'];
            isOneToOne: false;
            referencedRelation: 'primary_books';
            referencedColumns: ['id'];
          },
        ];
      };
      primary_book_bindings: {
        Row: {
          id: string;
          book_edition_id: string;
          isbn: string | null;
          binding_type: string;
          price: number | null;
          publisher: string | null;
          cover_image_url: string | null;
          description: string | null;
          pages: number | null;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_edition_id: string;
          isbn?: string | null;
          binding_type: string;
          price?: number | null;
          publisher?: string | null;
          cover_image_url?: string | null;
          description?: string | null;
          pages?: number | null;
          language?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_edition_id?: string;
          isbn?: string | null;
          binding_type?: string;
          price?: number | null;
          publisher?: string | null;
          cover_image_url?: string | null;
          description?: string | null;
          pages?: number | null;
          language?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'primary_book_bindings_book_edition_id_fkey';
            columns: ['book_edition_id'];
            isOneToOne: false;
            referencedRelation: 'primary_book_editions';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          clerk_user_id: string;
          role: 'admin' | 'user';
          granted_by: string | null;
          granted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          role: 'admin' | 'user';
          granted_by?: string | null;
          granted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          role?: 'admin' | 'user';
          granted_by?: string | null;
          granted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      setup_initial_admin: {
        Args: {
          brad_clerk_user_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Type helpers
export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never;

// Convenient type aliases
export type AuthorRow = Tables<'authors'>;
// Author types (still used)
export type AuthorInsert = TablesInsert<'authors'>;
export type AuthorUpdate = TablesUpdate<'authors'>;

// Primary Books system types (actively used)
export type PrimaryBookRow = Tables<'primary_books'>;
export type PrimaryBookInsert = TablesInsert<'primary_books'>;
export type PrimaryBookUpdate = TablesUpdate<'primary_books'>;

export type PrimaryBookEditionRow = Tables<'primary_book_editions'>;
export type PrimaryBookEditionInsert = TablesInsert<'primary_book_editions'>;
export type PrimaryBookEditionUpdate = TablesUpdate<'primary_book_editions'>;

export type PrimaryBookBindingRow = Tables<'primary_book_bindings'>;
export type PrimaryBookBindingInsert = TablesInsert<'primary_book_bindings'>;
export type PrimaryBookBindingUpdate = TablesUpdate<'primary_book_bindings'>;

// Legacy exports removed: BookRow, BookInsert, BookUpdate (old books table)
