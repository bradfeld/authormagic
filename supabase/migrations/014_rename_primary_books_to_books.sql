-- Migration 014: Rename primary_books system to books system
-- Removes confusing "primary_" prefix throughout database schema

-- Start transaction to ensure atomicity
BEGIN;

-- Step 1: Drop dependent constraints and policies first
-- Drop RLS policies that reference the tables
DROP POLICY IF EXISTS "Users can manage bindings of their book editions" ON primary_book_bindings;
DROP POLICY IF EXISTS "Users can manage editions of their primary books" ON primary_book_editions;
DROP POLICY IF EXISTS "Users can manage their own primary books" ON primary_books;

-- Drop foreign key constraints
ALTER TABLE primary_books DROP CONSTRAINT IF EXISTS fk_primary_books_selected_edition;
ALTER TABLE primary_book_editions DROP CONSTRAINT IF EXISTS primary_book_editions_primary_book_id_fkey;
ALTER TABLE primary_book_bindings DROP CONSTRAINT IF EXISTS primary_book_bindings_book_edition_id_fkey;

-- Step 2: Rename tables (rename deepest child first to avoid conflicts)
ALTER TABLE primary_book_bindings RENAME TO book_bindings;
ALTER TABLE primary_book_editions RENAME TO book_editions;
ALTER TABLE primary_books RENAME TO books;

-- Step 3: Rename foreign key columns
ALTER TABLE book_editions RENAME COLUMN primary_book_id TO book_id;

-- Step 4: Recreate foreign key constraints with new names
ALTER TABLE books 
ADD CONSTRAINT fk_books_selected_edition 
FOREIGN KEY (selected_edition_id) REFERENCES book_editions(id) ON DELETE SET NULL;

ALTER TABLE book_editions 
ADD CONSTRAINT book_editions_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

ALTER TABLE book_bindings 
ADD CONSTRAINT book_bindings_book_edition_id_fkey 
FOREIGN KEY (book_edition_id) REFERENCES book_editions(id) ON DELETE CASCADE;

-- Step 5: Update indexes with new names
-- Drop old indexes
DROP INDEX IF EXISTS idx_primary_books_user_id;
DROP INDEX IF EXISTS idx_primary_books_title_author;
DROP INDEX IF EXISTS idx_primary_book_editions_primary_book_id;
DROP INDEX IF EXISTS idx_primary_book_editions_publication_year;
DROP INDEX IF EXISTS idx_primary_book_bindings_book_edition_id;
DROP INDEX IF EXISTS idx_primary_book_bindings_isbn;
DROP INDEX IF EXISTS idx_primary_book_bindings_binding_type;

-- Create new indexes with updated names
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_books_title_author ON books(title, author);
CREATE INDEX idx_book_editions_book_id ON book_editions(book_id);
CREATE INDEX idx_book_editions_publication_year ON book_editions(publication_year);
CREATE INDEX idx_book_bindings_book_edition_id ON book_bindings(book_edition_id);
CREATE INDEX idx_book_bindings_isbn ON book_bindings(isbn);
CREATE INDEX idx_book_bindings_binding_type ON book_bindings(binding_type);

-- Step 6: Update triggers
DROP TRIGGER IF EXISTS update_primary_books_updated_at ON books;
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Recreate RLS policies with new table references
CREATE POLICY "Users can manage their own books" ON books
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage editions of their books" ON book_editions
  FOR ALL USING (
    book_id IN (
      SELECT id FROM books WHERE auth.uid()::text = user_id
    )
  );

CREATE POLICY "Users can manage bindings of their book editions" ON book_bindings
  FOR ALL USING (
    book_edition_id IN (
      SELECT be.id FROM book_editions be
      JOIN books b ON be.book_id = b.id
      WHERE auth.uid()::text = b.user_id
    )
  );

-- Step 8: Update table comments
COMMENT ON TABLE books IS 'User selected books - top level of 3-tier hierarchy (renamed from primary_books)';
COMMENT ON TABLE book_editions IS 'Book editions - middle tier (renamed from primary_book_editions)';
COMMENT ON TABLE book_bindings IS 'Book bindings with unique ISBNs - bottom tier (renamed from primary_book_bindings)';

-- Step 9: Update column comments for clarity
COMMENT ON COLUMN book_editions.book_id IS 'Foreign key to books table (renamed from primary_book_id)';

-- Commit the transaction
COMMIT;

-- Verify the migration by checking table existence
DO $$
BEGIN
  -- Check that new tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'books') THEN
    RAISE EXCEPTION 'Migration failed: books table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'book_editions') THEN
    RAISE EXCEPTION 'Migration failed: book_editions table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'book_bindings') THEN
    RAISE EXCEPTION 'Migration failed: book_bindings table does not exist';
  END IF;
  
  -- Check that old tables do not exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'primary_books') THEN
    RAISE EXCEPTION 'Migration failed: primary_books table still exists';
  END IF;
  
  -- Check foreign key column was renamed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'book_editions' AND column_name = 'book_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: book_id column does not exist in book_editions';
  END IF;
  
  RAISE NOTICE 'Migration 014 completed successfully: primary_books system renamed to books system';
END $$; 