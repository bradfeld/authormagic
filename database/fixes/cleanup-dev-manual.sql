-- Manual cleanup of legacy tables in Development Environment
-- Run these commands in Supabase SQL Editor for AuthorMagic - Dev

-- Drop the 3 legacy tables that are not used in current codebase
DROP TABLE IF EXISTS book_instances CASCADE;
DROP TABLE IF EXISTS edition_groups CASCADE; 
DROP TABLE IF EXISTS user_book_collections CASCADE;

-- Verify remaining tables (should be 5 total, matching production)
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name; 