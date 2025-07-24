# Database Fixes

This directory contains SQL scripts for database schema fixes and maintenance tasks that have been applied to the AuthorMagic database.

## Files

### Schema Fixes

- `fix-both-environments-schema.sql` - Comprehensive schema fixes for both development and production
- `fix-production-schema.sql` - Production-specific schema corrections
- `fix-missing-amazon-column.sql` - Adds missing Amazon-related database column

### Maintenance Scripts

- `cleanup-dev-manual.sql` - Manual cleanup script for development database
- `create-user-roles.sql` - User roles table creation and setup

## Usage

These files are primarily for reference and emergency database recovery. Most schema changes should be applied through Supabase migrations in the `supabase/migrations/` directory.

⚠️ **Warning**: These are manual fix scripts. Always backup your database before applying any fixes, and test in development first.

## Migration Context

These fixes were created during development phases to address:

- RLS (Row Level Security) policy issues
- Missing table columns
- User role management setup
- Production/development environment synchronization

For ongoing schema changes, use the standard Supabase migration workflow.
