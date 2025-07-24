-- Fix Missing amazon_author_url Column
-- Run this in BOTH Development and Production Supabase SQL Editors

-- Add missing amazon_author_url column to authors table
ALTER TABLE authors 
ADD COLUMN IF NOT EXISTS amazon_author_url TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'authors' 
AND table_schema = 'public'
AND column_name = 'amazon_author_url'; 