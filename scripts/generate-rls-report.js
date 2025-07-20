#!/usr/bin/env node

/**
 * Comprehensive RLS and Authentication Report Generator
 * Combines all test results and generates final security assessment
 *
 * Usage: node scripts/generate-rls-report.js
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveReportGenerator {
  constructor() {
    this.reportData = {
      mockTests: null,
      databaseTests: null,
      apiTests: null,
      summary: {
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        totalWarnings: 0,
        overallScore: 0,
      },
      securityFindings: [],
      recommendations: [],
      timestamp: new Date().toISOString(),
    };
  }

  log(message, type = 'info') {
    const prefix =
      {
        info: '📋',
        success: '✅',
        error: '❌',
        warning: '⚠️',
      }[type] || '📋';

    console.log(`${prefix} ${message}`);
  }

  async loadTestResults() {
    const testFixturesDir = path.join(__dirname, 'test-fixtures');

    try {
      // Load mock test results
      const mockTestPath = path.join(testFixturesDir, 'rls-auth-report.json');
      if (fs.existsSync(mockTestPath)) {
        this.reportData.mockTests = JSON.parse(
          fs.readFileSync(mockTestPath, 'utf8'),
        );
        this.log('✅ Loaded mock test results', 'success');
      } else {
        this.log('⚠️ Mock test results not found', 'warning');
      }

      // Load database test results
      const dbTestPath = path.join(testFixturesDir, 'database-rls-report.json');
      if (fs.existsSync(dbTestPath)) {
        this.reportData.databaseTests = JSON.parse(
          fs.readFileSync(dbTestPath, 'utf8'),
        );
        this.log('✅ Loaded database test results', 'success');
      } else {
        this.log('⚠️ Database test results not found', 'warning');
      }

      // Load API test results
      const apiTestPath = path.join(testFixturesDir, 'api-auth-report.json');
      if (fs.existsSync(apiTestPath)) {
        this.reportData.apiTests = JSON.parse(
          fs.readFileSync(apiTestPath, 'utf8'),
        );
        this.log('✅ Loaded API test results', 'success');
      } else {
        this.log('⚠️ API test results not found', 'warning');
      }
    } catch (error) {
      this.log(`Error loading test results: ${error.message}`, 'error');
    }
  }

  calculateSummary() {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    if (this.reportData.mockTests) {
      totalTests +=
        this.reportData.mockTests.summary.passed +
        this.reportData.mockTests.summary.failed;
      totalPassed += this.reportData.mockTests.summary.passed;
      totalFailed += this.reportData.mockTests.summary.failed;
      totalWarnings += this.reportData.mockTests.summary.warnings;
    }

    if (this.reportData.databaseTests) {
      totalTests +=
        this.reportData.databaseTests.summary.passed +
        this.reportData.databaseTests.summary.failed;
      totalPassed += this.reportData.databaseTests.summary.passed;
      totalFailed += this.reportData.databaseTests.summary.failed;
      totalWarnings += this.reportData.databaseTests.summary.warnings;
    }

    if (this.reportData.apiTests) {
      totalTests +=
        this.reportData.apiTests.summary.passed +
        this.reportData.apiTests.summary.failed;
      totalPassed += this.reportData.apiTests.summary.passed;
      totalFailed += this.reportData.apiTests.summary.failed;
      totalWarnings += this.reportData.apiTests.summary.warnings;
    }

    this.reportData.summary = {
      totalTests,
      totalPassed,
      totalFailed,
      totalWarnings,
      overallScore:
        totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0,
    };
  }

  analyzeSecurityFindings() {
    this.reportData.securityFindings = [];

    // Critical findings from API tests
    if (this.reportData.apiTests) {
      const failedApiTests =
        this.reportData.apiTests.summary.tests?.filter(t => !t.passed) || [];

      if (failedApiTests.some(t => t.name.includes('Unauthenticated'))) {
        this.reportData.securityFindings.push({
          severity: 'CRITICAL',
          category: 'Authentication',
          finding:
            'API endpoints returning 500 errors instead of 401 for unauthenticated requests',
          impact:
            'Authentication system may be misconfigured, potentially allowing unauthorized access',
          recommendation:
            'Fix Clerk authentication integration to properly return 401 status codes',
        });
      }

      if (failedApiTests.some(t => t.name.includes('Invalid Auth'))) {
        this.reportData.securityFindings.push({
          severity: 'HIGH',
          category: 'Authorization',
          finding: 'Invalid authentication tokens causing server errors',
          impact:
            'Server errors may leak information or indicate unstable authentication',
          recommendation: 'Implement proper JWT validation and error handling',
        });
      }

      if (failedApiTests.some(t => t.name.includes('Malformed Request'))) {
        this.reportData.securityFindings.push({
          severity: 'MEDIUM',
          category: 'Input Validation',
          finding:
            'Malformed requests causing server errors instead of proper validation errors',
          impact:
            'Poor error handling may lead to service disruption or information disclosure',
          recommendation:
            'Add input validation and proper error handling for malformed requests',
        });
      }

      if (failedApiTests.some(t => t.name.includes('CORS'))) {
        this.reportData.securityFindings.push({
          severity: 'LOW',
          category: 'Configuration',
          finding: 'CORS headers not properly configured',
          impact: 'May cause issues with web application functionality',
          recommendation:
            'Configure proper CORS headers for production deployment',
        });
      }
    }

    // Database RLS findings
    if (this.reportData.databaseTests) {
      const failedDbTests =
        this.reportData.databaseTests.summary.tests?.filter(t => !t.passed) ||
        [];

      if (failedDbTests.some(t => t.name.includes('Unauthorized Update'))) {
        this.reportData.securityFindings.push({
          severity: 'HIGH',
          category: 'Database Security',
          finding:
            'Unauthorized update operations allowed despite RLS policies',
          impact:
            'Users may be able to modify data they should not have access to',
          recommendation:
            'Review and strengthen RLS policies for UPDATE operations',
        });
      }

      if (failedDbTests.some(t => t.name.includes('RLS Tables'))) {
        this.reportData.securityFindings.push({
          severity: 'MEDIUM',
          category: 'Database Configuration',
          finding: 'Issues checking RLS table configuration',
          impact:
            'RLS policies may not be properly enabled on all required tables',
          recommendation: 'Verify RLS is enabled on all user data tables',
        });
      }
    }
  }

  generateRecommendations() {
    this.reportData.recommendations = [
      {
        priority: 'IMMEDIATE',
        category: 'Authentication',
        action: 'Fix API authentication to return proper HTTP status codes',
        details:
          'API routes should return 401 for unauthenticated requests, not 500 errors',
      },
      {
        priority: 'IMMEDIATE',
        category: 'Database Security',
        action: 'Review and test RLS policies thoroughly',
        details:
          'Ensure all database operations properly enforce row-level security',
      },
      {
        priority: 'HIGH',
        category: 'Error Handling',
        action: 'Implement comprehensive error handling',
        details:
          'Add proper validation and error responses for all API endpoints',
      },
      {
        priority: 'HIGH',
        category: 'JWT Validation',
        action: 'Strengthen JWT token validation',
        details:
          'Ensure proper validation of JWT tokens including signature verification',
      },
      {
        priority: 'MEDIUM',
        category: 'Input Validation',
        action: 'Add comprehensive input validation',
        details:
          'Validate all user inputs and handle malformed requests gracefully',
      },
      {
        priority: 'MEDIUM',
        category: 'Security Headers',
        action: 'Implement security headers',
        details: 'Add CORS, CSP, HSTS, and other security headers',
      },
      {
        priority: 'LOW',
        category: 'Monitoring',
        action: 'Add security monitoring and alerting',
        details: 'Monitor for authentication failures and suspicious activity',
      },
      {
        priority: 'LOW',
        category: 'Testing',
        action: 'Integrate security tests into CI/CD',
        details: 'Run these security tests automatically on every deployment',
      },
    ];
  }

  generateMarkdownReport() {
    const { summary, securityFindings, recommendations } = this.reportData;

    let markdown = `# 🔒 RLS and Authentication Security Assessment Report

**Generated:** ${new Date(this.reportData.timestamp).toLocaleString()}  
**Linear Issue:** [AUT-78: Verify Supabase RLS and Auth for Book Entry](https://linear.app/authormagic/issue/AUT-78/verify-supabase-rls-and-auth-for-book-entry)

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Overall Security Score** | ${summary.overallScore}% |
| **Total Tests Executed** | ${summary.totalTests} |
| **Tests Passed** | ${summary.totalPassed} |
| **Tests Failed** | ${summary.totalFailed} |
| **Warnings** | ${summary.totalWarnings} |

### 🚨 Security Status
`;

    if (summary.overallScore >= 90) {
      markdown += `**🟢 EXCELLENT** - System shows strong security posture with minimal issues.`;
    } else if (summary.overallScore >= 75) {
      markdown += `**🟡 GOOD** - System is generally secure but has some areas for improvement.`;
    } else if (summary.overallScore >= 50) {
      markdown += `**🟠 NEEDS ATTENTION** - System has security issues that should be addressed.`;
    } else {
      markdown += `**🔴 CRITICAL** - System has significant security vulnerabilities requiring immediate attention.`;
    }

    markdown += `\n\n## 🔍 Test Results by Category\n\n`;

    if (this.reportData.mockTests) {
      const mockScore = (
        (this.reportData.mockTests.summary.passed /
          (this.reportData.mockTests.summary.passed +
            this.reportData.mockTests.summary.failed)) *
        100
      ).toFixed(1);
      markdown += `### 🧪 Mock Authentication Tests
- **Score:** ${mockScore}%
- **Passed:** ${this.reportData.mockTests.summary.passed}
- **Failed:** ${this.reportData.mockTests.summary.failed}
- **Status:** Structural validation of authentication components

`;
    }

    if (this.reportData.databaseTests) {
      const dbScore = (
        (this.reportData.databaseTests.summary.passed /
          (this.reportData.databaseTests.summary.passed +
            this.reportData.databaseTests.summary.failed)) *
        100
      ).toFixed(1);
      markdown += `### 🗄️ Database RLS Tests
- **Score:** ${dbScore}%
- **Passed:** ${this.reportData.databaseTests.summary.passed}
- **Failed:** ${this.reportData.databaseTests.summary.failed}
- **Status:** Row-level security and data isolation verification

`;
    }

    if (this.reportData.apiTests) {
      const apiScore = (
        (this.reportData.apiTests.summary.passed /
          (this.reportData.apiTests.summary.passed +
            this.reportData.apiTests.summary.failed)) *
        100
      ).toFixed(1);
      markdown += `### 🔌 API Security Tests
- **Score:** ${apiScore}%
- **Passed:** ${this.reportData.apiTests.summary.passed}
- **Failed:** ${this.reportData.apiTests.summary.failed}
- **Status:** Live API endpoint authentication and authorization

`;
    }

    if (securityFindings.length > 0) {
      markdown += `## 🚨 Security Findings\n\n`;

      const critical = securityFindings.filter(f => f.severity === 'CRITICAL');
      const high = securityFindings.filter(f => f.severity === 'HIGH');
      const medium = securityFindings.filter(f => f.severity === 'MEDIUM');
      const low = securityFindings.filter(f => f.severity === 'LOW');

      if (critical.length > 0) {
        markdown += `### 🔴 CRITICAL Issues (${critical.length})\n\n`;
        critical.forEach(finding => {
          markdown += `**${finding.category}:** ${finding.finding}
- **Impact:** ${finding.impact}
- **Recommendation:** ${finding.recommendation}

`;
        });
      }

      if (high.length > 0) {
        markdown += `### 🟠 HIGH Priority Issues (${high.length})\n\n`;
        high.forEach(finding => {
          markdown += `**${finding.category}:** ${finding.finding}
- **Impact:** ${finding.impact}
- **Recommendation:** ${finding.recommendation}

`;
        });
      }

      if (medium.length > 0) {
        markdown += `### 🟡 MEDIUM Priority Issues (${medium.length})\n\n`;
        medium.forEach(finding => {
          markdown += `**${finding.category}:** ${finding.finding}
- **Impact:** ${finding.impact}
- **Recommendation:** ${finding.recommendation}

`;
        });
      }

      if (low.length > 0) {
        markdown += `### 🔵 LOW Priority Issues (${low.length})\n\n`;
        low.forEach(finding => {
          markdown += `**${finding.category}:** ${finding.finding}
- **Impact:** ${finding.impact}
- **Recommendation:** ${finding.recommendation}

`;
        });
      }
    }

    markdown += `## 📋 Action Plan\n\n`;

    const immediate = recommendations.filter(r => r.priority === 'IMMEDIATE');
    const high = recommendations.filter(r => r.priority === 'HIGH');
    const medium = recommendations.filter(r => r.priority === 'MEDIUM');
    const low = recommendations.filter(r => r.priority === 'LOW');

    if (immediate.length > 0) {
      markdown += `### 🚨 IMMEDIATE Actions Required\n\n`;
      immediate.forEach((rec, index) => {
        markdown += `${index + 1}. **${rec.action}**
   - Category: ${rec.category}
   - Details: ${rec.details}

`;
      });
    }

    if (high.length > 0) {
      markdown += `### 🔥 HIGH Priority Actions\n\n`;
      high.forEach((rec, index) => {
        markdown += `${index + 1}. **${rec.action}**
   - Category: ${rec.category}
   - Details: ${rec.details}

`;
      });
    }

    if (medium.length > 0) {
      markdown += `### 📌 MEDIUM Priority Actions\n\n`;
      medium.forEach((rec, index) => {
        markdown += `${index + 1}. **${rec.action}**
   - Category: ${rec.category}
   - Details: ${rec.details}

`;
      });
    }

    if (low.length > 0) {
      markdown += `### 📝 LOW Priority Actions\n\n`;
      low.forEach((rec, index) => {
        markdown += `${index + 1}. **${rec.action}**
   - Category: ${rec.category}
   - Details: ${rec.details}

`;
      });
    }

    markdown += `## 🔧 Technical Details\n\n`;

    markdown += `### 🛠️ Test Environment
- **Server:** localhost:3000
- **Database:** Supabase (Production)
- **Authentication:** Clerk
- **Test Date:** ${new Date(this.reportData.timestamp).toLocaleDateString()}

### 📁 Test Reports Location
- Mock Tests: \`scripts/test-fixtures/rls-auth-report.json\`
- Database Tests: \`scripts/test-fixtures/database-rls-report.json\`
- API Tests: \`scripts/test-fixtures/api-auth-report.json\`

### 🔄 Running Tests Again
\`\`\`bash
# Run all security tests
npm run test:security

# Or run individual test suites
node scripts/test-rls-auth.js        # Mock tests
node scripts/test-rls-database.js   # Database tests  
node scripts/test-api-auth.js       # API tests
node scripts/generate-rls-report.js # Generate report
\`\`\`

## ✅ Next Steps

1. **Address IMMEDIATE and HIGH priority items** before any production deployment
2. **Re-run security tests** after implementing fixes
3. **Update Linear ticket AUT-78** with resolution details
4. **Schedule regular security audits** using these automated tests
5. **Integrate security tests** into CI/CD pipeline for ongoing monitoring

---

*This report was automatically generated by the AuthorMagic security testing suite. For questions or concerns, please review the detailed test logs in the test-fixtures directory.*
`;

    return markdown;
  }

  async generateReport() {
    this.log(
      '🔒 Generating Comprehensive RLS and Authentication Report',
      'info',
    );

    await this.loadTestResults();
    this.calculateSummary();
    this.analyzeSecurityFindings();
    this.generateRecommendations();

    const markdownReport = this.generateMarkdownReport();

    // Save comprehensive report
    const reportPath = path.join(
      __dirname,
      'test-fixtures',
      'SECURITY_ASSESSMENT_REPORT.md',
    );
    try {
      fs.writeFileSync(reportPath, markdownReport);
      this.log(`📄 Comprehensive report saved to: ${reportPath}`, 'success');
    } catch (error) {
      this.log(`Failed to save report: ${error.message}`, 'error');
    }

    // Save JSON summary
    const jsonPath = path.join(
      __dirname,
      'test-fixtures',
      'security-summary.json',
    );
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(this.reportData, null, 2));
      this.log(`📊 JSON summary saved to: ${jsonPath}`, 'success');
    } catch (error) {
      this.log(`Failed to save JSON summary: ${error.message}`, 'error');
    }

    // Display summary
    this.displaySummary();

    return this.reportData;
  }

  displaySummary() {
    const { summary, securityFindings } = this.reportData;

    this.log('\n🔒 SECURITY ASSESSMENT SUMMARY', 'info');
    this.log('='.repeat(60));
    this.log(`📊 Overall Score: ${summary.overallScore}%`);
    this.log(`✅ Tests Passed: ${summary.totalPassed}/${summary.totalTests}`);
    this.log(`❌ Tests Failed: ${summary.totalFailed}`);
    this.log(`⚠️  Warnings: ${summary.totalWarnings}`);

    const criticalFindings = securityFindings.filter(
      f => f.severity === 'CRITICAL',
    ).length;
    const highFindings = securityFindings.filter(
      f => f.severity === 'HIGH',
    ).length;

    this.log(`🚨 Critical Issues: ${criticalFindings}`);
    this.log(`🔥 High Priority Issues: ${highFindings}`);
    this.log('='.repeat(60));

    if (criticalFindings > 0) {
      this.log(
        '🔴 CRITICAL: Immediate action required before production',
        'error',
      );
    } else if (highFindings > 0) {
      this.log('🟠 HIGH: Security improvements recommended', 'warning');
    } else if (summary.overallScore >= 80) {
      this.log('🟢 GOOD: Security posture is acceptable', 'success');
    } else {
      this.log('🟡 MODERATE: Some security enhancements needed', 'warning');
    }
  }
}

// Run report generation if called directly
if (require.main === module) {
  const generator = new ComprehensiveReportGenerator();
  generator.generateReport().catch(error => {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  });
}

module.exports = { ComprehensiveReportGenerator };
