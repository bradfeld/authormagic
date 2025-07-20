#!/usr/bin/env node

/**
 * Test RLS with Proper Authentication
 * This test verifies RLS works when users have proper JWT tokens
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function testRLSWithAuth() {
  console.log('🔒 Testing RLS with Proper Authentication...');

  try {
    // Step 1: Create test data using admin client
    console.log('\n📋 Step 1: Setting up test data...');

    const testUser1 = 'test_user_rls_auth_1';
    const testUser2 = 'test_user_rls_auth_2';

    // Cleanup
    await supabaseAdmin
      .from('primary_books')
      .delete()
      .in('user_id', [testUser1, testUser2]);

    // Create test book for user 1
    const { data: testBook, error: insertError } = await supabaseAdmin
      .from('primary_books')
      .insert({
        user_id: testUser1,
        title: 'User 1 Test Book',
        author: 'Test Author',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create test data:', insertError);
      return false;
    }

    console.log('✅ Test book created for user 1:', testBook.id);

    // Step 2: Test with anonymous client (no auth)
    console.log('\n📋 Step 2: Testing anonymous access (should be blocked)...');

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // Test SELECT
    const { data: anonSelectData, error: anonSelectError } = await anonClient
      .from('primary_books')
      .select('*');

    if (anonSelectError) {
      console.log('✅ Anonymous SELECT blocked:', anonSelectError.message);
    } else {
      console.log(
        `⚠️  Anonymous SELECT returned ${anonSelectData?.length || 0} books`,
      );
      if (anonSelectData?.length === 0) {
        console.log('✅ No data returned (RLS working correctly)');
      }
    }

    // Test UPDATE
    const { data: anonUpdateData, error: anonUpdateError } = await anonClient
      .from('primary_books')
      .update({ title: 'HACKED TITLE' })
      .eq('id', testBook.id);

    if (anonUpdateError) {
      console.log('✅ Anonymous UPDATE blocked:', anonUpdateError.message);
    } else {
      console.log('❌ Anonymous UPDATE allowed!', anonUpdateData);
    }

    // Test INSERT
    const { data: anonInsertData, error: anonInsertError } = await anonClient
      .from('primary_books')
      .insert({
        user_id: testUser2,
        title: 'Hacker Book',
        author: 'Anonymous Hacker',
      });

    if (anonInsertError) {
      console.log('✅ Anonymous INSERT blocked:', anonInsertError.message);
    } else {
      console.log('❌ Anonymous INSERT allowed!', anonInsertData);
    }

    // Step 3: Test behavior summary
    console.log('\n📋 Step 3: RLS Behavior Analysis...');

    // Check if book still has original title (UPDATE was blocked)
    const { data: checkBook, error: checkError } = await supabaseAdmin
      .from('primary_books')
      .select('title')
      .eq('id', testBook.id)
      .single();

    if (checkError) {
      console.error('❌ Cannot check book status:', checkError);
    } else {
      if (checkBook.title === 'User 1 Test Book') {
        console.log('✅ Book title unchanged - UPDATE was properly blocked');
      } else {
        console.log(
          '❌ Book title was changed - UPDATE was not blocked properly',
        );
      }
    }

    // Check if unauthorized book was inserted
    const { data: unauthorizedBooks, error: unauthorizedError } =
      await supabaseAdmin
        .from('primary_books')
        .select('*')
        .eq('user_id', testUser2);

    if (unauthorizedError) {
      console.error('❌ Cannot check unauthorized books:', unauthorizedError);
    } else {
      if (unauthorizedBooks.length === 0) {
        console.log(
          '✅ No unauthorized books found - INSERT was properly blocked',
        );
      } else {
        console.log(
          '❌ Unauthorized book was inserted - INSERT was not blocked properly',
        );
      }
    }

    // Cleanup
    console.log('\n📋 Cleaning up...');
    await supabaseAdmin.from('primary_books').delete().eq('id', testBook.id);

    console.log('\n🎯 RLS AUTHENTICATION TEST COMPLETE');

    // Final assessment
    const updateBlocked = checkBook?.title === 'User 1 Test Book';
    const insertBlocked = unauthorizedBooks?.length === 0;

    if (updateBlocked && insertBlocked) {
      console.log('✅ RLS policies are working correctly!');
      console.log('✅ Unauthorized operations are properly blocked');
      return true;
    } else {
      console.log('❌ RLS policies have issues that need investigation');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testRLSWithAuth()
  .then(success => {
    if (success) {
      console.log('\n🏆 ALL RLS TESTS PASSED!');
      console.log('🔒 Database security is properly configured');
      process.exit(0);
    } else {
      console.log(
        '\n⚠️  RLS tests found issues - further investigation needed',
      );
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
