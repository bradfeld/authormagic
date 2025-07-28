-- Migration: Fix ISBN Storage Constraint
-- Problem: UNIQUE(book_edition_id, binding_type) prevents storing multiple books 
--          with same binding type but different ISBNs in the same edition
-- Solution: Remove binding type constraint, add ISBN-based uniqueness

-- Remove the problematic constraint that limits one book per binding type per edition
ALTER TABLE primary_book_bindings 
DROP CONSTRAINT IF EXISTS primary_book_bindings_book_edition_id_binding_type_key;

-- Add proper ISBN-based uniqueness constraint
-- Each ISBN should only exist once in the entire system
ALTER TABLE primary_book_bindings 
ADD CONSTRAINT unique_isbn 
UNIQUE(isbn) 
DEFERRABLE INITIALLY DEFERRED;

-- Create additional index for performance on ISBN lookups
CREATE INDEX IF NOT EXISTS idx_primary_book_bindings_isbn_not_null 
ON primary_book_bindings(isbn) 
WHERE isbn IS NOT NULL;

-- Add comment explaining the new constraint logic
COMMENT ON CONSTRAINT unique_isbn ON primary_book_bindings IS 
'Ensures each ISBN is stored only once globally. Multiple books with same binding type but different ISBNs are allowed in the same edition.'; 