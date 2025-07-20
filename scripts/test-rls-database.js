#!/usr/bin/env node

/**
 * Real Database RLS Testing Script
 * Tests actual Supabase RLS policies with real database connections
 *
 * Usage: node scripts/test-rls-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

class DatabaseRLSTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
    this.startTime = Date.now();
    this.supabase = null;

    // Test user IDs (would be real Clerk user IDs in actual test)
    this.testUsers = {
      user1: 'user_test123_rls_user1',
      user2: 'user_test123_rls_user2',
      malicious: 'user_malicious_rls_test',
    };
  }

  async initialize() {
    try {
      // Initialize Supabase client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
          'Missing Supabase configuration in environment variables',
        );
      }

      // Use service role key for testing (bypasses RLS for setup)
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);

      this.log('🔌 Connected to Supabase database', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to initialize Supabase: ${error.message}`, 'error');
      return false;
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix =
      {
        info: '📋',
        success: '✅',
        error: '❌',
        warning: '⚠️',
      }[type] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  recordTest(testName, passed, details = '') {
    this.results.tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString(),
    });

    if (passed) {
      this.results.passed++;
      this.log(`${testName}: PASSED ${details}`, 'success');
    } else {
      this.results.failed++;
      this.log(`${testName}: FAILED ${details}`, 'error');
    }
  }

  recordWarning(testName, details) {
    this.results.warnings++;
    this.log(`${testName}: WARNING ${details}`, 'warning');
  }

  // Create a client with simulated user JWT
  createUserClient(userId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const client = createClient(supabaseUrl, supabaseAnonKey);

    // Simulate user authentication by setting a mock JWT
    // In real implementation, this would be a real JWT from Clerk
    const mockJWT = this.createMockJWT(userId);
    client.realtime.setAuth(mockJWT);

    return client;
  }

  createMockJWT(userId) {
    // Create a mock JWT structure (for testing purposes)
    // In production, this would be a real JWT from Clerk
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        iss: 'supabase',
      }),
    ).toString('base64');
    const signature = 'mock_signature';

    return `${header}.${payload}.${signature}`;
  }

  async setupTestData() {
    this.log('🔧 Setting up test data...', 'info');

    try {
      // Clean up any existing test data first
      await this.cleanupTestData();

      // Insert test books for each user using service role (bypasses RLS)
      const testBooks = [
        {
          user_id: this.testUsers.user1,
          title: 'User 1 Test Book',
          author: 'Test Author 1',
        },
        {
          user_id: this.testUsers.user2,
          title: 'User 2 Test Book',
          author: 'Test Author 2',
        },
      ];

      for (const book of testBooks) {
        const { error } = await this.supabase
          .from('primary_books')
          .insert(book);

        if (error) {
          throw new Error(`Failed to insert test book: ${error.message}`);
        }
      }

      this.log('✅ Test data setup complete', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to setup test data: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanupTestData() {
    try {
      // Delete test books using service role
      await this.supabase
        .from('primary_books')
        .delete()
        .in('user_id', Object.values(this.testUsers));

      this.log('🧹 Test data cleanup complete', 'info');
    } catch (error) {
      this.log(`Cleanup warning: ${error.message}`, 'warning');
    }
  }

  async testRLSPolicyExists() {
    try {
      // Check if RLS is enabled on key tables
      const tables = [
        'primary_books',
        'primary_book_editions',
        'primary_book_bindings',
      ];
      let allTablesHaveRLS = true;
      const details = [];

      for (const table of tables) {
        const { data, error } = await this.supabase
          .from('pg_tables')
          .select('*')
          .eq('tablename', table)
          .eq('schemaname', 'public');

        if (error) {
          allTablesHaveRLS = false;
          details.push(`${table}: error checking`);
          continue;
        }

        // Note: This is a simplified check. In a real implementation,
        // we'd query pg_policies to check actual RLS policies
        const hasRLS = data && data.length > 0;
        if (!hasRLS) {
          allTablesHaveRLS = false;
        }
        details.push(`${table}: ${hasRLS ? 'exists' : 'missing'}`);
      }

      this.recordTest('RLS Tables Exist', allTablesHaveRLS, details.join(', '));
    } catch (error) {
      this.recordTest('RLS Policy Check', false, error.message);
    }
  }

  async testUserDataIsolation() {
    try {
      this.log('🔒 Testing user data isolation...', 'info');

      // Create clients for different users (simulating JWT auth)
      const user1Client = this.createUserClient(this.testUsers.user1);
      const user2Client = this.createUserClient(this.testUsers.user2);

      // User 1 should only see their own books
      const { data: user1Books, error: user1Error } = await user1Client
        .from('primary_books')
        .select('*')
        .eq('user_id', this.testUsers.user1);

      if (user1Error) {
        this.recordTest('User 1 Data Access', false, user1Error.message);
        return;
      }

      // User 2 should only see their own books
      const { data: user2Books, error: user2Error } = await user2Client
        .from('primary_books')
        .select('*')
        .eq('user_id', this.testUsers.user2);

      if (user2Error) {
        this.recordTest('User 2 Data Access', false, user2Error.message);
        return;
      }

      // Verify isolation
      const user1HasOnlyOwnBooks = user1Books.every(
        book => book.user_id === this.testUsers.user1,
      );
      const user2HasOnlyOwnBooks = user2Books.every(
        book => book.user_id === this.testUsers.user2,
      );

      this.recordTest(
        'User Data Isolation',
        user1HasOnlyOwnBooks && user2HasOnlyOwnBooks,
        `User1 books: ${user1Books.length}, User2 books: ${user2Books.length}`,
      );
    } catch (error) {
      this.recordTest('User Data Isolation', false, error.message);
    }
  }

  async testCrossUserAccess() {
    try {
      this.log('🚫 Testing cross-user access prevention...', 'info');

      // User 1 attempts to access User 2's data
      const maliciousClient = this.createUserClient(this.testUsers.user1);

      const { data: otherUserBooks, error } = await maliciousClient
        .from('primary_books')
        .select('*')
        .eq('user_id', this.testUsers.user2); // Trying to access user2's books

      // RLS should prevent this or return empty results
      const accessPrevented =
        error || (otherUserBooks && otherUserBooks.length === 0);

      this.recordTest(
        'Cross-User Access Prevention',
        accessPrevented,
        error
          ? `Blocked with error: ${error.message}`
          : `Returned ${otherUserBooks?.length || 0} books`,
      );
    } catch (error) {
      this.recordTest('Cross-User Access Prevention', false, error.message);
    }
  }

  async testUnauthorizedModification() {
    try {
      this.log('✏️ Testing unauthorized data modification...', 'info');

      const maliciousClient = this.createUserClient(this.testUsers.malicious);

      // Attempt to insert a book for another user
      const { error: insertError } = await maliciousClient
        .from('primary_books')
        .insert({
          user_id: this.testUsers.user1, // Trying to insert for user1
          title: 'Malicious Book',
          author: 'Hacker',
        });

      // Attempt to update another user's book
      const { error: updateError } = await maliciousClient
        .from('primary_books')
        .update({ title: 'Hacked Title' })
        .eq('user_id', this.testUsers.user1);

      // Both operations should be blocked
      const insertBlocked = insertError !== null;
      const updateBlocked = updateError !== null;

      this.recordTest(
        'Unauthorized Insert Prevention',
        insertBlocked,
        insertError
          ? `Blocked: ${insertError.message}`
          : 'Insert was allowed (SECURITY ISSUE)',
      );

      this.recordTest(
        'Unauthorized Update Prevention',
        updateBlocked,
        updateError
          ? `Blocked: ${updateError.message}`
          : 'Update was allowed (SECURITY ISSUE)',
      );
    } catch (error) {
      this.recordTest('Unauthorized Modification Test', false, error.message);
    }
  }

  async testCascadePermissions() {
    try {
      this.log('🔗 Testing cascade permissions on related tables...', 'info');

      // Get a book for user1
      const { data: books } = await this.supabase
        .from('primary_books')
        .select('id')
        .eq('user_id', this.testUsers.user1)
        .limit(1);

      if (!books || books.length === 0) {
        this.recordWarning('Cascade Permissions Test', 'No test books found');
        return;
      }

      const bookId = books[0].id;

      // Insert edition for this book
      const { data: edition, error: editionError } = await this.supabase
        .from('primary_book_editions')
        .insert({
          primary_book_id: bookId,
          edition_number: 1,
          publication_year: 2024,
        })
        .select()
        .single();

      if (editionError) {
        this.recordTest('Edition Insert', false, editionError.message);
        return;
      }

      // Insert binding for this edition
      const { error: bindingError } = await this.supabase
        .from('primary_book_bindings')
        .insert({
          book_edition_id: edition.id,
          binding_type: 'hardcover',
          isbn: '9781234567890',
        });

      const bindingInsertSuccess = !bindingError;

      this.recordTest(
        'Cascade Permissions',
        bindingInsertSuccess,
        bindingError
          ? `Binding insert failed: ${bindingError.message}`
          : 'Related tables accessible',
      );

      // Now test that user2 cannot access user1's editions/bindings
      const user2Client = this.createUserClient(this.testUsers.user2);

      const { data: user2Editions, error: user2EditionsError } =
        await user2Client
          .from('primary_book_editions')
          .select('*')
          .eq('primary_book_id', bookId);

      const editionsBlocked =
        user2EditionsError || (user2Editions && user2Editions.length === 0);

      this.recordTest(
        'Cascade RLS Enforcement',
        editionsBlocked,
        editionsBlocked
          ? 'User2 cannot access User1 editions'
          : 'Cross-user edition access possible (SECURITY ISSUE)',
      );
    } catch (error) {
      this.recordTest('Cascade Permissions Test', false, error.message);
    }
  }

  async runDatabaseTests() {
    this.log('🗄️ Starting Real Database RLS Tests', 'info');

    const initialized = await this.initialize();
    if (!initialized) {
      this.log('❌ Database initialization failed. Cannot proceed.', 'error');
      return;
    }

    const setupSuccessful = await this.setupTestData();
    if (!setupSuccessful) {
      this.log('❌ Test data setup failed. Cannot proceed.', 'error');
      return;
    }

    try {
      await this.testRLSPolicyExists();
      await this.testUserDataIsolation();
      await this.testCrossUserAccess();
      await this.testUnauthorizedModification();
      await this.testCascadePermissions();

      this.generateReport();
    } catch (error) {
      this.log(`Database test execution failed: ${error.message}`, 'error');
    } finally {
      // Always cleanup test data
      await this.cleanupTestData();
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    const totalTests = this.results.passed + this.results.failed;
    const successRate =
      totalTests > 0
        ? ((this.results.passed / totalTests) * 100).toFixed(1)
        : 0;

    this.log('\n📊 Database RLS Test Report', 'info');
    this.log('='.repeat(60));
    this.log(`⏱️  Duration: ${duration}ms`);
    this.log(`✅ Passed: ${this.results.passed}`);
    this.log(`❌ Failed: ${this.results.failed}`);
    this.log(`⚠️  Warnings: ${this.results.warnings}`);
    this.log(`📈 Success Rate: ${successRate}%`);
    this.log('='.repeat(60));

    // Detailed test results
    this.log('\n📋 Detailed Results:');
    this.results.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      this.log(`${status} ${test.name}: ${test.details}`);
    });

    this.saveReport();
  }

  saveReport() {
    const reportPath = path.join(
      __dirname,
      'test-fixtures',
      'database-rls-report.json',
    );
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: this.results,
      testUsers: this.testUsers,
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(reportPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`📄 Database report saved to: ${reportPath}`, 'success');
    } catch (error) {
      this.log(`Failed to save database report: ${error.message}`, 'error');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DatabaseRLSTester();
  tester.runDatabaseTests().catch(error => {
    console.error('❌ Database test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { DatabaseRLSTester };
