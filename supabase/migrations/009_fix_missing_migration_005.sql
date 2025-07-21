-- Migration: Fix Missing Migration 005 Application
-- Remove email column that should have been dropped in migration 005
-- This fixes the "null value in column email violates not-null constraint" error

-- STEP 1: Drop triggers and functions that depend on columns we're removing
DO $$ 
BEGIN
    -- Drop the trigger that updates name field (from migration 004, should have been removed in 005)
    DROP TRIGGER IF EXISTS update_author_name_trigger ON authors;
    RAISE NOTICE 'SUCCESS: Dropped update_author_name_trigger if it existed';
    
    -- Drop the function that updates name field (from migration 004, should have been removed in 005)  
    DROP FUNCTION IF EXISTS update_author_name();
    RAISE NOTICE 'SUCCESS: Dropped update_author_name function if it existed';
    
    -- Drop any indexes on fields we're removing (from migration 004)
    DROP INDEX IF EXISTS idx_authors_first_name;
    DROP INDEX IF EXISTS idx_authors_last_name;
    RAISE NOTICE 'SUCCESS: Dropped name-related indexes if they existed';
    
END $$;

-- STEP 2: Remove columns that should have been dropped in migration 005
DO $$ 
BEGIN
    -- Check if email column exists before trying to drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'authors' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        -- Drop the email column that should have been removed in migration 005
        ALTER TABLE authors DROP COLUMN email;
        
        -- Log the fix
        RAISE NOTICE 'SUCCESS: Dropped email column from authors table (fixing missing migration 005)';
    ELSE
        -- Column already doesn't exist
        RAISE NOTICE 'INFO: Email column already does not exist in authors table - no action needed';
    END IF;
END $$;

-- STEP 3: Remove other profile duplication columns from migration 005
DO $$ 
BEGIN
    -- Remove name column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'authors' 
        AND column_name = 'name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE authors DROP COLUMN name;
        RAISE NOTICE 'SUCCESS: Dropped name column from authors table';
    END IF;
    
    -- Remove first_name column if it exists (now safe after dropping trigger)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'authors' 
        AND column_name = 'first_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE authors DROP COLUMN first_name;
        RAISE NOTICE 'SUCCESS: Dropped first_name column from authors table';
    END IF;
    
    -- Remove last_name column if it exists (now safe after dropping trigger)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'authors' 
        AND column_name = 'last_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE authors DROP COLUMN last_name;
        RAISE NOTICE 'SUCCESS: Dropped last_name column from authors table';
    END IF;
    
    -- Remove profile_image_url column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'authors' 
        AND column_name = 'profile_image_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE authors DROP COLUMN profile_image_url;
        RAISE NOTICE 'SUCCESS: Dropped profile_image_url column from authors table';
    END IF;
END $$;

-- STEP 4: Add comment to document this fix
COMMENT ON TABLE authors IS 'Author profiles - Clerk-first approach (fixed missing migration 005 application)';

-- STEP 5: Verify the final schema matches expectations
DO $$ 
DECLARE
    col_name TEXT;
    col_count INTEGER;
BEGIN
    -- Count remaining columns (should be around 12-13)
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'authors' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'INFO: Authors table now has % columns', col_count;
    
    -- List remaining columns for verification
    RAISE NOTICE 'INFO: Remaining columns in authors table:';
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'authors' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %', col_name;
    END LOOP;
END $$; 