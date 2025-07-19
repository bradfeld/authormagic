#!/usr/bin/env node

/**
 * Edition Grouping Performance & Correctness Test
 *
 * Tests the book edition grouping algorithm with multiple scenarios:
 * - Dual baseline testing (cache-busted vs fully cached)
 * - Correctness validation (expected vs actual results)
 * - Statistical analysis with multiple iterations
 * - Manual true non-cached testing support
 */

const https = require('https');
const http = require('http');

// Test cases with expected results
const TEST_CASES = [
  {
    name: 'Startup Life',
    title: 'Startup Life',
    author: 'Brad Feld',
    expectedBooks: 8,
    expectedGroups: 1,
    description: 'Single book, multiple bindings (hardcover, ebook, audiobook)',
  },
  {
    name: 'Startup Opportunities',
    title: 'Startup Opportunities',
    author: 'Brad Feld',
    expectedBooks: 7,
    expectedGroups: 2,
    description: 'Two distinct books with similar titles',
  },
  {
    name: 'Venture Deals',
    title: 'Venture Deals',
    author: 'Brad Feld',
    expectedBooks: 25,
    expectedGroups: 4,
    description: 'Multiple editions (1st, 2nd, 3rd, 4th) with various bindings',
  },
];

const BASE_URL = 'http://localhost:3000';

/**
 * Create a cache-busting URL to simulate fresh API calls
 */
function createCacheBustingUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set('_cacheBust', Date.now() + Math.random());
  return url.toString();
}

/**
 * Make HTTP request and measure performance
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Performance-Test-Script',
      },
    };

    const request = http.request(options, response => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        try {
          const result = JSON.parse(data);
          resolve({
            duration,
            data: result,
            statusCode: response.statusCode,
          });
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    });

    request.on('error', error => {
      reject(new Error(`Request error: ${error.message}`));
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });

    request.end();
  });
}

/**
 * Test a single case with performance measurement
 */
async function testSingleCase(testCase, cacheBusting = false, iterations = 1) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    try {
      const baseUrl = `${BASE_URL}/api/books/title-author?title=${encodeURIComponent(testCase.title)}&author=${encodeURIComponent(testCase.author)}`;
      const url = cacheBusting ? createCacheBustingUrl(baseUrl) : baseUrl;

      const result = await makeRequest(url);

      if (result.statusCode !== 200) {
        throw new Error(`HTTP ${result.statusCode}: ${result.data}`);
      }

      if (!result.data.success) {
        throw new Error(`API Error: ${JSON.stringify(result.data)}`);
      }

      results.push({
        duration: result.duration,
        books: result.data.books?.length || 0,
        editionGroups: result.data.editionGroups?.length || 0,
        iteration: i + 1,
      });

      // Small delay between iterations to avoid overwhelming the server
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Error in iteration ${i + 1}:`, error.message);
      results.push({
        duration: null,
        books: 0,
        editionGroups: 0,
        iteration: i + 1,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Calculate statistics from multiple test results
 */
function calculateStats(results) {
  const validResults = results.filter(r => r.duration !== null && !r.error);

  if (validResults.length === 0) {
    return {
      average: null,
      min: null,
      max: null,
      variation: null,
      successRate: 0,
      validSamples: 0,
    };
  }

  const durations = validResults.map(r => r.duration);
  const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const variance =
    durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) /
    durations.length;
  const stdDev = Math.sqrt(variance);

  return {
    average: parseFloat(average.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    variation: parseFloat(stdDev.toFixed(1)),
    successRate: (validResults.length / results.length) * 100,
    validSamples: validResults.length,
    books: validResults[0].books,
    editionGroups: validResults[0].editionGroups,
  };
}

/**
 * Run correctness tests
 */
async function runCorrectnessTests() {
  console.log('🔍 Running Correctness Tests...\n');

  let allPassed = true;

  for (const testCase of TEST_CASES) {
    try {
      const results = await testSingleCase(testCase, false, 1);
      const result = results[0];

      if (result.error) {
        console.log(`❌ ${testCase.name}: ERROR - ${result.error}`);
        allPassed = false;
        continue;
      }

      const booksCorrect = result.books === testCase.expectedBooks;
      const groupsCorrect = result.editionGroups === testCase.expectedGroups;

      if (booksCorrect && groupsCorrect) {
        console.log(
          `✅ ${testCase.name}: PASS - ${result.books} books, ${result.editionGroups} groups`,
        );
      } else {
        console.log(`❌ ${testCase.name}: FAIL`);
        console.log(
          `   Expected: ${testCase.expectedBooks} books, ${testCase.expectedGroups} groups`,
        );
        console.log(
          `   Actual:   ${result.books} books, ${result.editionGroups} groups`,
        );
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
      allPassed = false;
    }
  }

  console.log(
    `\n📊 Correctness Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`,
  );
  return allPassed;
}

/**
 * Run performance tests
 */
async function runPerformanceTests(iterations = 3) {
  console.log(`🚀 Running Performance Tests (${iterations} iterations)...\n`);

  for (const testCase of TEST_CASES) {
    console.log(`📖 Testing: ${testCase.name}`);
    console.log(`   ${testCase.description}`);

    try {
      // Cache-busted test
      const cacheBustedResults = await testSingleCase(
        testCase,
        true,
        iterations,
      );
      const cacheBustedStats = calculateStats(cacheBustedResults);

      // Small delay between test types
      await new Promise(resolve => setTimeout(resolve, 200));

      // Fully cached test
      const cachedResults = await testSingleCase(testCase, false, iterations);
      const cachedStats = calculateStats(cachedResults);

      // Display results
      console.log(
        `   Cache-Busted: ${cacheBustedStats.average}ms (${cacheBustedStats.min}-${cacheBustedStats.max}ms, ±${cacheBustedStats.variation}ms)`,
      );
      console.log(
        `   Fully Cached: ${cachedStats.average}ms (${cachedStats.min}-${cachedStats.max}ms, ±${cachedStats.variation}ms)`,
      );
      console.log(
        `   Books: ${cacheBustedStats.books}, Groups: ${cacheBustedStats.editionGroups}`,
      );
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

/**
 * Run dual baseline test (both cache-busted and cached)
 */
async function runDualBaselineTest(iterations = 3) {
  console.log(
    `📊 Running Dual Baseline Performance Test (${iterations} iterations)...\n`,
  );

  const results = [];

  for (const testCase of TEST_CASES) {
    console.log(`📖 ${testCase.name}:`);

    try {
      // Cache-busted performance
      const cacheBustedResults = await testSingleCase(
        testCase,
        true,
        iterations,
      );
      const cacheBustedStats = calculateStats(cacheBustedResults);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Cached performance
      const cachedResults = await testSingleCase(testCase, false, iterations);
      const cachedStats = calculateStats(cachedResults);

      console.log(
        `   Cache-Busted: ${cacheBustedStats.average}ms ±${cacheBustedStats.variation}ms`,
      );
      console.log(
        `   Fully Cached: ${cachedStats.average}ms ±${cachedStats.variation}ms`,
      );
      console.log('');

      results.push({
        testCase: testCase.name,
        cacheBusted: cacheBustedStats,
        cached: cachedStats,
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Summary
  console.log('📋 Summary:');
  results.forEach(result => {
    console.log(
      `${result.testCase}: ${result.cacheBusted.average}ms → ${result.cached.average}ms`,
    );
  });

  const avgCacheBusted =
    results.reduce((sum, r) => sum + r.cacheBusted.average, 0) / results.length;
  const avgCached =
    results.reduce((sum, r) => sum + r.cached.average, 0) / results.length;
  console.log(
    `\nAVERAGE: ${avgCacheBusted.toFixed(2)}ms → ${avgCached.toFixed(2)}ms\n`,
  );
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
📖 Edition Grouping Performance & Correctness Test

USAGE:
  node scripts/test-edition-performance.js [OPTIONS]

OPTIONS:
  --dual-baseline     Run both cache-busted and cached performance tests
  --performance-only  Run only performance tests (default)
  --correctness-only  Run only correctness validation tests
  --true-non-cached   Manual true non-cached test (requires server restarts)
  --iterations N      Number of iterations per test (default: 3)
  --help             Show this help message

EXAMPLES:
  # Run dual baseline test
  node scripts/test-edition-performance.js --dual-baseline

  # Run 5 iterations of performance tests
  node scripts/test-edition-performance.js --performance-only --iterations 5

  # Validate correctness only
  node scripts/test-edition-performance.js --correctness-only

TEST DEFINITIONS:
  - Cache-Busted: Fresh URL parameters + algorithm processing
  - Fully Cached: Same URL + cached API data (pure algorithm)
  - True Non-Cached: First-time API calls (requires manual server restart)

BASELINE TARGETS:
  - Startup Life: 8 books → 1 group
  - Startup Opportunities: 7 books → 2 groups  
  - Venture Deals: 25 books → 4 groups
`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
    return;
  }

  const iterations = args.includes('--iterations')
    ? parseInt(args[args.indexOf('--iterations') + 1]) || 3
    : 3;

  console.log('🧪 Edition Grouping Algorithm Test Suite\n');

  if (args.includes('--true-non-cached')) {
    console.log('⚠️  TRUE NON-CACHED TEST MODE');
    console.log('   This requires manual server restarts between tests');
    console.log('   1. Run: npm run dev');
    console.log('   2. Test first book');
    console.log('   3. Stop server (Ctrl+C)');
    console.log('   4. Restart server');
    console.log('   5. Test next book');
    console.log(
      '   Please run this manually for accurate first-time measurements.\n',
    );
    return;
  }

  if (args.includes('--correctness-only')) {
    await runCorrectnessTests();
  } else if (args.includes('--dual-baseline')) {
    await runDualBaselineTest(iterations);
  } else {
    // Default: performance-only
    await runPerformanceTests(iterations);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test script error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testSingleCase,
  calculateStats,
  runCorrectnessTests,
  runPerformanceTests,
  runDualBaselineTest,
  TEST_CASES,
};
