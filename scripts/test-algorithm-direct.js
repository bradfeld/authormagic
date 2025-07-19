#!/usr/bin/env node

/**
 * Direct Algorithm Performance Test
 *
 * Tests the edition grouping algorithm directly with saved baseline data,
 * bypassing API calls and external dependencies for pure algorithm performance measurement.
 */

// Simulated book data based on our baseline test cases
const BASELINE_DATA = {
  'Startup Life': {
    books: [
      {
        id: '9781118443644',
        title:
          'Startup Life: Surviving and Thriving in a Relationship with an Entrepreneur',
        isbn: '9781118443644',
        binding: 'hardcover',
      },
      {
        id: '9781118493861',
        title:
          'Startup Life Surviving and Thriving in a Relationship with an Entrepreneur',
        isbn: '9781118493861',
        binding: 'ebook',
      },
      {
        id: '9781118516867',
        title:
          'Startup Life: Surviving and Thriving in a Relationship with an Entrepreneur',
        isbn: '9781118516867',
        binding: 'ebook',
      },
      {
        id: '9781283950022',
        title: 'Startup Life',
        isbn: '9781283950022',
        binding: 'ebook',
      },
      {
        id: '9781531886042',
        title: 'Startup Life',
        isbn: '9781531886042',
        binding: 'audiobook',
      },
      {
        id: '9781480563865',
        title:
          'Startup Life: Surviving and Thriving in a Relationship with an Entrepreneur',
        isbn: '9781480563865',
        binding: 'audiobook',
      },
      {
        id: '9781480564480',
        title:
          'Startup Life: Surviving and Thriving in a Relationship with an Entrepreneur',
        isbn: '9781480564480',
        binding: 'audiobook',
      },
      {
        id: '9781118516850',
        title:
          'Startup life: surviving and thriving in a relationship with an entrepreneur',
        isbn: '9781118516850',
        binding: 'ebook',
      },
    ],
    expectedGroups: 1,
  },

  'Startup Opportunities': {
    books: [
      {
        id: '1',
        title: 'Startup Opportunities: Know When to Quit Your Day Job',
        isbn: '9781118565162',
        binding: 'hardcover',
      },
      {
        id: '2',
        title: 'Startup Opportunities: Know When to Quit Your Day Job',
        isbn: '9781118565162',
        binding: 'ebook',
      },
      {
        id: '3',
        title: 'Startup Opportunities: Know When to Quit Your Day Job',
        isbn: '9781118565162',
        binding: 'audiobook',
      },
      {
        id: '4',
        title: 'Do More Faster: Techstars Lessons to Accelerate Your Startup',
        isbn: '9780470929834',
        binding: 'hardcover',
      },
      {
        id: '5',
        title: 'Do More Faster: Techstars Lessons to Accelerate Your Startup',
        isbn: '9780470929834',
        binding: 'ebook',
      },
      {
        id: '6',
        title: 'Do More Faster: Techstars Lessons to Accelerate Your Startup',
        isbn: '9780470929834',
        binding: 'paperback',
      },
      {
        id: '7',
        title: 'Do More Faster: Techstars Lessons to Accelerate Your Startup',
        isbn: '9780470929834',
        binding: 'audiobook',
      },
    ],
    expectedGroups: 2,
  },

  'Venture Deals': {
    books: [
      // 1st Edition
      {
        id: '1',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist',
        isbn: '9780470929827',
        binding: 'hardcover',
        edition: '1',
      },
      {
        id: '2',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist',
        isbn: '9780470929827',
        binding: 'ebook',
        edition: '1',
      },
      {
        id: '3',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist',
        isbn: '9780470929827',
        binding: 'paperback',
        edition: '1',
      },
      {
        id: '4',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist',
        isbn: '9780470929827',
        binding: 'audiobook',
        edition: '1',
      },

      // 2nd Edition
      {
        id: '5',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 2nd Edition',
        isbn: '9781118443613',
        binding: 'hardcover',
        edition: '2',
      },
      {
        id: '6',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 2nd Edition',
        isbn: '9781118443613',
        binding: 'ebook',
        edition: '2',
      },
      {
        id: '7',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 2nd Edition',
        isbn: '9781118443613',
        binding: 'paperback',
        edition: '2',
      },
      {
        id: '8',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 2nd Edition',
        isbn: '9781118443613',
        binding: 'audiobook',
        edition: '2',
      },

      // 3rd Edition
      {
        id: '9',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 3rd Edition',
        isbn: '9781119259756',
        binding: 'hardcover',
        edition: '3',
      },
      {
        id: '10',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 3rd Edition',
        isbn: '9781119259756',
        binding: 'ebook',
        edition: '3',
      },
      {
        id: '11',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 3rd Edition',
        isbn: '9781119259756',
        binding: 'paperback',
        edition: '3',
      },
      {
        id: '12',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 3rd Edition',
        isbn: '9781119259756',
        binding: 'audiobook',
        edition: '3',
      },

      // 4th Edition
      {
        id: '13',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 4th Edition',
        isbn: '9781119594826',
        binding: 'hardcover',
        edition: '4',
      },
      {
        id: '14',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 4th Edition',
        isbn: '9781119594826',
        binding: 'ebook',
        edition: '4',
      },
      {
        id: '15',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 4th Edition',
        isbn: '9781119594826',
        binding: 'paperback',
        edition: '4',
      },
      {
        id: '16',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist, 4th Edition',
        isbn: '9781119594826',
        binding: 'audiobook',
        edition: '4',
      },

      // Mixed editions with variation
      {
        id: '17',
        title: 'Venture Deals',
        isbn: '9780470929827',
        binding: 'kindle',
        edition: '1',
      },
      {
        id: '18',
        title: 'Venture Deals 2nd Edition',
        isbn: '9781118443613',
        binding: 'ibooks',
        edition: '2',
      },
      {
        id: '19',
        title: 'Venture Deals Third Edition',
        isbn: '9781119259756',
        binding: 'epub',
        edition: '3',
      },
      {
        id: '20',
        title: 'Venture Deals (4th Edition)',
        isbn: '9781119594826',
        binding: 'pdf',
        edition: '4',
      },

      // Additional variations
      {
        id: '21',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist',
        isbn: null,
        binding: 'hardcover',
        edition: '1',
      },
      {
        id: '22',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist 2nd',
        isbn: null,
        binding: 'paperback',
        edition: '2',
      },
      {
        id: '23',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist (3rd)',
        isbn: null,
        binding: 'ebook',
        edition: '3',
      },
      {
        id: '24',
        title:
          'Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist Fourth Edition',
        isbn: null,
        binding: 'audiobook',
        edition: '4',
      },
      {
        id: '25',
        title: 'Venture Deals - Fourth Edition',
        isbn: '9781119594826',
        binding: 'hardcover',
        edition: '4',
      },
    ],
    expectedGroups: 4,
  },
};

/**
 * Simulated edition grouping algorithm
 * This is a placeholder that simulates the processing time of the actual algorithm
 * In a real implementation, this would import and call the actual edition detection service
 */
function simulateEditionGrouping(books) {
  const startTime = process.hrtime.bigint();

  // Simulate the complexity of the actual algorithm
  // This includes: title normalization, ISBN grouping, similarity calculations, etc.

  // Simulate O(n²) operations for similarity checking
  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      // Simulate title similarity calculation
      const similarity = Math.random(); // Placeholder

      // Simulate some processing
      if (similarity > 0.8) {
        // Group books
      }
    }
  }

  // Simulate ISBN-based grouping
  const isbnGroups = new Map();
  for (const book of books) {
    if (book.isbn) {
      if (!isbnGroups.has(book.isbn)) {
        isbnGroups.set(book.isbn, []);
      }
      isbnGroups.get(book.isbn).push(book);
    }
  }

  // Simulate final grouping logic
  const groups = [];

  // Group by ISBN first
  for (const [isbn, isbnBooks] of isbnGroups) {
    groups.push(isbnBooks);
  }

  // Add remaining books without ISBN
  const noIsbnBooks = books.filter(book => !book.isbn);
  if (noIsbnBooks.length > 0) {
    // Simulate grouping by title similarity
    for (const book of noIsbnBooks) {
      // Find best matching group or create new one
      let bestGroup = null;
      let bestSimilarity = 0;

      for (const group of groups) {
        const similarity = Math.random(); // Placeholder similarity
        if (similarity > bestSimilarity && similarity > 0.7) {
          bestSimilarity = similarity;
          bestGroup = group;
        }
      }

      if (bestGroup) {
        bestGroup.push(book);
      } else {
        groups.push([book]);
      }
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

  return {
    duration,
    groups,
    bookCount: books.length,
    groupCount: groups.length,
  };
}

/**
 * Test a single dataset
 */
function testDataset(name, data, iterations = 5) {
  console.log(`📖 Testing: ${name}`);
  console.log(
    `   Dataset: ${data.books.length} books → ${data.expectedGroups} expected groups`,
  );

  const results = [];

  for (let i = 0; i < iterations; i++) {
    const result = simulateEditionGrouping(data.books);
    results.push(result.duration);
  }

  // Calculate statistics
  const average = results.reduce((sum, d) => sum + d, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);
  const variance =
    results.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) /
    results.length;
  const stdDev = Math.sqrt(variance);

  console.log(
    `   Performance: ${average.toFixed(2)}ms (${min.toFixed(2)}-${max.toFixed(2)}ms, ±${stdDev.toFixed(1)}ms)`,
  );
  console.log(
    `   Expected groups: ${data.expectedGroups}, Books: ${data.books.length}\n`,
  );

  return {
    name,
    average: parseFloat(average.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    variation: parseFloat(stdDev.toFixed(1)),
    books: data.books.length,
    expectedGroups: data.expectedGroups,
  };
}

/**
 * Run all direct algorithm tests
 */
function runDirectAlgorithmTests(iterations = 5) {
  console.log(
    `🧪 Direct Algorithm Performance Test (${iterations} iterations)\n`,
  );
  console.log('⚠️  Note: This is a simulated version of the actual algorithm');
  console.log(
    '   Real implementation would import EditionDetectionService directly\n',
  );

  const results = [];

  for (const [name, data] of Object.entries(BASELINE_DATA)) {
    const result = testDataset(name, data, iterations);
    results.push(result);
  }

  // Summary
  console.log('📋 Summary:');
  results.forEach(result => {
    console.log(
      `${result.name}: ${result.average}ms ±${result.variation}ms (${result.books} books)`,
    );
  });

  const avgPerformance =
    results.reduce((sum, r) => sum + r.average, 0) / results.length;
  console.log(`\nAVERAGE: ${avgPerformance.toFixed(2)}ms\n`);

  return results;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
📖 Direct Algorithm Performance Test

USAGE:
  node scripts/test-algorithm-direct.js [OPTIONS]

OPTIONS:
  --iterations N      Number of iterations per test (default: 5)
  --help             Show this help message

DESCRIPTION:
  This script tests the edition grouping algorithm directly with pre-loaded
  book data, bypassing API calls and external dependencies to measure pure
  algorithm performance.

BASELINE DATA:
  - Startup Life: 8 books → 1 group (single book, multiple bindings)
  - Startup Opportunities: 7 books → 2 groups (two distinct books)
  - Venture Deals: 25 books → 4 groups (4 editions with multiple bindings)

NOTE:
  This is currently a simulation of the actual algorithm. To test the real
  algorithm, import and call EditionDetectionService.groupBooksIntoEditions()
  directly.
`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
    return;
  }

  const iterations = args.includes('--iterations')
    ? parseInt(args[args.indexOf('--iterations') + 1]) || 5
    : 5;

  runDirectAlgorithmTests(iterations);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  simulateEditionGrouping,
  testDataset,
  runDirectAlgorithmTests,
  BASELINE_DATA,
};
