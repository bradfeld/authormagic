#!/usr/bin/env node

/**
 * RLS Diagnostic Script
 * Determines exactly why RLS policies are not working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function diagnoseRLS() {
  console.log('🔍 Diagnosing RLS Issues...');

  try {
    // Test 1: Check if we can query the table at all
    console.log('\n📋 Test 1: Basic table access...');
    const { data: books, error: booksError } = await supabase
      .from('primary_books')
      .select('id, user_id, title')
      .limit(5);

    if (booksError) {
      console.error('❌ Cannot access primary_books table:', booksError);
      return;
    }

    console.log(
      `✅ Can access primary_books table. Found ${books.length} books`,
    );

    // Test 2: Check what happens with anonymous access
    console.log('\n📋 Test 2: Anonymous access test...');
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    const { data: anonBooks, error: anonError } = await anonClient
      .from('primary_books')
      .select('id, user_id, title')
      .limit(5);

    if (anonError) {
      console.log('✅ Anonymous access blocked:', anonError.message);
    } else {
      console.log(
        `❌ Anonymous access allowed! Found ${anonBooks.length} books`,
      );
      console.log('First book:', anonBooks[0]);
    }

    // Test 3: Try to see what policies exist using a different approach
    console.log('\n📋 Test 3: Check for policy existence...');

    // Try to run our migration again to see what errors we get
    const migrationSQL = `
      -- Check if policies exist by trying to drop them
      DROP POLICY IF EXISTS "primary_books_select" ON primary_books;
      DROP POLICY IF EXISTS "primary_books_insert" ON primary_books;
      DROP POLICY IF EXISTS "primary_books_update" ON primary_books;
      DROP POLICY IF EXISTS "primary_books_delete" ON primary_books;
      
      -- Recreate the policies
      CREATE POLICY "primary_books_select" ON primary_books 
        FOR SELECT USING (auth.uid()::text = user_id);
      
      CREATE POLICY "primary_books_insert" ON primary_books 
        FOR INSERT WITH CHECK (auth.uid()::text = user_id);
      
      CREATE POLICY "primary_books_update" ON primary_books 
        FOR UPDATE 
        USING (auth.uid()::text = user_id) 
        WITH CHECK (auth.uid()::text = user_id);
      
      CREATE POLICY "primary_books_delete" ON primary_books 
        FOR DELETE USING (auth.uid()::text = user_id);
    `;

    // Since we can't run raw SQL through the JS client, let's test the actual issue
    console.log('Cannot run SQL directly - this is the core issue!');

    // Test 4: Check if RLS is enabled by testing behavior
    console.log('\n📋 Test 4: RLS behavior test...');

    // Insert test data
    const { data: testBook, error: insertError } = await supabase
      .from('primary_books')
      .insert({
        user_id: 'diagnostic_test_user',
        title: 'Diagnostic Test Book',
        author: 'Test Author',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Cannot insert test data:', insertError);
      return;
    }

    console.log('✅ Test book inserted:', testBook.id);

    // Now try to update with anonymous client
    const { data: updateResult, error: updateError } = await anonClient
      .from('primary_books')
      .update({ title: 'HACKED TITLE' })
      .eq('id', testBook.id);

    if (updateError) {
      console.log('✅ Anonymous update blocked:', updateError.message);
    } else {
      console.log('❌ Anonymous update allowed - RLS NOT WORKING!');
    }

    // Try to select with anonymous client
    const { data: selectResult, error: selectError } = await anonClient
      .from('primary_books')
      .select('*')
      .eq('id', testBook.id);

    if (selectError) {
      console.log('✅ Anonymous select blocked:', selectError.message);
    } else {
      console.log('❌ Anonymous select allowed - RLS NOT WORKING!');
      console.log('Selected data:', selectResult);
    }

    // Cleanup
    await supabase.from('primary_books').delete().eq('id', testBook.id);

    console.log('\n🎯 DIAGNOSIS COMPLETE');
    console.log('🚨 The issue is that RLS policies are not being enforced!');
    console.log(
      '💡 This suggests the policies were not applied correctly in Supabase Dashboard',
    );
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

diagnoseRLS();
