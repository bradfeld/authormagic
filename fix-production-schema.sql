-- Fix Production Schema - Add Missing Waitlist System Columns
-- Run this in Production Supabase SQL Editor

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

-- Verify the fix worked
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'authors' 
AND table_schema = 'public'
ORDER BY ordinal_position; 