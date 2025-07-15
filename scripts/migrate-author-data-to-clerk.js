#!/usr/bin/env node

/**
 * Migration Script: Move Author Data from Supabase to Clerk Metadata
 *
 * This script migrates author-specific profile data from Supabase to Clerk metadata.
 * Fields being migrated: bio, website_url, twitter_username, linkedin_url,
 * facebook_url, github_username, goodreads_url, amazon_author_url
 *
 * Run with: node scripts/migrate-author-data-to-clerk.js
 */

const { createClient } = require('@supabase/supabase-js');
const { clerkClient } = require('@clerk/nextjs/server');
require('dotenv').config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function validateEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CLERK_SECRET_KEY',
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

async function getAuthorsToMigrate() {
  console.log('🔍 Fetching authors from Supabase...');

  const { data: authors, error } = await supabase
    .from('authors')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching authors:', error);
    throw error;
  }

  console.log(`📊 Found ${authors.length} authors to process`);
  return authors;
}

async function migrateAuthorToClerk(author) {
  const {
    clerk_user_id,
    bio,
    website_url,
    twitter_username,
    linkedin_url,
    facebook_url,
    github_username,
    goodreads_url,
    amazon_author_url,
  } = author;

  try {
    // Get current user from Clerk
    const user = await clerkClient.users.getUser(clerk_user_id);

    // Prepare metadata to migrate (only non-null values)
    const metadataToMigrate = {};

    if (bio) metadataToMigrate.bio = bio;
    if (website_url) metadataToMigrate.website_url = website_url;
    if (twitter_username) metadataToMigrate.twitter_username = twitter_username;
    if (linkedin_url) metadataToMigrate.linkedin_url = linkedin_url;
    if (facebook_url) metadataToMigrate.facebook_url = facebook_url;
    if (github_username) metadataToMigrate.github_username = github_username;
    if (goodreads_url) metadataToMigrate.goodreads_url = goodreads_url;
    if (amazon_author_url)
      metadataToMigrate.amazon_author_url = amazon_author_url;

    // Update user's public metadata
    await clerkClient.users.updateUserMetadata(clerk_user_id, {
      publicMetadata: {
        ...user.publicMetadata,
        ...metadataToMigrate,
      },
    });

    const migratedFields = Object.keys(metadataToMigrate);
    console.log(
      `  ✅ Migrated ${migratedFields.length} fields: ${migratedFields.join(', ')}`,
    );

    return { success: true, fieldsCount: migratedFields.length };
  } catch (error) {
    console.error(`  ❌ Error migrating user ${clerk_user_id}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function migrateAllAuthors() {
  console.log('🚀 Starting author data migration...\n');

  const authors = await getAuthorsToMigrate();

  if (authors.length === 0) {
    console.log('ℹ️  No authors found to migrate');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  let totalFieldsMigrated = 0;

  console.log('📋 Migration Progress:');
  console.log('─'.repeat(60));

  for (const author of authors) {
    const authorName = `${author.id} (${author.clerk_user_id})`;
    console.log(`🔄 Processing: ${authorName}`);

    const result = await migrateAuthorToClerk(author);

    if (result.success) {
      successCount++;
      totalFieldsMigrated += result.fieldsCount;
    } else {
      errorCount++;
    }

    console.log(''); // Empty line for readability
  }

  console.log('─'.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`✅ Successfully migrated: ${successCount} authors`);
  console.log(`❌ Failed migrations: ${errorCount} authors`);
  console.log(`📈 Total fields migrated: ${totalFieldsMigrated}`);
  console.log('');

  if (errorCount > 0) {
    console.log('⚠️  Some migrations failed. Please review the errors above.');
  } else {
    console.log('🎉 All author data successfully migrated to Clerk metadata!');
  }
}

async function confirmMigration() {
  if (process.argv.includes('--confirm')) {
    return true;
  }

  console.log('⚠️  MIGRATION CONFIRMATION REQUIRED');
  console.log('');
  console.log('This script will:');
  console.log('1. Read all author data from Supabase');
  console.log('2. Migrate author-specific fields to Clerk metadata');
  console.log("3. Update each user's publicMetadata in Clerk");
  console.log('');
  console.log('Fields to migrate:');
  console.log('- bio');
  console.log('- website_url');
  console.log('- twitter_username');
  console.log('- linkedin_url');
  console.log('- facebook_url');
  console.log('- github_username');
  console.log('- goodreads_url');
  console.log('- amazon_author_url');
  console.log('');
  console.log(
    'To proceed, run: node scripts/migrate-author-data-to-clerk.js --confirm',
  );
  console.log('');

  return false;
}

async function main() {
  try {
    console.log('🔄 Author Data Migration Script');
    console.log('═'.repeat(60));

    await validateEnvironment();

    const confirmed = await confirmMigration();
    if (!confirmed) {
      process.exit(0);
    }

    await migrateAllAuthors();

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();
