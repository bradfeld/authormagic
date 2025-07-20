-- CRITICAL SECURITY FIX - APPLY IMMEDIATELY
-- This migration fixes the critical RLS vulnerability found in AUT-78
-- 
-- SECURITY ISSUE: Current policies allow unauthorized UPDATE operations
-- SOLUTION: Replace "FOR ALL" policies with specific policies using WITH CHECK clauses
--
-- ⚠️  MANUAL APPLICATION REQUIRED ⚠️
-- This SQL must be run manually in Supabase Dashboard > SQL Editor
-- Current Supabase client doesn't support raw SQL execution

-- ===== PRIMARY_BOOKS TABLE SECURITY FIXES =====

-- 1. Drop the insecure "FOR ALL" policy
DROP POLICY IF EXISTS "Users can manage their own primary books" ON primary_books;

-- 2. Create secure, specific policies with proper WITH CHECK clauses

-- SELECT: Users can view their own books only
CREATE POLICY "primary_books_select" ON primary_books 
  FOR SELECT USING (auth.uid()::text = user_id);

-- INSERT: Users can only create books for themselves
CREATE POLICY "primary_books_insert" ON primary_books 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can only update their own books AND cannot change ownership
CREATE POLICY "primary_books_update" ON primary_books 
  FOR UPDATE 
  USING (auth.uid()::text = user_id) 
  WITH CHECK (auth.uid()::text = user_id);

-- DELETE: Users can only delete their own books
CREATE POLICY "primary_books_delete" ON primary_books 
  FOR DELETE USING (auth.uid()::text = user_id);

-- ===== PRIMARY_BOOK_EDITIONS TABLE SECURITY FIXES =====

-- 1. Drop the insecure policy for editions
DROP POLICY IF EXISTS "Users can manage editions of their primary books" ON primary_book_editions;

-- 2. Create secure policies that check ownership through primary_books relationship

-- SELECT: Users can view editions of their own books only
CREATE POLICY "primary_book_editions_select" ON primary_book_editions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM primary_books pb 
      WHERE pb.id = primary_book_editions.primary_book_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- INSERT: Users can only create editions for their own books
CREATE POLICY "primary_book_editions_insert" ON primary_book_editions 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM primary_books pb 
      WHERE pb.id = primary_book_editions.primary_book_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- UPDATE: Users can only update editions of their own books
CREATE POLICY "primary_book_editions_update" ON primary_book_editions 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM primary_books pb 
      WHERE pb.id = primary_book_editions.primary_book_id 
      AND pb.user_id = auth.uid()::text
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM primary_books pb 
      WHERE pb.id = primary_book_editions.primary_book_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- DELETE: Users can only delete editions of their own books
CREATE POLICY "primary_book_editions_delete" ON primary_book_editions 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM primary_books pb 
      WHERE pb.id = primary_book_editions.primary_book_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- ===== PRIMARY_BOOK_BINDINGS TABLE SECURITY FIXES =====

-- 1. Drop the insecure policy for bindings (if it exists)
DROP POLICY IF EXISTS "Users can manage bindings of their book editions" ON primary_book_bindings;

-- 2. Create secure policies for bindings that check ownership through the full chain

-- SELECT: Users can view bindings of their own book editions only
CREATE POLICY "primary_book_bindings_select" ON primary_book_bindings 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM primary_book_editions pbe
      JOIN primary_books pb ON pb.id = pbe.primary_book_id
      WHERE pbe.id = primary_book_bindings.book_edition_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- INSERT: Users can only create bindings for their own book editions
CREATE POLICY "primary_book_bindings_insert" ON primary_book_bindings 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM primary_book_editions pbe
      JOIN primary_books pb ON pb.id = pbe.primary_book_id
      WHERE pbe.id = primary_book_bindings.book_edition_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- UPDATE: Users can only update bindings of their own book editions
CREATE POLICY "primary_book_bindings_update" ON primary_book_bindings 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM primary_book_editions pbe
      JOIN primary_books pb ON pb.id = pbe.primary_book_id
      WHERE pbe.id = primary_book_bindings.book_edition_id 
      AND pb.user_id = auth.uid()::text
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM primary_book_editions pbe
      JOIN primary_books pb ON pb.id = pbe.primary_book_id
      WHERE pbe.id = primary_book_bindings.book_edition_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- DELETE: Users can only delete bindings of their own book editions
CREATE POLICY "primary_book_bindings_delete" ON primary_book_bindings 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM primary_book_editions pbe
      JOIN primary_books pb ON pb.id = pbe.primary_book_id
      WHERE pbe.id = primary_book_bindings.book_edition_id 
      AND pb.user_id = auth.uid()::text
    )
  );

-- ===== SECURITY VERIFICATION =====

-- Add comments to document the security model
COMMENT ON POLICY "primary_books_update" ON primary_books IS 
  'SECURITY: Prevents ownership changes via user_id field using WITH CHECK clause';

COMMENT ON POLICY "primary_book_editions_update" ON primary_book_editions IS 
  'SECURITY: Prevents unauthorized access to other users book editions';

COMMENT ON POLICY "primary_book_bindings_update" ON primary_book_bindings IS 
  'SECURITY: Prevents unauthorized access to other users book bindings through book_edition_id ownership chain';

-- ===== COMPLETION MESSAGE =====
-- This completes the critical RLS security fixes
-- Next step: Run the security test suite to verify the fixes 