-- Primary Books System Migration
-- Creates a 3-level structure: primary_books → book_editions → book_bindings

-- Create primary_books table (user's selected books)
CREATE TABLE primary_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  selected_edition_id UUID, -- References book_editions.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only have one primary book per title/author combination
  UNIQUE(user_id, title, author)
);

-- Create primary_book_editions table (editions of each primary book)
CREATE TABLE primary_book_editions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_book_id UUID NOT NULL REFERENCES primary_books(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL DEFAULT 1,
  publication_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique edition numbers per primary book
  UNIQUE(primary_book_id, edition_number)
);

-- Create primary_book_bindings table (bindings for each edition)
CREATE TABLE primary_book_bindings (
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

-- Add foreign key constraint for selected_edition_id
ALTER TABLE primary_books 
ADD CONSTRAINT fk_primary_books_selected_edition 
FOREIGN KEY (selected_edition_id) REFERENCES primary_book_editions(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_primary_books_user_id ON primary_books(user_id);
CREATE INDEX idx_primary_books_title_author ON primary_books(title, author);
CREATE INDEX idx_primary_book_editions_primary_book_id ON primary_book_editions(primary_book_id);
CREATE INDEX idx_primary_book_editions_publication_year ON primary_book_editions(publication_year);
CREATE INDEX idx_primary_book_bindings_book_edition_id ON primary_book_bindings(book_edition_id);
CREATE INDEX idx_primary_book_bindings_isbn ON primary_book_bindings(isbn);
CREATE INDEX idx_primary_book_bindings_binding_type ON primary_book_bindings(binding_type);

-- Create updated_at trigger for primary_books
CREATE TRIGGER update_primary_books_updated_at BEFORE UPDATE ON primary_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE primary_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE primary_book_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE primary_book_bindings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for primary_books
CREATE POLICY "Users can manage their own primary books" ON primary_books
  FOR ALL USING (auth.uid()::text = user_id);

-- Create RLS policies for primary_book_editions
CREATE POLICY "Users can manage editions of their primary books" ON primary_book_editions
  FOR ALL USING (
    primary_book_id IN (
      SELECT id FROM primary_books WHERE auth.uid()::text = user_id
    )
  );

-- Create RLS policies for primary_book_bindings
CREATE POLICY "Users can manage bindings of their book editions" ON primary_book_bindings
  FOR ALL USING (
    book_edition_id IN (
      SELECT be.id FROM primary_book_editions be
      JOIN primary_books pb ON be.primary_book_id = pb.id
      WHERE auth.uid()::text = pb.user_id
    )
  ); 