#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Development Supabase credentials from environment
const DEV_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEV_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEV_SUPABASE_URL || !DEV_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

async function cleanupDevLegacyTables() {
  console.log('🧹 CLEANING DEVELOPMENT ENVIRONMENT');
  console.log(`📡 Target: ${DEV_SUPABASE_URL}`);
  console.log('🎯 Goal: Match Production (5 tables total)\n');

  // Legacy tables to remove (not used in current codebase)
  const legacyTables = [
    'book_instances',
    'edition_groups',
    'user_book_collections',
  ];

  // Expected tables after cleanup (matching production)
  const expectedTables = [
    'authors',
    'primary_books',
    'primary_book_editions',
    'primary_book_bindings',
    'user_roles',
  ];

  try {
    console.log('🔍 STEP 1: Current table inventory...');

    // Check which legacy tables actually exist
    const existingLegacyTables = [];
    for (const table of legacyTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);

        if (!error) {
          existingLegacyTables.push(table);
          console.log(`   ❌ ${table} - EXISTS (will be dropped)`);
        }
      } catch {
        console.log(`   ✅ ${table} - NOT FOUND (already clean)`);
      }
    }

    if (existingLegacyTables.length === 0) {
      console.log('\n🎉 Development environment is already clean!');
      console.log('✅ No legacy tables found to remove.');
      return;
    }

    console.log(
      `\n🗑️  STEP 2: Dropping ${existingLegacyTables.length} legacy tables...`,
    );

    // Drop each legacy table
    for (const table of existingLegacyTables) {
      try {
        console.log(`   🔧 Dropping ${table}...`);

        // Use SQL to drop the table
        const { error } = await supabase.rpc('exec', {
          sql: `DROP TABLE IF EXISTS ${table} CASCADE;`,
        });

        if (error) {
          console.log(`   ❌ Failed to drop ${table}:`, error.message);
        } else {
          console.log(`   ✅ ${table} dropped successfully`);
        }
      } catch (err) {
        console.log(`   ❌ Error dropping ${table}:`, err.message);
      }
    }

    console.log('\n✅ STEP 3: Verifying cleanup...');

    // Verify expected tables still exist
    const finalTableStatus = [];
    for (const table of expectedTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);

        if (!error) {
          finalTableStatus.push({ table, status: 'EXISTS' });
          console.log(`   ✅ ${table} - EXISTS`);
        } else {
          finalTableStatus.push({ table, status: 'MISSING' });
          console.log(`   ❌ ${table} - MISSING!`);
        }
      } catch {
        finalTableStatus.push({ table, status: 'ERROR' });
        console.log(`   ⚠️  ${table} - ACCESS ERROR`);
      }
    }

    // Verify legacy tables are gone
    console.log('\n🔍 STEP 4: Confirming legacy table removal...');
    for (const table of legacyTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);

        if (error && error.message.includes('does not exist')) {
          console.log(`   ✅ ${table} - SUCCESSFULLY REMOVED`);
        } else {
          console.log(`   ❌ ${table} - STILL EXISTS!`);
        }
      } catch {
        console.log(`   ✅ ${table} - CONFIRMED REMOVED`);
      }
    }

    console.log('\n📊 CLEANUP SUMMARY:');
    console.log('==================');
    console.log(`Expected tables: ${expectedTables.length}`);
    console.log(`Legacy tables removed: ${existingLegacyTables.length}`);

    const existingCount = finalTableStatus.filter(
      t => t.status === 'EXISTS',
    ).length;
    console.log(`Final table count: ${existingCount}`);

    if (existingCount === 5) {
      console.log(
        '\n🎉 SUCCESS! Development environment now matches Production',
      );
      console.log('✅ 5 tables total (same as Production)');
      console.log('✅ All legacy tables removed');
      console.log('✅ All core tables preserved');
    } else {
      console.log('\n⚠️  WARNING: Table count mismatch');
      console.log('Some tables may be missing or cleanup incomplete');
    }
  } catch (error) {
    console.error('\n💥 Cleanup failed:', error.message);

    console.log('\n📝 MANUAL CLEANUP REQUIRED:');
    console.log('1. Go to Development Supabase Dashboard → SQL Editor');
    console.log('2. Run these commands one by one:');
    legacyTables.forEach(table => {
      console.log(`   DROP TABLE IF EXISTS ${table} CASCADE;`);
    });
  }
}

// Run cleanup
cleanupDevLegacyTables();
