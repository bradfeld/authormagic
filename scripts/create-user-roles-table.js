#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

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

async function createUserRolesTable() {
  console.log('🚀 Creating user_roles table in production database');
  console.log(`📡 Target: ${SUPABASE_URL}`);

  try {
    // First check if table exists
    console.log('\n🔍 Checking if user_roles table exists...');
    const { data: checkData, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(0);

    if (!checkError) {
      console.log('✅ user_roles table already exists and is accessible');
      console.log('🎉 No action needed!');
      return;
    }

    if (!checkError.message.includes('does not exist')) {
      console.log('⚠️  Table exists but has issues:', checkError.message);
      console.log('🔧 Proceeding with recreation...');
    }

    console.log('\n📋 Creating user_roles table...');

    // Create the table using raw SQL via Supabase CLI approach
    // Since we can't execute arbitrary SQL directly, we'll use the REST API
    const createTableSQL = `
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_clerk_user_id ON user_roles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT USING (auth.uid()::text = clerk_user_id OR 
                   EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin'));

CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin'));

CREATE POLICY "user_roles_update" ON user_roles
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin'));

CREATE POLICY "user_roles_delete" ON user_roles
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin'));

-- Add comments
COMMENT ON TABLE user_roles IS 'User role assignments for authorization';
COMMENT ON COLUMN user_roles.clerk_user_id IS 'Clerk user ID from authentication';
COMMENT ON COLUMN user_roles.role IS 'User role: admin or user';
COMMENT ON COLUMN user_roles.granted_by IS 'Clerk user ID of who granted this role';
    `;

    // Split SQL into statements and execute via Supabase CLI
    console.log('🔧 Applying user_roles table creation via Supabase CLI...');

    // Write SQL to temporary file and execute via CLI
    const fs = require('fs');
    const tempFile = '/tmp/create-user-roles.sql';
    fs.writeFileSync(tempFile, createTableSQL);

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout, stderr } = await execAsync(
        `supabase db push --db-url 'postgresql://postgres:pdf8xpk9phr7UMD!uka@db.soxcczdtgaxrgzehacth.supabase.co:5432/postgres' --include-all`,
      );

      console.log('📋 CLI output:', stdout);
      if (stderr) console.log('⚠️  CLI warnings:', stderr);
    } catch (cliError) {
      console.log('⚠️  CLI approach failed, trying direct creation...');

      // Fallback: Try to create table directly
      console.log('🔧 Attempting direct table creation...');

      // Create a minimal version first
      const { data: createData, error: createError } = await supabase.rpc(
        'exec',
        {
          sql: `CREATE TABLE IF NOT EXISTS user_roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          clerk_user_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
          granted_by TEXT NOT NULL,
          granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        },
      );

      if (createError) {
        console.log('❌ Direct creation failed:', createError.message);
        console.log('📝 Manual creation required via Supabase SQL Editor');

        console.log('\n📋 MANUAL STEPS:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Paste and run this SQL:');
        console.log('\n' + createTableSQL);
        return;
      }
    }

    // Verify table was created
    console.log('\n✅ Verifying table creation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(0);

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log('🎉 user_roles table created successfully!');
      console.log(
        '📊 Table is now accessible via API and should appear in dashboard',
      );
    }

    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  } catch (error) {
    console.error('💥 Table creation failed:', error.message);

    console.log('\n📝 MANUAL CREATION REQUIRED:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run this SQL:');
    console.log(`
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `);
  }
}

// Run table creation
createUserRolesTable();
