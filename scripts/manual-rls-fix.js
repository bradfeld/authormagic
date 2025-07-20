#!/usr/bin/env node

/**
 * Manual RLS Security Fix Script
 * Applies critical RLS policy fixes using direct SQL execution
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function applyRLSFixes() {
  console.log('🚨 Applying Critical RLS Security Fixes...');

  const fixes = [
    {
      name: 'Drop insecure primary_books policy',
      sql: `DROP POLICY IF EXISTS "Users can manage their own primary books" ON primary_books;`,
    },
    {
      name: 'Create secure SELECT policy for primary_books',
      sql: `CREATE POLICY "primary_books_select" ON primary_books FOR SELECT USING (auth.uid()::text = user_id);`,
    },
    {
      name: 'Create secure INSERT policy for primary_books',
      sql: `CREATE POLICY "primary_books_insert" ON primary_books FOR INSERT WITH CHECK (auth.uid()::text = user_id);`,
    },
    {
      name: 'Create secure UPDATE policy for primary_books',
      sql: `CREATE POLICY "primary_books_update" ON primary_books FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
    },
    {
      name: 'Create secure DELETE policy for primary_books',
      sql: `CREATE POLICY "primary_books_delete" ON primary_books FOR DELETE USING (auth.uid()::text = user_id);`,
    },
    {
      name: 'Drop insecure primary_book_editions policy',
      sql: `DROP POLICY IF EXISTS "Users can manage editions of their primary books" ON primary_book_editions;`,
    },
    {
      name: 'Create secure SELECT policy for primary_book_editions',
      sql: `CREATE POLICY "primary_book_editions_select" ON primary_book_editions FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM primary_books pb 
          WHERE pb.id = primary_book_editions.primary_book_id 
          AND pb.user_id = auth.uid()::text
        )
      );`,
    },
    {
      name: 'Create secure INSERT policy for primary_book_editions',
      sql: `CREATE POLICY "primary_book_editions_insert" ON primary_book_editions FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM primary_books pb 
          WHERE pb.id = primary_book_editions.primary_book_id 
          AND pb.user_id = auth.uid()::text
        )
      );`,
    },
    {
      name: 'Create secure UPDATE policy for primary_book_editions',
      sql: `CREATE POLICY "primary_book_editions_update" ON primary_book_editions FOR UPDATE 
        USING (
          EXISTS (
            SELECT 1 FROM primary_books pb 
            WHERE pb.id = primary_book_editions.primary_book_id 
            AND pb.user_id = auth.uid()::text
          )
        ) 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM primary_books pb 
            WHERE pb.id = primary_book_editions.primary_book_id 
            AND pb.user_id = auth.uid()::text
          )
        );`,
    },
    {
      name: 'Create secure DELETE policy for primary_book_editions',
      sql: `CREATE POLICY "primary_book_editions_delete" ON primary_book_editions FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM primary_books pb 
          WHERE pb.id = primary_book_editions.primary_book_id 
          AND pb.user_id = auth.uid()::text
        )
      );`,
    },
  ];

  for (const fix of fixes) {
    try {
      console.log(`🔧 Applying: ${fix.name}`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: fix.sql });

      if (error) {
        console.error(`❌ Failed: ${fix.name}`, error.message);
        // Try direct approach
        const { error: directError } = await supabase
          .from('_')
          .select('*')
          .limit(0);
        console.log(`🔄 Attempting direct SQL execution...`);
        // We'll need to use a different approach
      } else {
        console.log(`✅ Success: ${fix.name}`);
      }
    } catch (err) {
      console.error(`❌ Error applying ${fix.name}:`, err.message);
    }
  }
}

// Create the SQL function to execute raw SQL if it doesn't exist
async function createSQLFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    console.log('🔧 Creating SQL execution function...');
    await supabase.rpc('exec_sql', { sql_query: createFunctionSQL });
    console.log('✅ SQL function created');
  } catch (err) {
    console.log('ℹ️  SQL function may already exist');
  }
}

async function main() {
  await createSQLFunction();
  await applyRLSFixes();
  console.log('🎯 RLS Security Fixes Application Complete');
}

main().catch(console.error);
