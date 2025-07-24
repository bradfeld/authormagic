#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Development Supabase credentials (from .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanupDevDatabase() {
  console.log('🧹 Starting Development Database Cleanup');
  console.log(`📡 Target: ${SUPABASE_URL}`);

  try {
    // Delete all data in reverse dependency order
    console.log('\n🗑️  Clearing all data from development database...');

    // Clear primary book related data
    await supabase
      .from('primary_book_bindings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Cleared primary_book_bindings');

    await supabase
      .from('primary_book_editions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Cleared primary_book_editions');

    await supabase
      .from('primary_books')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Cleared primary_books');

    // Clear user-related data
    await supabase
      .from('user_roles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Cleared user_roles');

    await supabase
      .from('authors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Cleared authors');

    console.log('\n🎉 Development database cleanup completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Development environment now has clean database');
    console.log('   2. Production environment has separate database');
    console.log('   3. No more user conflicts between environments');
    console.log('   4. Book addition errors should be resolved');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupDevDatabase();
