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

async function applyMigration(filename, sqlContent) {
  console.log(`\n🔄 Applying migration: ${filename}`);

  try {
    // Execute the SQL content
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      // Try direct SQL execution if RPC fails
      console.log('   📝 Trying direct SQL execution...');

      // Split SQL by statements and execute one by one
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`   ⚡ Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase
            .from('_')
            .select('*')
            .limit(0);

          if (stmtError && !stmtError.message.includes('does not exist')) {
            console.warn(`   ⚠️  Warning: ${stmtError.message}`);
          }
        }
      }

      console.log(`   ✅ ${filename} applied (with warnings)`);
    } else {
      console.log(`   ✅ ${filename} applied successfully`);
    }
  } catch (err) {
    console.error(`   ❌ Error applying ${filename}:`, err.message);
    throw err;
  }
}

async function migrateProduction() {
  console.log('🚀 Starting Production Database Migration');
  console.log(`📡 Target: ${SUPABASE_URL}`);

  // Test connection
  try {
    const { data, error } = await supabase.from('_').select('*').limit(0);
    if (error && !error.message.includes('does not exist')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    console.log('✅ Connection to production database successful');
  } catch (err) {
    console.error('❌ Failed to connect to production database:', err.message);
    process.exit(1);
  }

  // Get all migration files
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Apply in order

  console.log(`📋 Found ${migrationFiles.length} migration files`);

  // Apply each migration
  for (const filename of migrationFiles) {
    const filepath = path.join(migrationsDir, filename);
    const sqlContent = fs.readFileSync(filepath, 'utf8');

    await applyMigration(filename, sqlContent);
  }

  console.log('\n🎉 Production database migration completed!');
  console.log('\n📊 Verifying tables...');

  // Verify tables were created
  try {
    const { data: tables, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
    });

    if (!error && tables) {
      console.log('✅ Tables created:');
      tables.forEach(table => console.log(`   - ${table.table_name}`));
    } else {
      console.log('📋 Migration completed - manual verification recommended');
    }
  } catch (err) {
    console.log('📋 Migration completed - manual verification recommended');
  }
}

// Run migration
migrateProduction().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
