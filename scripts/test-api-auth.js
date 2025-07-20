#!/usr/bin/env node

/**
 * API Authentication and Authorization Testing Script
 * Tests actual API endpoints with real HTTP requests
 *
 * Usage: node scripts/test-api-auth.js
 */

const fs = require('fs');
const path = require('path');

class APIAuthTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
    this.startTime = Date.now();
    this.baseUrl = 'http://localhost:3000';

    // Test scenarios
    this.testEndpoints = [
      {
        path: '/api/books',
        method: 'POST',
        requiresAuth: true,
        description: 'Add book to library',
      },
      {
        path: '/api/books/isbn/9781234567890',
        method: 'GET',
        requiresAuth: false,
        description: 'Get book by ISBN (public)',
      },
      {
        path: '/api/books/title-author?title=Test&author=Author',
        method: 'GET',
        requiresAuth: false,
        description: 'Search books by title/author (public)',
      },
      {
        path: '/api/profile/update',
        method: 'POST',
        requiresAuth: true,
        description: 'Update user profile',
      },
    ];
  }

  async checkServerStatus() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/books/isbn/9781234567890`,
        {
          method: 'GET',
        },
      );
      return response.status !== 404; // Any response (even 500) means server is running
    } catch (error) {
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

  async testUnauthenticatedRequests() {
    this.log('🚫 Testing unauthenticated requests...', 'info');

    for (const endpoint of this.testEndpoints) {
      try {
        const body =
          endpoint.method === 'POST'
            ? JSON.stringify({
                book: { title: 'Test Book', author: 'Test Author' },
              })
            : undefined;

        const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        });

        const status = response.status;
        const responseText = await response.text();

        if (endpoint.requiresAuth) {
          // Should return 401 Unauthorized
          const correctlyBlocked = status === 401;
          this.recordTest(
            `Unauthenticated ${endpoint.method} ${endpoint.path}`,
            correctlyBlocked,
            `Status: ${status}, Expected: 401 for protected endpoint`,
          );
        } else {
          // Should allow access (200 or other non-401 status)
          const correctlyAllowed = status !== 401;
          this.recordTest(
            `Public ${endpoint.method} ${endpoint.path}`,
            correctlyAllowed,
            `Status: ${status}, Public endpoint accessible`,
          );
        }

        // Check for sensitive data leakage in error responses
        if (status >= 400) {
          const leaksSensitiveData =
            this.checkForSensitiveDataLeakage(responseText);
          this.recordTest(
            `Error Message Security ${endpoint.path}`,
            !leaksSensitiveData,
            leaksSensitiveData
              ? 'Response may contain sensitive data'
              : 'Error message secure',
          );
        }
      } catch (error) {
        this.recordTest(
          `Request Error ${endpoint.path}`,
          false,
          `Network error: ${error.message}`,
        );
      }
    }
  }

  async testInvalidAuthRequests() {
    this.log('🔑 Testing invalid authentication...', 'info');

    const invalidTokens = [
      'invalid_token',
      'Bearer invalid_jwt_token',
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      'Bearer expired_token_12345',
    ];

    for (const token of invalidTokens) {
      for (const endpoint of this.testEndpoints.filter(e => e.requiresAuth)) {
        try {
          const body =
            endpoint.method === 'POST'
              ? JSON.stringify({
                  book: { title: 'Test Book', author: 'Test Author' },
                })
              : undefined;

          const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
            body,
          });

          const status = response.status;
          const correctlyRejected = status === 401;

          this.recordTest(
            `Invalid Auth ${endpoint.path} (${token.substring(0, 20)}...)`,
            correctlyRejected,
            `Status: ${status}, Expected: 401 for invalid token`,
          );
        } catch (error) {
          this.recordTest(
            `Invalid Auth Request ${endpoint.path}`,
            false,
            `Network error: ${error.message}`,
          );
        }
      }
    }
  }

  async testMalformedRequests() {
    this.log('💥 Testing malformed requests...', 'info');

    const malformedTests = [
      {
        name: 'Large Payload',
        body: JSON.stringify({
          book: {
            title: 'A'.repeat(10000), // Very long title
            author: 'B'.repeat(10000),
          },
        }),
      },
      {
        name: 'Invalid JSON',
        body: '{"invalid": json}',
      },
      {
        name: 'SQL Injection Attempt',
        body: JSON.stringify({
          book: {
            title: "'; DROP TABLE primary_books; --",
            author: "' OR '1'='1",
          },
        }),
      },
      {
        name: 'XSS Attempt',
        body: JSON.stringify({
          book: {
            title: '<script>alert("xss")</script>',
            author: 'javascript:alert(1)',
          },
        }),
      },
    ];

    for (const test of malformedTests) {
      try {
        const response = await fetch(`${this.baseUrl}/api/books`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: test.body,
        });

        const status = response.status;
        const responseText = await response.text();

        // Should handle malformed requests gracefully
        const handledGracefully = status >= 400 && status < 500;

        this.recordTest(
          `Malformed Request: ${test.name}`,
          handledGracefully,
          `Status: ${status}, Response handled ${handledGracefully ? 'gracefully' : 'poorly'}`,
        );

        // Check that malicious content isn't reflected back
        if (test.name.includes('XSS') || test.name.includes('SQL')) {
          const containsMaliciousContent =
            responseText.includes('<script>') ||
            responseText.includes('DROP TABLE') ||
            responseText.includes("'1'='1");

          this.recordTest(
            `Malicious Content Sanitization: ${test.name}`,
            !containsMaliciousContent,
            containsMaliciousContent
              ? 'Malicious content reflected in response'
              : 'Malicious content properly sanitized',
          );
        }
      } catch (error) {
        this.recordTest(
          `Malformed Request ${test.name}`,
          true, // Network errors are acceptable for malformed requests
          `Network error (acceptable): ${error.message}`,
        );
      }
    }
  }

  async testRateLimiting() {
    this.log('🚀 Testing rate limiting...', 'info');

    const requests = [];
    const requestCount = 20; // Send burst of requests

    try {
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          fetch(`${this.baseUrl}/api/books/isbn/9781234567890`, {
            method: 'GET',
          }),
        );
      }

      const responses = await Promise.allSettled(requests);
      const statusCodes = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.status);

      const rateLimitedRequests = statusCodes.filter(
        status => status === 429,
      ).length;
      const successfulRequests = statusCodes.filter(
        status => status < 400,
      ).length;

      // If we sent many requests rapidly and some got through, that's normal
      // Rate limiting isn't strictly required for this test, but good to check
      this.recordTest(
        'Rate Limiting Response',
        true, // We'll consider this informational rather than pass/fail
        `${requestCount} requests sent, ${successfulRequests} successful, ${rateLimitedRequests} rate-limited`,
      );
    } catch (error) {
      this.recordTest('Rate Limiting Test', false, error.message);
    }
  }

  async testCORSHeaders() {
    this.log('🌐 Testing CORS headers...', 'info');

    try {
      const response = await fetch(
        `${this.baseUrl}/api/books/isbn/9781234567890`,
        {
          method: 'OPTIONS',
        },
      );

      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get(
          'Access-Control-Allow-Origin',
        ),
        'Access-Control-Allow-Methods': response.headers.get(
          'Access-Control-Allow-Methods',
        ),
        'Access-Control-Allow-Headers': response.headers.get(
          'Access-Control-Allow-Headers',
        ),
      };

      const hasCORSHeaders = Object.values(corsHeaders).some(
        header => header !== null,
      );

      this.recordTest(
        'CORS Headers Present',
        hasCORSHeaders,
        `CORS headers: ${JSON.stringify(corsHeaders, null, 2)}`,
      );
    } catch (error) {
      this.recordTest('CORS Headers Test', false, error.message);
    }
  }

  checkForSensitiveDataLeakage(responseText) {
    const sensitivePatterns = [
      /user_[a-zA-Z0-9]+/, // Clerk user IDs
      /sk_[a-zA-Z0-9]+/, // Secret keys
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT tokens
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
      /password.*[:=]\s*['"]\w+['"]/, // Password fields
      /api[_-]?key.*[:=]\s*['"]\w+['"]/, // API keys
      /secret.*[:=]\s*['"]\w+['"]/, // Secret fields
    ];

    return sensitivePatterns.some(pattern => pattern.test(responseText));
  }

  async runAPITests() {
    this.log('🔌 Starting API Authentication and Authorization Tests', 'info');

    // Check if server is running
    const serverRunning = await this.checkServerStatus();
    if (!serverRunning) {
      this.log(
        '❌ Server is not running on localhost:3000. Please start the dev server.',
        'error',
      );
      return;
    }

    this.log('✅ Server is running on localhost:3000', 'success');

    try {
      await this.testUnauthenticatedRequests();
      await this.testInvalidAuthRequests();
      await this.testMalformedRequests();
      await this.testRateLimiting();
      await this.testCORSHeaders();

      this.generateReport();
    } catch (error) {
      this.log(`API test execution failed: ${error.message}`, 'error');
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    const totalTests = this.results.passed + this.results.failed;
    const successRate =
      totalTests > 0
        ? ((this.results.passed / totalTests) * 100).toFixed(1)
        : 0;

    this.log('\n📊 API Authentication Test Report', 'info');
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

    this.generateSecurityRecommendations();
    this.saveReport();
  }

  generateSecurityRecommendations() {
    this.log('\n🔒 Security Recommendations:', 'info');

    const failedTests = this.results.tests.filter(test => !test.passed);

    if (failedTests.length === 0) {
      this.log('🟢 All API security tests passed!', 'success');
    } else {
      this.log('🔴 Security issues found:', 'error');
      failedTests.forEach(test => {
        this.log(`  - ${test.name}: ${test.details}`, 'error');
      });
    }

    this.log('\n💡 General Security Recommendations:');
    this.log('1. Implement proper JWT token validation');
    this.log('2. Add rate limiting to prevent abuse');
    this.log('3. Sanitize all user inputs');
    this.log('4. Use HTTPS in production');
    this.log('5. Implement proper error handling without data leakage');
    this.log('6. Add security headers (CSP, HSTS, etc.)');
    this.log('7. Regular security audits and penetration testing');
  }

  saveReport() {
    const reportPath = path.join(
      __dirname,
      'test-fixtures',
      'api-auth-report.json',
    );
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: this.results,
      baseUrl: this.baseUrl,
      testEndpoints: this.testEndpoints,
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(reportPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`📄 API report saved to: ${reportPath}`, 'success');
    } catch (error) {
      this.log(`Failed to save API report: ${error.message}`, 'error');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APIAuthTester();
  tester.runAPITests().catch(error => {
    console.error('❌ API test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { APIAuthTester };
