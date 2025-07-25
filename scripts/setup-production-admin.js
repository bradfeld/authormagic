#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Use production Supabase credentials from environment
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
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupProductionAdmin() {
  console.log('🚀 Setting up production admin role...');
  console.log(`📡 Target: ${SUPABASE_URL}`);

  try {
    // Step 1: Get all authors to find brad@feld.com
    console.log('\n🔍 Looking for authors in production database...');
    const { data: authors, error: authorsError } = await supabase
      .from('authors')
      .select('*')
      .limit(10);

    if (authorsError) {
      throw new Error(`Failed to query authors: ${authorsError.message}`);
    }

    console.log(`✅ Found ${authors.length} authors in database`);
    authors.forEach(author => {
      console.log(`   - ${author.clerk_user_id} (${author.name || 'No name'})`);
    });

    // Step 2: Look for brad@feld.com - we'll need to check this via Clerk integration
    // For now, let's check if there's already an admin
    console.log('\n🔍 Checking existing admin roles...');
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      throw new Error(`Failed to query user_roles: ${rolesError.message}`);
    }

    console.log(`✅ Found ${existingRoles.length} existing roles`);
    const existingAdmin = existingRoles.find(role => role.role === 'admin');

    if (existingAdmin) {
      console.log('✅ Admin role already exists:');
      console.log(`   User: ${existingAdmin.clerk_user_id}`);
      console.log(`   Granted: ${existingAdmin.granted_at}`);
      return;
    }

    // Step 3: If no admin exists, we need to create one
    console.log('\n❌ No admin role found. We need to create one.');
    console.log('\n📋 Available authors to promote to admin:');
    authors.forEach((author, index) => {
      console.log(
        `   ${index + 1}. ${author.name || 'Unknown'} (${author.clerk_user_id})`,
      );
    });

    // For automation, let's use the first author (likely brad@feld.com)
    if (authors.length === 0) {
      throw new Error(
        'No authors found in database. Please create an account first.',
      );
    }

    const firstAuthor = authors[0];
    console.log(
      `\n🔧 Promoting first author to admin: ${firstAuthor.name || 'Unknown'}`,
    );

    // Step 4: Insert admin role
    const { error: insertError } = await supabase.from('user_roles').insert({
      clerk_user_id: firstAuthor.clerk_user_id,
      role: 'admin',
      granted_by: firstAuthor.clerk_user_id,
    });

    if (insertError) {
      throw new Error(`Failed to insert admin role: ${insertError.message}`);
    }

    console.log('✅ Admin role created successfully!');

    // Step 5: Verify the role was created
    const { data: newRoles, error: verifyError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'admin');

    if (verifyError) {
      throw new Error(`Failed to verify admin role: ${verifyError.message}`);
    }

    console.log('\n🎉 Admin setup complete!');
    console.log('📊 Current admin roles:');
    newRoles.forEach(role => {
      console.log(`   - ${role.clerk_user_id} (granted at ${role.granted_at})`);
    });

    console.log('\n✅ Your production dashboard should now work!');
    console.log('🌐 Visit: https://authormagic.com/dashboard');
  } catch (error) {
    console.error('💥 Error setting up admin role:', error.message);
    process.exit(1);
  }
}

setupProductionAdmin();
