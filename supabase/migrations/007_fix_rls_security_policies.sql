-- Migration: Fix RLS Security Policies
-- Addresses critical security vulnerabilities found in AUT-78 security assessment
-- Replaces overly permissive "FOR ALL" policies with specific, secure policies

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can manage their own primary books" ON primary_books;
DROP POLICY IF EXISTS "Users can manage editions of their primary books" ON primary_book_editions;
DROP POLICY IF EXISTS "Users can manage bindings of their book editions" ON primary_book_bindings;

-- ===== PRIMARY_BOOKS TABLE =====
-- Secure RLS policies with explicit WITH CHECK clauses

-- SELECT: Users can view their own books
CREATE POLICY "primary_books_select" ON primary_books
  FOR SELECT USING (auth.uid()::text = user_id);

-- INSERT: Users can insert books for themselves only
CREATE POLICY "primary_books_insert" ON primary_books
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can update their own books, but cannot change ownership
CREATE POLICY "primary_books_update" ON primary_books
  FOR UPDATE 
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- DELETE: Users can delete their own books
CREATE POLICY "primary_books_delete" ON primary_books
  FOR DELETE USING (auth.uid()::text = user_id);

-- ===== PRIMARY_BOOK_EDITIONS TABLE =====
-- Inherit access control from parent primary_books table

-- SELECT: Users can view editions of their books
CREATE POLICY "primary_book_editions_select" ON primary_book_editions
  FOR SELECT USING (
    primary_book_id IN (
      SELECT id FROM primary_books WHERE auth.uid()::text = user_id
    )
  );

-- INSERT: Users can insert editions for their books only
CREATE POLICY "primary_book_editions_insert" ON primary_book_editions
  FOR INSERT 
  WITH CHECK (
    primary_book_id IN (
      SELECT id FROM primary_books WHERE auth.uid()::text = user_id
    )
  );

-- UPDATE: Users can update editions of their books, but cannot change book ownership
CREATE POLICY "primary_book_editions_update" ON primary_book_editions
  FOR UPDATE 
  USING (
    primary_book_id IN (
      SELECT id FROM primary_books WHERE auth.uid()::text = user_id
    )
  )
  WITH CHECK (
    primary_book_id IN (
      SELECT id FROM primary_books WHERE auth.uid()::text = user_id
    )
  );

-- DELETE: Users can delete editions of their books
CREATE POLICY "primary_book_editions_delete" ON primary_book_editions
  FOR DELETE USING (
    primary_book_id IN (
      SELECT id FROM primary_books WHERE auth.uid()::text = user_id
    )
  );

-- ===== PRIMARY_BOOK_BINDINGS TABLE =====
-- Inherit access control from parent primary_book_editions table

-- SELECT: Users can view bindings of their book editions
CREATE POLICY "primary_book_bindings_select" ON primary_book_bindings
  FOR SELECT USING (
    book_edition_id IN (
      SELECT be.id FROM primary_book_editions be
      JOIN primary_books pb ON be.primary_book_id = pb.id
      WHERE auth.uid()::text = pb.user_id
    )
  );

-- INSERT: Users can insert bindings for their book editions only
CREATE POLICY "primary_book_bindings_insert" ON primary_book_bindings
  FOR INSERT 
  WITH CHECK (
    book_edition_id IN (
      SELECT be.id FROM primary_book_editions be
      JOIN primary_books pb ON be.primary_book_id = pb.id
      WHERE auth.uid()::text = pb.user_id
    )
  );

-- UPDATE: Users can update bindings of their book editions, but cannot change ownership
CREATE POLICY "primary_book_bindings_update" ON primary_book_bindings
  FOR UPDATE 
  USING (
    book_edition_id IN (
      SELECT be.id FROM primary_book_editions be
      JOIN primary_books pb ON be.primary_book_id = pb.id
      WHERE auth.uid()::text = pb.user_id
    )
  )
  WITH CHECK (
    book_edition_id IN (
      SELECT be.id FROM primary_book_editions be
      JOIN primary_books pb ON be.primary_book_id = pb.id
      WHERE auth.uid()::text = pb.user_id
    )
  );

-- DELETE: Users can delete bindings of their book editions
CREATE POLICY "primary_book_bindings_delete" ON primary_book_bindings
  FOR DELETE USING (
    book_edition_id IN (
      SELECT be.id FROM primary_book_editions be
      JOIN primary_books pb ON be.primary_book_id = pb.id
      WHERE auth.uid()::text = pb.user_id
    )
  );

-- ===== PERFORMANCE OPTIMIZATIONS =====
-- Add additional indexes for RLS policy performance

-- Optimize primary_books RLS lookups
CREATE INDEX IF NOT EXISTS idx_primary_books_rls_user_id ON primary_books(user_id) 
  WHERE user_id IS NOT NULL;

-- Optimize primary_book_editions RLS lookups  
CREATE INDEX IF NOT EXISTS idx_primary_book_editions_rls_lookup ON primary_book_editions(primary_book_id)
  WHERE primary_book_id IS NOT NULL;

-- Optimize primary_book_bindings RLS lookups
CREATE INDEX IF NOT EXISTS idx_primary_book_bindings_rls_lookup ON primary_book_bindings(book_edition_id)
  WHERE book_edition_id IS NOT NULL;

-- ===== AUTHORS TABLE SECURITY FIX =====
-- Fix the authors table RLS policy to include WITH CHECK clause

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Users can view own data" ON authors;

-- SELECT: Users can view their own author profile
CREATE POLICY "authors_select" ON authors
  FOR SELECT USING (auth.uid()::text = clerk_user_id);

-- INSERT: Users can create their own author profile only
CREATE POLICY "authors_insert" ON authors
  FOR INSERT 
  WITH CHECK (auth.uid()::text = clerk_user_id);

-- UPDATE: Users can update their own profile, but cannot change ownership
CREATE POLICY "authors_update" ON authors
  FOR UPDATE 
  USING (auth.uid()::text = clerk_user_id)
  WITH CHECK (auth.uid()::text = clerk_user_id);

-- DELETE: Users can delete their own profile
CREATE POLICY "authors_delete" ON authors
  FOR DELETE USING (auth.uid()::text = clerk_user_id);

-- ===== SECURITY DOCUMENTATION =====
-- Add table comments documenting security model

COMMENT ON POLICY "authors_select" ON authors IS 
  'Users can only view their own author profile (clerk_user_id matches auth.uid())';

COMMENT ON POLICY "authors_insert" ON authors IS 
  'Users can only create their own author profile (prevents creating profiles for other users)';

COMMENT ON POLICY "authors_update" ON authors IS 
  'Users can only update their own profile and cannot change ownership via clerk_user_id';

COMMENT ON POLICY "authors_delete" ON authors IS 
  'Users can only delete their own profile';

COMMENT ON POLICY "primary_books_select" ON primary_books IS 
  'Users can only view books they own (user_id matches auth.uid())';

COMMENT ON POLICY "primary_books_insert" ON primary_books IS 
  'Users can only insert books for themselves (prevents creating books for other users)';

COMMENT ON POLICY "primary_books_update" ON primary_books IS 
  'Users can only update their own books and cannot change ownership via user_id';

COMMENT ON POLICY "primary_books_delete" ON primary_books IS 
  'Users can only delete their own books';

-- Security notes
COMMENT ON TABLE authors IS 
  'Author profiles with comprehensive RLS policies. Each user can only access/modify their own profile. UPDATE operations include WITH CHECK clauses to prevent ownership changes.';

COMMENT ON TABLE primary_books IS 
  'User book library with comprehensive RLS policies. Each user can only access/modify their own books. UPDATE operations include WITH CHECK clauses to prevent ownership changes.';

COMMENT ON TABLE primary_book_editions IS 
  'Book editions inherit security from parent primary_books table. All operations check user ownership through primary_book_id relationship.';

COMMENT ON TABLE primary_book_bindings IS 
  'Book bindings inherit security through book_edition_id → primary_book_id → user_id chain. Comprehensive protection against cross-user access.'; 