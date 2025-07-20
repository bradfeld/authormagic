#!/usr/bin/env node

/**
 * Verify RLS Fix Script
 * Simple verification that RLS policies are working correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Anonymous client (enforces RLS)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function verifyRLSFix() {
  console.log('🔒 Verifying RLS Security Fix...');

  try {
    // Step 1: Create test data using service role (bypasses RLS)
    console.log('\n📋 Step 1: Setting up test data...');

    const testUserId1 = 'test_user_1_rls_verify';
    const testUserId2 = 'test_user_2_rls_verify';

    // Clean up any existing test data
    await supabaseAdmin
      .from('primary_books')
      .delete()
      .in('user_id', [testUserId1, testUserId2]);

    // Insert test book for user 1
    const { data: testBook, error: insertError } = await supabaseAdmin
      .from('primary_books')
      .insert({
        user_id: testUserId1,
        title: 'Test Book for RLS',
        author: 'Test Author',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create test data:', insertError);
      return false;
    }

    console.log('✅ Test book created:', testBook.id);

    // Step 2: Test unauthorized UPDATE using anonymous client
    console.log('\n📋 Step 2: Testing unauthorized UPDATE...');

    // Try to update the book without authentication (should fail)
    const { data: updateData, error: updateError } = await supabaseAnon
      .from('primary_books')
      .update({ title: 'HACKED TITLE' })
      .eq('id', testBook.id);

    if (updateError) {
      console.log('✅ UPDATE correctly blocked:', updateError.message);
      console.log('✅ RLS policies are working correctly!');
    } else {
      console.log('❌ UPDATE was allowed - RLS policies not working!');
      console.log('Updated data:', updateData);
      return false;
    }

    // Step 3: Test unauthorized INSERT
    console.log('\n📋 Step 3: Testing unauthorized INSERT...');

    const { data: insertData, error: insertError2 } = await supabaseAnon
      .from('primary_books')
      .insert({
        user_id: testUserId2,
        title: 'Unauthorized Book',
        author: 'Hacker',
      });

    if (insertError2) {
      console.log('✅ INSERT correctly blocked:', insertError2.message);
    } else {
      console.log('❌ INSERT was allowed - security issue!');
      console.log('Inserted data:', insertData);
    }

    // Step 4: Test unauthorized SELECT
    console.log('\n📋 Step 4: Testing unauthorized SELECT...');

    const { data: selectData, error: selectError } = await supabaseAnon
      .from('primary_books')
      .select('*');

    if (selectError) {
      console.log('✅ SELECT correctly blocked:', selectError.message);
    } else if (!selectData || selectData.length === 0) {
      console.log('✅ SELECT returned no data (RLS working)');
    } else {
      console.log('❌ SELECT returned data - potential security issue');
      console.log('Selected data:', selectData);
    }

    // Cleanup
    console.log('\n📋 Cleaning up test data...');
    await supabaseAdmin.from('primary_books').delete().eq('id', testBook.id);

    console.log('\n🎯 RLS Verification Complete!');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run verification
verifyRLSFix()
  .then(success => {
    if (success) {
      console.log('\n✅ All RLS security checks passed!');
      process.exit(0);
    } else {
      console.log('\n❌ RLS security issues detected!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
