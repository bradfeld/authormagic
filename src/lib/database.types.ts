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
          user_id: string;
          name: string;
          bio: string | null;
          website: string | null;
          social_links: Json | null;
          status: string | null;
          waitlist_position: number | null;
          approved_at: string | null;
          clerk_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          bio?: string | null;
          website?: string | null;
          social_links?: Json | null;
          status?: string | null;
          waitlist_position?: number | null;
          approved_at?: string | null;
          clerk_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          bio?: string | null;
          website?: string | null;
          social_links?: Json | null;
          status?: string | null;
          waitlist_position?: number | null;
          approved_at?: string | null;
          clerk_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      books: {
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
            foreignKeyName: 'fk_books_selected_edition';
            columns: ['selected_edition_id'];
            isOneToOne: false;
            referencedRelation: 'book_editions';
            referencedColumns: ['id'];
          },
        ];
      };
      book_editions: {
        Row: {
          id: string;
          book_id: string;
          edition_number: number | null;
          publication_year: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          edition_number?: number | null;
          publication_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          edition_number?: number | null;
          publication_year?: number | null;
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
          book_edition_id: string;
          isbn: string;
          binding_type: string;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_edition_id: string;
          isbn: string;
          binding_type: string;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_edition_id?: string;
          isbn?: string;
          binding_type?: string;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_bindings_book_edition_id_fkey';
            columns: ['book_edition_id'];
            isOneToOne: false;
            referencedRelation: 'book_editions';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          clerk_user_id: string | null;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          role: string;
          clerk_user_id?: string | null;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          clerk_user_id?: string | null;
          granted_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
