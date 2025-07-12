-- Migration: Author Management System Schema
-- Creates hierarchical book structure: Books → Editions → Bindings
-- Supports multiple authors per book with roles

-- Drop existing books table to recreate with proper structure
DROP TABLE IF EXISTS books CASCADE;

-- Enhanced Books table (top level)
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  subtitle VARCHAR,
  series VARCHAR,
  series_number INTEGER,
  primary_isbn VARCHAR, -- Representative ISBN for the book
  publication_year INTEGER,
  genre VARCHAR[],
  language VARCHAR DEFAULT 'en',
  description TEXT,
  cover_image_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book Authors junction table (many-to-many)
CREATE TABLE book_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  author_id UUID REFERENCES authors(id) ON DELETE CASCADE,
  author_role VARCHAR DEFAULT 'author', -- author, co-author, editor, illustrator, etc.
  author_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, author_id) -- Prevent duplicate author assignments
);

-- Book Editions table (middle tier)
CREATE TABLE book_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  edition_name VARCHAR, -- "1st Edition", "Revised Edition", etc.
  publisher VARCHAR,
  publication_date DATE,
  isbn_13 VARCHAR UNIQUE,
  isbn_10 VARCHAR,
  language VARCHAR DEFAULT 'en',
  page_count INTEGER,
  dimensions VARCHAR, -- e.g., "8.5 x 11 inches"
  weight_grams INTEGER,
  description TEXT,
  cover_image_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book Bindings table (bottom tier)
CREATE TABLE book_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES book_editions(id) ON DELETE CASCADE,
  binding_type VARCHAR NOT NULL, -- From ISBN DB API: hardcover, paperback, ebook, audiobook, etc.
  isbn_13 VARCHAR UNIQUE,
  isbn_10 VARCHAR,
  price_usd DECIMAL(10,2),
  availability VARCHAR, -- in-stock, out-of-print, pre-order, etc.
  format_specific_data JSONB, -- audiobook duration, ebook file size, etc.
  retailer_urls JSONB, -- Amazon, B&N, etc. links
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- External Book Data table (flexible storage for API data)
CREATE TABLE external_book_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  source VARCHAR NOT NULL, -- 'isbn_db', 'google_books', 'goodreads', 'amazon'
  external_id VARCHAR NOT NULL,
  data JSONB NOT NULL, -- Flexible storage for platform-specific data
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, source) -- One record per source per book
);

-- Create indexes for performance
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_primary_isbn ON books(primary_isbn);
CREATE INDEX idx_books_publication_year ON books(publication_year);
CREATE INDEX idx_books_genre ON books USING GIN(genre);

CREATE INDEX idx_book_authors_book_id ON book_authors(book_id);
CREATE INDEX idx_book_authors_author_id ON book_authors(author_id);
CREATE INDEX idx_book_authors_order ON book_authors(author_order);

CREATE INDEX idx_book_editions_book_id ON book_editions(book_id);
CREATE INDEX idx_book_editions_isbn_13 ON book_editions(isbn_13);
CREATE INDEX idx_book_editions_isbn_10 ON book_editions(isbn_10);
CREATE INDEX idx_book_editions_publisher ON book_editions(publisher);

CREATE INDEX idx_book_bindings_edition_id ON book_bindings(edition_id);
CREATE INDEX idx_book_bindings_binding_type ON book_bindings(binding_type);
CREATE INDEX idx_book_bindings_isbn_13 ON book_bindings(isbn_13);
CREATE INDEX idx_book_bindings_isbn_10 ON book_bindings(isbn_10);

CREATE INDEX idx_external_book_data_book_id ON external_book_data(book_id);
CREATE INDEX idx_external_book_data_source ON external_book_data(source);
CREATE INDEX idx_external_book_data_synced ON external_book_data(last_synced);

-- Row Level Security (RLS) Policies
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_book_data ENABLE ROW LEVEL SECURITY;

-- Books: Users can only access books they are authors of
CREATE POLICY "Users can view books they authored" ON books FOR SELECT
USING (
  id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Users can insert books they will author" ON books FOR INSERT
WITH CHECK (true); -- Will be restricted by book_authors policy

CREATE POLICY "Users can update books they authored" ON books FOR UPDATE
USING (
  id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Users can delete books they authored" ON books FOR DELETE
USING (
  id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Book Authors: Users can only manage their own authorship
CREATE POLICY "Users can view book authors for their books" ON book_authors FOR SELECT
USING (
  book_id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Users can insert book authors for their books" ON book_authors FOR INSERT
WITH CHECK (
  author_id IN (
    SELECT id FROM authors WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Users can update book authors for their books" ON book_authors FOR UPDATE
USING (
  book_id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Users can delete book authors for their books" ON book_authors FOR DELETE
USING (
  book_id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Book Editions: Inherit access from books
CREATE POLICY "Users can access editions of their books" ON book_editions FOR ALL
USING (
  book_id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Book Bindings: Inherit access from editions
CREATE POLICY "Users can access bindings of their editions" ON book_bindings FOR ALL
USING (
  edition_id IN (
    SELECT be.id 
    FROM book_editions be
    JOIN book_authors ba ON be.book_id = ba.book_id
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- External Book Data: Inherit access from books
CREATE POLICY "Users can access external data for their books" ON external_book_data FOR ALL
USING (
  book_id IN (
    SELECT ba.book_id 
    FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.id 
    WHERE a.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_editions_updated_at BEFORE UPDATE ON book_editions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_bindings_updated_at BEFORE UPDATE ON book_bindings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 