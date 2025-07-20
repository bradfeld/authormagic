-- Migration: Cleanup Unused Tables
-- Removes legacy and unused tables to simplify the database schema
-- KEEPS: authors, primary_books, primary_book_editions, primary_book_bindings

-- Drop unused future feature tables (never implemented)
DROP TABLE IF EXISTS content_generated CASCADE;
DROP TABLE IF EXISTS website_analytics CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS media_contacts CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS sales_data CASCADE;

-- Drop legacy book system tables (replaced by primary_books system)
DROP TABLE IF EXISTS book_bindings CASCADE;
DROP TABLE IF EXISTS book_editions CASCADE;
DROP TABLE IF EXISTS book_authors CASCADE;
DROP TABLE IF EXISTS external_book_data CASCADE;
DROP TABLE IF EXISTS books CASCADE;

-- Clean up any orphaned indexes (Supabase will handle most automatically)
-- Note: Most indexes are dropped automatically with CASCADE

-- Add comments to remaining tables for clarity
COMMENT ON TABLE authors IS 'Author profiles - core user data linked to Clerk authentication';
COMMENT ON TABLE primary_books IS 'User book library - simplified book management system';
COMMENT ON TABLE primary_book_editions IS 'Book editions within user library';
COMMENT ON TABLE primary_book_bindings IS 'Individual book formats (hardcover, ebook, etc.) for each edition';

-- Verify remaining schema
-- The following tables should remain:
-- 1. authors (1 record)
-- 2. primary_books (1 record) 
-- 3. primary_book_editions (2 records)
-- 4. primary_book_bindings (10 records) 