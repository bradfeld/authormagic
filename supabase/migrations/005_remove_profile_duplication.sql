-- Migration: Remove Profile Data Duplication
-- Remove fields that are now handled by Clerk's native profile system
-- Keep only author-specific fields: bio, website_url, and social media links

-- Drop the trigger that updates name field
DROP TRIGGER IF EXISTS update_author_name_trigger ON authors;

-- Drop the function that updates name field
DROP FUNCTION IF EXISTS update_author_name();

-- Drop indexes on fields we're removing
DROP INDEX IF EXISTS idx_authors_first_name;
DROP INDEX IF EXISTS idx_authors_last_name;

-- Remove duplicated profile fields (handled by Clerk)
ALTER TABLE authors 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS profile_image_url;

-- Update column comments to reflect Clerk-first approach
COMMENT ON TABLE authors IS 'Author-specific data - basic profile info handled by Clerk';
COMMENT ON COLUMN authors.clerk_user_id IS 'Link to Clerk user - source of truth for name, email, photo';
COMMENT ON COLUMN authors.bio IS 'Author-specific bio content';
COMMENT ON COLUMN authors.website_url IS 'Author personal/professional website';
COMMENT ON COLUMN authors.twitter_username IS 'Twitter/X username without @ symbol';
COMMENT ON COLUMN authors.linkedin_url IS 'Full LinkedIn profile URL';
COMMENT ON COLUMN authors.facebook_url IS 'Full Facebook profile URL';
COMMENT ON COLUMN authors.github_username IS 'GitHub username';
COMMENT ON COLUMN authors.goodreads_url IS 'Full Goodreads profile URL'; 