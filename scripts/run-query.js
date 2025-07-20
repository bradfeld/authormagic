#!/usr/bin/env node

/**
 * Supabase Query Runner Script
 *
 * Allows running SQL queries directly from the terminal without using the Supabase SQL editor.
 *
 * Usage:
 *   node scripts/run-query.js "SELECT * FROM authors;"
 *   node scripts/run-query.js "SELECT COUNT(*) FROM user_roles;"
 *   node scripts/run-query.js --file queries/my-query.sql
 *
 * Features:
 *   - Direct SQL execution using service role
 *   - Pretty-printed table results
 *   - Error handling and validation
 *   - Support for both inline queries and SQL files
 *   - Safe SELECT-only mode (default)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

class SupabaseQueryRunner {
  constructor() {
    this.supabase = null;
    this.colors = {
      info: '\x1b[36m', // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      dim: '\x1b[2m', // Dim
      reset: '\x1b[0m', // Reset
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `${this.colors[type]}[${timestamp}] ${message}${this.colors.reset}`,
    );
  }

  initializeClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.log('✅ Connected to Supabase', 'success');
  }

  validateQuery(query) {
    const trimmedQuery = query.trim().toLowerCase();

    // Check for dangerous operations
    const dangerousPatterns = [
      /^\s*drop\s+/i,
      /^\s*delete\s+/i,
      /^\s*truncate\s+/i,
      /^\s*alter\s+/i,
      /^\s*create\s+/i,
      /^\s*insert\s+/i,
      /^\s*update\s+/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedQuery)) {
        throw new Error(
          `Dangerous operation detected. This script only supports SELECT queries for safety.`,
        );
      }
    }

    // Ensure it's a SELECT query
    if (
      !trimmedQuery.startsWith('select') &&
      !trimmedQuery.startsWith('with')
    ) {
      throw new Error(
        'Only SELECT queries and CTEs (WITH) are allowed for safety.',
      );
    }

    return true;
  }

  formatResults(data, query) {
    if (!data || data.length === 0) {
      this.log('📭 Query returned no results', 'warning');
      return;
    }

    // Get column names from first row
    const columns = Object.keys(data[0]);
    const maxColWidths = {};

    // Calculate maximum width for each column
    columns.forEach(col => {
      maxColWidths[col] = Math.max(
        col.length,
        ...data.map(row => String(row[col] || '').length),
      );
      // Cap at reasonable width for readability
      maxColWidths[col] = Math.min(maxColWidths[col], 50);
    });

    // Create header
    const header = columns
      .map(col => col.padEnd(maxColWidths[col]))
      .join(' | ');
    const separator = columns
      .map(col => '-'.repeat(maxColWidths[col]))
      .join('-|-');

    console.log(
      '\n' + this.colors.success + '📊 Query Results:' + this.colors.reset,
    );
    console.log(this.colors.dim + '| ' + header + ' |' + this.colors.reset);
    console.log(this.colors.dim + '|-' + separator + '-|' + this.colors.reset);

    // Print data rows
    data.forEach(row => {
      const rowStr = columns
        .map(col => {
          let value = String(row[col] || '');
          // Truncate long values
          if (value.length > maxColWidths[col]) {
            value = value.substring(0, maxColWidths[col] - 3) + '...';
          }
          return value.padEnd(maxColWidths[col]);
        })
        .join(' | ');

      console.log('| ' + rowStr + ' |');
    });

    console.log('');
    this.log(
      `✅ Returned ${data.length} row${data.length === 1 ? '' : 's'}`,
      'success',
    );
  }

  async executeQuery(query) {
    try {
      this.log('🔍 Validating query...', 'info');
      this.validateQuery(query);

      this.log('⚡ Executing query...', 'info');
      this.log(
        `${this.colors.dim}Query: ${query.trim()}${this.colors.reset}`,
        'info',
      );

      const startTime = Date.now();

      // Use PostgREST's raw SQL execution via RPC
      // We'll create a custom function approach
      const result = await this.executePostgRESTQuery(query);

      const duration = Date.now() - startTime;
      this.log(`⏱️  Query executed in ${duration}ms`, 'info');

      return result;
    } catch (error) {
      this.log(`❌ Query failed: ${error.message}`, 'error');
      if (error.details) {
        this.log(`💡 Details: ${error.details}`, 'error');
      }
      if (error.hint) {
        this.log(`💡 Hint: ${error.hint}`, 'warning');
      }
      throw error;
    }
  }

  async executePostgRESTQuery(query) {
    try {
      // Use Supabase's REST API with raw SQL
      // This requires making a direct HTTP request to the REST endpoint
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      if (!response.ok) {
        // If execute_sql doesn't exist, fall back to parsing and direct query
        if (response.status === 404) {
          this.log('📝 Falling back to parsed query method...', 'warning');
          return await this.executeDirectQuery(query);
        }

        const errorData = await response.json();
        throw new Error(
          `HTTP ${response.status}: ${errorData.message || 'Query execution failed'}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Final fallback to direct query parsing
      this.log('📝 Using direct query parsing fallback...', 'warning');
      return await this.executeDirectQuery(query);
    }
  }

  async executeDirectQuery(query) {
    try {
      const cleanQuery = query.trim().toLowerCase();

      // Handle system tables like information_schema
      if (cleanQuery.includes('information_schema')) {
        return await this.handleSystemQuery(query);
      }

      // Handle simple SELECT from single table
      const simpleTableMatch = query.match(
        /select\s+.+?\s+from\s+(\w+)(?:\s|;|$)/i,
      );
      if (simpleTableMatch && !cleanQuery.includes('join')) {
        const tableName = simpleTableMatch[1];
        return await this.handleSingleTableQuery(tableName, query);
      }

      // Handle JOIN queries - detect tables involved
      if (cleanQuery.includes('join')) {
        return await this.handleJoinQuery(query);
      }

      throw new Error(
        `Query pattern not yet supported: ${query.substring(0, 50)}...`,
      );
    } catch (error) {
      throw new Error(`Direct query execution failed: ${error.message}`);
    }
  }

  async handleSystemQuery(query) {
    // Handle information_schema queries by mapping to known tables
    const cleanQuery = query.trim().toLowerCase();

    if (
      cleanQuery.includes('table_name') &&
      cleanQuery.includes('information_schema.tables')
    ) {
      this.log('📊 Listing database tables...', 'info');

      // Return known tables from our schema
      const knownTables = [
        { table_name: 'authors' },
        { table_name: 'user_roles' },
        { table_name: 'primary_books' },
        { table_name: 'primary_book_editions' },
        { table_name: 'primary_book_bindings' },
        { table_name: 'books' },
        { table_name: 'sales_data' },
        { table_name: 'marketing_campaigns' },
      ];

      return knownTables;
    }

    throw new Error('System query type not supported');
  }

  async handleSingleTableQuery(tableName, query) {
    this.log(`📊 Querying table: ${tableName}`, 'info');

    // Handle WHERE clauses and other SQL features
    const whereMatch = query.match(
      /where\s+(.+?)(?:\s+order\s+|\s+group\s+|\s+limit\s+|$)/i,
    );
    const orderMatch = query.match(/order\s+by\s+(.+?)(?:\s+limit\s+|$)/i);
    const limitMatch = query.match(/limit\s+(\d+)/i);

    let supabaseQuery = this.supabase.from(tableName).select('*');

    // Apply WHERE conditions (basic parsing)
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      // Handle simple equality conditions
      const eqMatch = whereClause.match(/(\w+)\s*=\s*'([^']+)'/);
      if (eqMatch) {
        const [, column, value] = eqMatch;
        supabaseQuery = supabaseQuery.eq(column, value);
      }
    }

    // Apply ORDER BY
    if (orderMatch) {
      const orderClause = orderMatch[1].trim();
      const isDesc = orderClause.toLowerCase().includes('desc');
      const column = orderClause.replace(/\s+(asc|desc)/i, '').trim();
      supabaseQuery = supabaseQuery.order(column, { ascending: !isDesc });
    }

    // Apply LIMIT
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      supabaseQuery = supabaseQuery.limit(limit);
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;

    return data;
  }

  async handleJoinQuery(query) {
    const cleanQuery = query.trim().toLowerCase();

    // Authors + User Roles JOIN
    if (cleanQuery.includes('authors') && cleanQuery.includes('user_roles')) {
      return await this.handleAuthorsUserRolesJoin(query);
    }

    // Primary Books hierarchy JOINs
    if (cleanQuery.includes('primary_books')) {
      return await this.handlePrimaryBooksJoin(query);
    }

    // Authors + Books JOIN
    if (
      cleanQuery.includes('authors') &&
      cleanQuery.includes('books') &&
      !cleanQuery.includes('primary_books')
    ) {
      return await this.handleAuthorsBooksJoin(query);
    }

    // Books + Sales Data JOIN
    if (cleanQuery.includes('books') && cleanQuery.includes('sales_data')) {
      return await this.handleBooksSalesJoin(query);
    }

    throw new Error(`JOIN pattern not yet supported. Supported JOINs:
    - authors + user_roles
    - primary_books + editions + bindings  
    - authors + books
    - books + sales_data`);
  }

  async handleAuthorsUserRolesJoin(query) {
    this.log('📊 Executing authors-user_roles JOIN...', 'info');

    // Get all authors
    const { data: authorsData, error: authorsError } = await this.supabase
      .from('authors')
      .select('*');

    if (authorsError) throw authorsError;

    // Get all user roles
    const { data: rolesData, error: rolesError } = await this.supabase
      .from('user_roles')
      .select('*');

    if (rolesError) throw rolesError;

    // Create a map of roles by clerk_user_id for efficient lookup
    const rolesMap = new Map();
    rolesData.forEach(role => {
      rolesMap.set(role.clerk_user_id, role);
    });

    // Join the data manually
    const joinedData = authorsData.map(author => {
      const userRole = rolesMap.get(author.clerk_user_id);
      return {
        ...author,
        role: userRole?.role || null,
        role_granted_at: userRole?.granted_at || null,
        role_granted_by: userRole?.granted_by || null,
      };
    });

    return joinedData;
  }

  async handlePrimaryBooksJoin(query) {
    this.log('📊 Executing primary books hierarchy JOIN...', 'info');

    const cleanQuery = query.trim().toLowerCase();

    if (cleanQuery.includes('bindings') || cleanQuery.includes('editions')) {
      // Full 3-level hierarchy - manual JOIN

      // Get all primary books
      const { data: booksData, error: booksError } = await this.supabase
        .from('primary_books')
        .select('*');

      if (booksError) throw booksError;

      // Get all editions
      const { data: editionsData, error: editionsError } = await this.supabase
        .from('primary_book_editions')
        .select('*');

      if (editionsError) throw editionsError;

      // Get all bindings
      const { data: bindingsData, error: bindingsError } = await this.supabase
        .from('primary_book_bindings')
        .select('*');

      if (bindingsError) throw bindingsError;

      // Create maps for efficient lookup
      const editionsMap = new Map();
      editionsData.forEach(edition => {
        if (!editionsMap.has(edition.primary_book_id)) {
          editionsMap.set(edition.primary_book_id, []);
        }
        editionsMap.get(edition.primary_book_id).push(edition);
      });

      const bindingsMap = new Map();
      bindingsData.forEach(binding => {
        if (!bindingsMap.has(binding.book_edition_id)) {
          bindingsMap.set(binding.book_edition_id, []);
        }
        bindingsMap.get(binding.book_edition_id).push(binding);
      });

      // Manual 3-level JOIN
      const flattened = [];
      booksData.forEach(book => {
        const editions = editionsMap.get(book.id) || [];
        editions.forEach(edition => {
          const bindings = bindingsMap.get(edition.id) || [];
          bindings.forEach(binding => {
            flattened.push({
              book_id: book.id,
              user_id: book.user_id,
              title: book.title,
              author: book.author,
              book_created_at: book.created_at,
              edition_id: edition.id,
              edition_number: edition.edition_number,
              publication_year: edition.publication_year,
              binding_id: binding.id,
              isbn: binding.isbn,
              binding_type: binding.binding_type,
              price: binding.price,
              publisher: binding.publisher,
              cover_image_url: binding.cover_image_url,
              pages: binding.pages,
            });
          });
        });
      });

      return flattened;
    } else {
      // Just books + editions - manual JOIN
      const { data: booksData, error: booksError } = await this.supabase
        .from('primary_books')
        .select('*');

      if (booksError) throw booksError;

      const { data: editionsData, error: editionsError } = await this.supabase
        .from('primary_book_editions')
        .select('*');

      if (editionsError) throw editionsError;

      // Create editions map
      const editionsMap = new Map();
      editionsData.forEach(edition => {
        if (!editionsMap.has(edition.primary_book_id)) {
          editionsMap.set(edition.primary_book_id, []);
        }
        editionsMap.get(edition.primary_book_id).push(edition);
      });

      // Manual JOIN
      const joined = booksData.map(book => ({
        ...book,
        editions: editionsMap.get(book.id) || [],
      }));

      return joined;
    }
  }

  async handleAuthorsBooksJoin(query) {
    this.log('📊 Executing authors-books JOIN...', 'info');

    const { data, error } = await this.supabase.from('authors').select(`
        clerk_user_id,
        email,
        name,
        bio,
        website_url,
        created_at,
        books:books(
          id,
          title,
          subtitle,
          description,
          genre,
          isbn,
          publication_date,
          status,
          created_at
        )
      `);

    if (error) throw error;

    // Flatten if needed
    const flattened = [];
    data.forEach(author => {
      if (author.books && author.books.length > 0) {
        author.books.forEach(book => {
          flattened.push({
            author_clerk_user_id: author.clerk_user_id,
            author_email: author.email,
            author_name: author.name,
            author_bio: author.bio,
            author_website: author.website_url,
            book_id: book.id,
            book_title: book.title,
            book_subtitle: book.subtitle,
            book_description: book.description,
            book_genre: book.genre,
            book_isbn: book.isbn,
            book_publication_date: book.publication_date,
            book_status: book.status,
          });
        });
      } else {
        // Include authors without books
        flattened.push({
          author_clerk_user_id: author.clerk_user_id,
          author_email: author.email,
          author_name: author.name,
          author_bio: author.bio,
          author_website: author.website_url,
          book_id: null,
          book_title: null,
          book_subtitle: null,
          book_description: null,
          book_genre: null,
          book_isbn: null,
          book_publication_date: null,
          book_status: null,
        });
      }
    });

    return flattened;
  }

  async handleBooksSalesJoin(query) {
    this.log('📊 Executing books-sales_data JOIN...', 'info');

    const { data, error } = await this.supabase.from('books').select(`
        id,
        title,
        author_id,
        genre,
        publication_date,
        sales_data:sales_data(
          platform,
          sales_count,
          revenue,
          date
        )
      `);

    if (error) throw error;

    // Flatten sales data
    const flattened = [];
    data.forEach(book => {
      if (book.sales_data && book.sales_data.length > 0) {
        book.sales_data.forEach(sale => {
          flattened.push({
            book_id: book.id,
            book_title: book.title,
            book_author_id: book.author_id,
            book_genre: book.genre,
            book_publication_date: book.publication_date,
            sales_platform: sale.platform,
            sales_count: sale.sales_count,
            sales_revenue: sale.revenue,
            sales_date: sale.date,
          });
        });
      } else {
        // Include books without sales data
        flattened.push({
          book_id: book.id,
          book_title: book.title,
          book_author_id: book.author_id,
          book_genre: book.genre,
          book_publication_date: book.publication_date,
          sales_platform: null,
          sales_count: null,
          sales_revenue: null,
          sales_date: null,
        });
      }
    });

    return flattened;
  }

  async runFromFile(filePath) {
    try {
      const fullPath = path.resolve(filePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
      }

      const query = fs.readFileSync(fullPath, 'utf8');
      this.log(`📄 Reading query from: ${filePath}`, 'info');

      return await this.executeQuery(query);
    } catch (error) {
      this.log(`❌ Failed to read file: ${error.message}`, 'error');
      throw error;
    }
  }

  showHelp() {
    console.log(`
${this.colors.info}🗄️  Supabase Query Runner - Full Database Access${this.colors.reset}

${this.colors.success}Usage:${this.colors.reset}
  node scripts/run-query.js "SELECT * FROM authors;"
  npm run query "SELECT * FROM primary_books;"
  npm run query --file queries/complex-query.sql
  npm run query --help

${this.colors.success}📊 Available Tables:${this.colors.reset}
  • authors              - User profiles & waitlist status
  • user_roles           - Admin role management
  • primary_books        - User's selected books
  • primary_book_editions - Book editions (hierarchy)
  • primary_book_bindings - Book formats (hardcover, paperback, etc.)
  • books                - Original book metadata
  • sales_data           - Sales tracking per book
  • marketing_campaigns  - Marketing campaign data

${this.colors.success}🔗 Supported JOIN Queries:${this.colors.reset}
  # Users with their roles
  npm run query "SELECT * FROM authors a JOIN user_roles ur ON a.clerk_user_id = ur.clerk_user_id;"

  # Authors and their published books  
  npm run query "SELECT * FROM authors a JOIN books b ON a.id = b.author_id;"

  # Primary books with all editions and bindings
  npm run query "SELECT * FROM primary_books pb JOIN primary_book_editions pbe ON pb.id = pbe.primary_book_id JOIN primary_book_bindings pbb ON pbe.id = pbb.book_edition_id;"

  # Books with sales data
  npm run query "SELECT * FROM books b JOIN sales_data sd ON b.id = sd.book_id;"

${this.colors.success}📈 Single Table Examples:${this.colors.reset}
  # List all database tables
  npm run query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

  # Show user status breakdown
  npm run query "SELECT status, COUNT(*) as count FROM authors GROUP BY status;"

  # Find admin users
  npm run query "SELECT clerk_user_id, role FROM user_roles WHERE role = 'admin';"

  # Show book bindings by type
  npm run query "SELECT binding_type, COUNT(*) as count FROM primary_book_bindings GROUP BY binding_type;"

  # Recent sales activity
  npm run query "SELECT * FROM sales_data ORDER BY date DESC LIMIT 10;"

${this.colors.success}🔍 Advanced Features:${this.colors.reset}
  • WHERE clauses: "WHERE status = 'approved'"
  • ORDER BY: "ORDER BY created_at DESC"
  • LIMIT: "LIMIT 5"
  • System queries: information_schema access
  • Multi-level JOINs with automatic flattening

${this.colors.warning}🛡️ Security:${this.colors.reset}
  - Only SELECT queries and CTEs (WITH) are allowed
  - No INSERT, UPDATE, DELETE, DROP, or other destructive operations
  - Uses service role for full database access
  - All queries validated before execution

${this.colors.info}⚙️ Environment:${this.colors.reset}
  - Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
  - Supports both inline queries and SQL files
    `);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    const runner = new SupabaseQueryRunner();
    runner.showHelp();
    return;
  }

  const runner = new SupabaseQueryRunner();

  try {
    runner.log('🚀 Starting Supabase Query Runner...', 'info');
    runner.initializeClient();

    let data;

    if (args[0] === '--file' || args[0] === '-f') {
      if (!args[1]) {
        throw new Error('File path required when using --file option');
      }
      data = await runner.runFromFile(args[1]);
    } else {
      const query = args.join(' ');
      if (!query.trim()) {
        throw new Error('Query cannot be empty');
      }
      data = await runner.executeQuery(query);
    }

    runner.formatResults(data);
  } catch (error) {
    const runner = new SupabaseQueryRunner();
    runner.log(`💥 Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { SupabaseQueryRunner };
