-- Universal Schema Fix - Apply to BOTH Development and Production
-- This ensures both environments have identical, complete schemas

-- ===== Add Missing Waitlist System Columns =====
-- Add missing status tracking fields to authors table
ALTER TABLE authors 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waitlisted' 
  CHECK (status IN ('waitlisted', 'approved', 'blocked')),
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_authors_status ON authors(status);
CREATE INDEX IF NOT EXISTS idx_authors_waitlist_position ON authors(waitlist_position);

-- ===== Ensure user_roles Table Exists =====
-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for role queries
CREATE INDEX IF NOT EXISTS idx_user_roles_clerk_user_id ON user_roles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ===== Ensure Primary Books System Exists =====
-- These should exist but adding IF NOT EXISTS for safety

-- Primary books table
CREATE TABLE IF NOT EXISTS primary_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  selected_edition_id UUID, -- References primary_book_editions.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only have one primary book per title/author combination
  UNIQUE(user_id, title, author)
);

-- Primary book editions table
CREATE TABLE IF NOT EXISTS primary_book_editions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_book_id UUID NOT NULL REFERENCES primary_books(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL DEFAULT 1,
  publication_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique edition numbers per primary book
  UNIQUE(primary_book_id, edition_number)
);

-- Primary book bindings table
CREATE TABLE IF NOT EXISTS primary_book_bindings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_edition_id UUID NOT NULL REFERENCES primary_book_editions(id) ON DELETE CASCADE,
  isbn TEXT,
  binding_type TEXT NOT NULL, -- hardcover, paperback, ebook, audiobook, etc.
  price DECIMAL(10,2),
  publisher TEXT,
  cover_image_url TEXT,
  description TEXT,
  pages INTEGER,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique binding types per edition
  UNIQUE(book_edition_id, binding_type)
);

-- Add foreign key constraint for selected_edition_id (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_primary_books_selected_edition'
    ) THEN
        ALTER TABLE primary_books 
        ADD CONSTRAINT fk_primary_books_selected_edition 
        FOREIGN KEY (selected_edition_id) REFERENCES primary_book_editions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ===== Create Performance Indexes =====
CREATE INDEX IF NOT EXISTS idx_primary_books_user_id ON primary_books(user_id);
CREATE INDEX IF NOT EXISTS idx_primary_books_title_author ON primary_books(title, author);
CREATE INDEX IF NOT EXISTS idx_primary_book_editions_primary_book_id ON primary_book_editions(primary_book_id);
CREATE INDEX IF NOT EXISTS idx_primary_book_bindings_book_edition_id ON primary_book_bindings(book_edition_id);

-- ===== Verify Schema Consistency =====
-- Check that both environments have the same core tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('authors', 'primary_books', 'primary_book_editions', 'primary_book_bindings', 'user_roles')
ORDER BY table_name;

-- Verify authors table has all required columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'authors' 
AND table_schema = 'public'
ORDER BY ordinal_position; 