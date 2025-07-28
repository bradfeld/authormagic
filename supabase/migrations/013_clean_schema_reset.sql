-- Clean Schema Reset Migration
-- Creates exactly what the code expects based on analysis

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop any existing conflicting tables
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS book_editions CASCADE; 
DROP TABLE IF EXISTS book_bindings CASCADE;
DROP TABLE IF EXISTS book_authors CASCADE;
DROP TABLE IF EXISTS external_book_data CASCADE;

-- Ensure clean authors table with all required fields
DROP TABLE IF EXISTS authors CASCADE;
CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Waitlist system fields (required by AuthorProfileService)
  status TEXT DEFAULT 'waitlisted' CHECK (status IN ('waitlisted', 'approved', 'blocked')),
  waitlist_position INTEGER,
  approved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,

  -- Author metadata (stored in Clerk, but columns may be referenced)
  bio TEXT,
  website_url TEXT,
  twitter_username TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  github_username TEXT,
  goodreads_url TEXT,
  amazon_author_url TEXT
);

-- Ensure clean primary books system
DROP TABLE IF EXISTS primary_book_bindings CASCADE;
DROP TABLE IF EXISTS primary_book_editions CASCADE;
DROP TABLE IF EXISTS primary_books CASCADE;

-- Create primary_books table (exactly as expected by code)
CREATE TABLE primary_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  selected_edition_id UUID, -- References primary_book_editions.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, title, author)
);

-- Create primary_book_editions table
CREATE TABLE primary_book_editions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_book_id UUID NOT NULL REFERENCES primary_books(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL DEFAULT 1,
  publication_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(primary_book_id, edition_number)
);

-- Create primary_book_bindings table with CORRECT constraint
CREATE TABLE primary_book_bindings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_edition_id UUID NOT NULL REFERENCES primary_book_editions(id) ON DELETE CASCADE,
  isbn TEXT, -- Will have UNIQUE constraint to store all 20 unique ISBNs
  binding_type TEXT NOT NULL,
  price DECIMAL(10,2),
  publisher TEXT,
  cover_image_url TEXT,
  description TEXT,
  pages INTEGER,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CRITICAL: UNIQUE(isbn) allows all 20 unique ISBNs to be stored
  UNIQUE(isbn)
);

-- Add foreign key constraint for selected_edition_id
ALTER TABLE primary_books 
ADD CONSTRAINT fk_primary_books_selected_edition 
FOREIGN KEY (selected_edition_id) REFERENCES primary_book_editions(id) ON DELETE SET NULL;

-- Ensure clean user_roles table
DROP TABLE IF EXISTS user_roles CASCADE;
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  granted_by TEXT, -- clerk_user_id of admin who granted role
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(clerk_user_id, role)
);

-- Create performance indexes
CREATE INDEX idx_authors_clerk_user_id ON authors(clerk_user_id);
CREATE INDEX idx_authors_status ON authors(status);
CREATE INDEX idx_primary_books_user_id ON primary_books(user_id);
CREATE INDEX idx_primary_books_title_author ON primary_books(title, author);
CREATE INDEX idx_primary_book_editions_primary_book_id ON primary_book_editions(primary_book_id);
CREATE INDEX idx_primary_book_bindings_book_edition_id ON primary_book_bindings(book_edition_id);
CREATE INDEX idx_primary_book_bindings_isbn ON primary_book_bindings(isbn);
CREATE INDEX idx_user_roles_clerk_user_id ON user_roles(clerk_user_id);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_primary_books_updated_at BEFORE UPDATE ON primary_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for auto-setting approved_at
CREATE OR REPLACE FUNCTION set_approved_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_approved_at
  BEFORE UPDATE ON authors
  FOR EACH ROW
  EXECUTE FUNCTION set_approved_at_timestamp();

-- Enable Row Level Security
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE primary_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE primary_book_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE primary_book_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own primary books" ON primary_books
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage editions of their primary books" ON primary_book_editions
  FOR ALL USING (
    primary_book_id IN (
      SELECT id FROM primary_books WHERE auth.uid()::text = user_id
    )
  );

CREATE POLICY "Users can manage bindings of their book editions" ON primary_book_bindings
  FOR ALL USING (
    book_edition_id IN (
      SELECT be.id FROM primary_book_editions be
      JOIN primary_books pb ON be.primary_book_id = pb.id
      WHERE auth.uid()::text = pb.user_id
    )
  );

-- Comments for documentation
COMMENT ON TABLE authors IS 'Author profiles - Clerk-first approach with waitlist system';
COMMENT ON TABLE primary_books IS 'User selected books - top level of 3-tier hierarchy';  
COMMENT ON TABLE primary_book_editions IS 'Book editions - middle tier';
COMMENT ON TABLE primary_book_bindings IS 'Book bindings with unique ISBNs - bottom tier';
COMMENT ON TABLE user_roles IS 'User role management for admin functionality'; 