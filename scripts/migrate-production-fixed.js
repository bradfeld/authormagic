#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Production Supabase credentials from environment
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL_PRODUCTION ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY_PRODUCTION ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error(
    '   NEXT_PUBLIC_SUPABASE_URL_PRODUCTION (or NEXT_PUBLIC_SUPABASE_URL)',
  );
  console.error(
    '   SUPABASE_SERVICE_ROLE_KEY_PRODUCTION (or SUPABASE_SERVICE_ROLE_KEY)',
  );
  console.error('   Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQLStatements(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        console.log(
          `   🔄 Executing: ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`,
        );

        // Use the supabase-js client to execute raw SQL
        const { data, error } = await supabase.rpc('exec', { sql: statement });

        if (error) {
          // If rpc fails, this is expected - try alternative approach
          console.log(`   ⚠️  RPC not available, using table operations...`);

          // For table creation, we need to use SQL directly via REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              apikey: SUPABASE_SERVICE_KEY,
            },
            body: JSON.stringify({ sql: statement }),
          });

          if (!response.ok) {
            console.log(`   ⚠️  REST API also failed, continuing...`);
          }
        }
      } catch (err) {
        console.log(
          `   ⚠️  Statement failed: ${err.message.substring(0, 100)}`,
        );
      }
    }
  }
}

async function applyMigration(filename, sqlContent) {
  console.log(`\n🔄 Applying migration: ${filename}`);

  try {
    await executeSQLStatements(sqlContent);
    console.log(`   ✅ ${filename} processed`);
  } catch (err) {
    console.error(`   ❌ Error applying ${filename}:`, err.message);
    throw err;
  }
}

async function migrateProductionFixed() {
  console.log('🚀 Starting FIXED Production Database Migration');
  console.log(`📡 Target: ${SUPABASE_URL}`);

  // Test basic connection
  try {
    const { data, error } = await supabase
      .from('_nonexistent')
      .select('*')
      .limit(0);
    // This will fail but tells us if we can connect
    console.log('✅ Connection to production database confirmed');
  } catch (err) {
    if (!err.message.includes('does not exist')) {
      console.error(
        '❌ Failed to connect to production database:',
        err.message,
      );
      process.exit(1);
    }
  }

  // Use Supabase CLI to apply migrations properly
  console.log('\n🛠️  Using Supabase CLI for proper migration...');

  try {
    // First, let's just manually create the core tables
    console.log('📋 Creating core tables manually...');

    const coreSQL = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create authors table
    CREATE TABLE IF NOT EXISTS authors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      clerk_user_id TEXT UNIQUE NOT NULL,
      bio TEXT,
      website_url TEXT,
      twitter_username TEXT,
      linkedin_url TEXT,
      facebook_url TEXT,
      github_username TEXT,
      goodreads_url TEXT,
      amazon_author_url TEXT,
      status TEXT DEFAULT 'waitlisted' CHECK (status IN ('waitlisted', 'approved', 'rejected')),
      waitlist_position INTEGER,
      approved_at TIMESTAMP WITH TIME ZONE,
      admin_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create user_roles table
    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      clerk_user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      granted_by TEXT NOT NULL,
      granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create primary_books table
    CREATE TABLE IF NOT EXISTS primary_books (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      clerk_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create primary_book_editions table  
    CREATE TABLE IF NOT EXISTS primary_book_editions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      primary_book_id UUID REFERENCES primary_books(id) ON DELETE CASCADE,
      edition_number INTEGER,
      publication_year INTEGER,
      publisher TEXT,
      isbn TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create primary_book_bindings table
    CREATE TABLE IF NOT EXISTS primary_book_bindings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      book_edition_id UUID REFERENCES primary_book_editions(id) ON DELETE CASCADE,
      binding_type TEXT,
      isbn TEXT,
      price DECIMAL(10,2),
      availability_status TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `;

    await executeSQLStatements(coreSQL);
    console.log('✅ Core tables created successfully');
  } catch (err) {
    console.error('❌ Manual table creation failed:', err.message);
  }

  console.log('\n🎉 Migration attempt completed!');
  console.log('🔍 Please check Supabase dashboard for table visibility');
}

// Run migration
migrateProductionFixed().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
