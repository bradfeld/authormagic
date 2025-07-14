-- Migration: Enhanced Author Profiles
-- Adds first_name, last_name, and social media connection fields
-- Maintains backward compatibility with existing name field

-- Add new profile fields
ALTER TABLE authors 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN twitter_username TEXT,
ADD COLUMN linkedin_url TEXT,
ADD COLUMN facebook_url TEXT,
ADD COLUMN github_username TEXT,
ADD COLUMN goodreads_url TEXT;

-- Migrate existing name data
-- Split existing name into first and last names (simple split on last space)
UPDATE authors 
SET 
  first_name = CASE 
    WHEN position(' ' in name) > 0 THEN 
      trim(substring(name from 1 for position(' ' in reverse(name)) - 1))
    ELSE name
  END,
  last_name = CASE 
    WHEN position(' ' in name) > 0 THEN 
      trim(substring(name from length(name) - position(' ' in reverse(name)) + 2))
    ELSE ''
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Create function to automatically update name field when first_name or last_name changes
CREATE OR REPLACE FUNCTION update_author_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name = trim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep name field in sync
CREATE TRIGGER update_author_name_trigger 
  BEFORE INSERT OR UPDATE OF first_name, last_name ON authors
  FOR EACH ROW EXECUTE FUNCTION update_author_name();

-- Add constraints for social media fields
ALTER TABLE authors 
ADD CONSTRAINT twitter_username_format CHECK (
  twitter_username IS NULL OR 
  (twitter_username ~ '^[A-Za-z0-9_]{1,15}$')
);

ALTER TABLE authors 
ADD CONSTRAINT github_username_format CHECK (
  github_username IS NULL OR 
  (github_username ~ '^[A-Za-z0-9]([A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$')
);

-- Add indexes for performance
CREATE INDEX idx_authors_first_name ON authors(first_name);
CREATE INDEX idx_authors_last_name ON authors(last_name);
CREATE INDEX idx_authors_twitter_username ON authors(twitter_username);
CREATE INDEX idx_authors_github_username ON authors(github_username);

-- Add comments for documentation
COMMENT ON COLUMN authors.first_name IS 'Author first name, synced from Clerk';
COMMENT ON COLUMN authors.last_name IS 'Author last name, synced from Clerk';
COMMENT ON COLUMN authors.twitter_username IS 'Twitter/X username without @ symbol';
COMMENT ON COLUMN authors.linkedin_url IS 'Full LinkedIn profile URL';
COMMENT ON COLUMN authors.facebook_url IS 'Full Facebook profile URL';
COMMENT ON COLUMN authors.github_username IS 'GitHub username';
COMMENT ON COLUMN authors.goodreads_url IS 'Full Goodreads profile URL'; 