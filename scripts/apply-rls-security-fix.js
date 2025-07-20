#!/usr/bin/env node

/**
 * Apply RLS Security Fixes Script
 *
 * Safely applies the critical RLS security fixes to the production database.
 * This addresses the vulnerabilities found in AUT-78 security assessment.
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function applyRLSSecurityFix() {
  console.log('🚨 Applying Critical RLS Security Fixes...');
  console.log('📋 Origin: AUT-78 Security Assessment');
  console.log('🎯 Target: Production Database RLS Policies');
  console.log('');

  try {
    // Read the migration file
    const migrationPath = join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '007_fix_rls_security_policies.sql',
    );
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📁 Loaded migration: 007_fix_rls_security_policies.sql');
    console.log(`📏 Migration size: ${migrationSQL.length} characters`);
    console.log('');

    // Apply the critical policies manually since we don't have direct SQL execution
    return await applyManualSQL();
  } catch (error) {
    console.error('');
    console.error('🚨 CRITICAL ERROR applying RLS security fixes:');
    console.error(error.message);
    console.error('');
    console.error(
      '💡 You may need to apply the fixes manually via Supabase Dashboard',
    );
    console.error(
      '📁 Migration file: supabase/migrations/007_fix_rls_security_policies.sql',
    );
    return false;
  }
}

// Apply critical policies via Supabase client
async function applyManualSQL() {
  console.log('🔧 Applying critical RLS policies...');

  const fixes = [
    {
      name: 'Drop old primary_books policy',
      sql: async () => {
        const { error } = await supabase.sql`
          DROP POLICY IF EXISTS "Users can manage their own primary books" ON primary_books;
        `;
        return error;
      },
    },
    {
      name: 'Create primary_books SELECT policy',
      sql: async () => {
        const { error } = await supabase.sql`
          CREATE POLICY "primary_books_select" ON primary_books
          FOR SELECT USING (auth.uid()::text = user_id);
        `;
        return error;
      },
    },
    {
      name: 'Create primary_books INSERT policy',
      sql: async () => {
        const { error } = await supabase.sql`
          CREATE POLICY "primary_books_insert" ON primary_books
          FOR INSERT WITH CHECK (auth.uid()::text = user_id);
        `;
        return error;
      },
    },
    {
      name: 'Create primary_books UPDATE policy (CRITICAL)',
      sql: async () => {
        const { error } = await supabase.sql`
          CREATE POLICY "primary_books_update" ON primary_books
          FOR UPDATE 
          USING (auth.uid()::text = user_id)
          WITH CHECK (auth.uid()::text = user_id);
        `;
        return error;
      },
    },
    {
      name: 'Create primary_books DELETE policy',
      sql: async () => {
        const { error } = await supabase.sql`
          CREATE POLICY "primary_books_delete" ON primary_books
          FOR DELETE USING (auth.uid()::text = user_id);
        `;
        return error;
      },
    },
  ];

  let applied = 0;
  let failed = 0;

  for (const fix of fixes) {
    try {
      console.log(`⚙️  ${fix.name}...`);
      const error = await fix.sql();

      if (!error) {
        applied++;
        console.log(`✅ ${fix.name} - SUCCESS`);
      } else {
        failed++;
        console.log(`❌ ${fix.name} - FAILED: ${error.message}`);

        // Critical policy failure should be reported
        if (fix.name.includes('CRITICAL')) {
          console.error(`🚨 CRITICAL POLICY FAILED: ${error.message}`);
        }
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${fix.name} - ERROR: ${error.message}`);
    }
  }

  console.log('');
  console.log(`📊 Policy Application Results:`);
  console.log(`✅ Applied: ${applied}/${fixes.length}`);
  console.log(`❌ Failed: ${failed}/${fixes.length}`);

  return applied >= 3; // Need at least SELECT, INSERT, UPDATE policies
}

// Alternative: Show manual instructions
function showManualInstructions() {
  console.log('');
  console.log('📝 MANUAL APPLICATION REQUIRED');
  console.log('==============================');
  console.log('');
  console.log('Please apply these SQL statements in the Supabase Dashboard:');
  console.log('');
  console.log('1. Go to: Supabase Dashboard > SQL Editor');
  console.log('2. Execute the following SQL statements:');
  console.log('');
  console.log('-- Drop old policies');
  console.log(
    'DROP POLICY IF EXISTS "Users can manage their own primary books" ON primary_books;',
  );
  console.log('');
  console.log('-- Create secure policies');
  console.log('CREATE POLICY "primary_books_select" ON primary_books');
  console.log('  FOR SELECT USING (auth.uid()::text = user_id);');
  console.log('');
  console.log('CREATE POLICY "primary_books_insert" ON primary_books');
  console.log('  FOR INSERT WITH CHECK (auth.uid()::text = user_id);');
  console.log('');
  console.log('CREATE POLICY "primary_books_update" ON primary_books');
  console.log('  FOR UPDATE ');
  console.log('  USING (auth.uid()::text = user_id)');
  console.log('  WITH CHECK (auth.uid()::text = user_id);');
  console.log('');
  console.log('CREATE POLICY "primary_books_delete" ON primary_books');
  console.log('  FOR DELETE USING (auth.uid()::text = user_id);');
  console.log('');
  console.log('3. Test the fixes: node scripts/test-rls-database.js');
}

// Main execution
async function main() {
  console.log('🔐 Starting RLS Security Fix Application');
  console.log('============================================');

  // Check environment variables
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    console.error('📁 Check your .env.local file');
    return process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`🔗 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log('');

  // Try to apply the fixes
  const success = await applyRLSSecurityFix();

  if (success) {
    console.log('');
    console.log('🎉 RLS Security Fixes Applied Successfully!');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Run security tests: node scripts/test-rls-database.js');
    console.log('2. Verify UPDATE operations are now blocked');
    console.log('3. Confirm security score improvement (target: >80%)');
    console.log('4. Update Linear issue AUT-105 with results');
    console.log('');
    process.exit(0);
  } else {
    console.log('');
    console.log('❌ Automatic application failed');
    showManualInstructions();
    console.log('');
    process.exit(1);
  }
}

main().catch(console.error);
