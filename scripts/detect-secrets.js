#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔍 Secret Detection Scan');
console.log('========================\n');

// Secret patterns to detect
const secretPatterns = [
  {
    name: 'Supabase Service Key JWT',
    pattern:
      /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    severity: 'CRITICAL',
  },
  {
    name: 'Generic JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    severity: 'HIGH',
  },
  {
    name: 'API Key Pattern',
    pattern: /['"](sk|pk)_[a-zA-Z0-9]{20,}['"]/g,
    severity: 'HIGH',
  },
  {
    name: 'Generic Secret Pattern',
    pattern: /(?:secret|password|key|token)\s*[=:]\s*['""][^'""]{8,}['"]/gi,
    severity: 'MEDIUM',
  },
  {
    name: 'Database URL with Password',
    pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\/]+/gi,
    severity: 'HIGH',
  },
];

// Files to scan (get staged files or all files)
function getStagedFiles() {
  return new Promise((resolve, reject) => {
    exec('git diff --cached --name-only', (error, stdout) => {
      if (error) {
        // If not in git context, scan all relevant files
        resolve([]);
      } else {
        const files = stdout
          .trim()
          .split('\n')
          .filter(f => f);
        resolve(files);
      }
    });
  });
}

// Scan file for secrets
function scanFile(filePath, patterns) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];

    patterns.forEach(({ name, pattern, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Skip test fixtures, example values, and configuration references
          if (
            match.includes('example') ||
            match.includes('test') ||
            match.includes('mock') ||
            match.includes('invalid') ||
            match.includes('.signature') ||
            filePath.includes('test-') ||
            filePath.includes('validate-env') ||
            (severity === 'MEDIUM' && match.includes('KEY:')) ||
            match.includes('your-') ||
            match.includes('placeholder')
          ) {
            return;
          }

          const lines = content.split('\n');
          const lineNumber = lines.findIndex(line => line.includes(match)) + 1;

          findings.push({
            file: filePath,
            line: lineNumber,
            type: name,
            severity,
            preview: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
          });
        });
      }
    });

    return findings;
  } catch (error) {
    console.warn(`⚠️  Could not scan ${filePath}: ${error.message}`);
    return [];
  }
}

async function main() {
  const stagedFiles = await getStagedFiles();

  // If no staged files, scan all relevant files
  const filesToScan =
    stagedFiles.length > 0
      ? stagedFiles
      : ['scripts/', 'src/', '.env.example', '*.js', '*.ts', '*.tsx', '*.json'];

  let allFindings = [];

  // Scan files
  if (stagedFiles.length > 0) {
    console.log(`📂 Scanning ${stagedFiles.length} staged files...\n`);

    stagedFiles.forEach(file => {
      if (file.match(/\.(js|ts|tsx|json|md|sql)$/)) {
        const findings = scanFile(file, secretPatterns);
        allFindings = allFindings.concat(findings);
      }
    });
  } else {
    console.log('📂 Scanning all script files...\n');

    // Scan scripts directory
    if (fs.existsSync('scripts/')) {
      const scriptFiles = fs
        .readdirSync('scripts/')
        .filter(f => f.endsWith('.js'))
        .map(f => path.join('scripts', f));

      scriptFiles.forEach(file => {
        const findings = scanFile(file, secretPatterns);
        allFindings = allFindings.concat(findings);
      });
    }
  }

  // Report findings
  if (allFindings.length === 0) {
    console.log('✅ No secrets detected! Safe to commit.\n');
    process.exit(0);
  }

  console.log('🚨 POTENTIAL SECRETS DETECTED!');
  console.log('==============================\n');

  allFindings.forEach(finding => {
    console.log(`🔴 ${finding.severity}: ${finding.type}`);
    console.log(`   📄 File: ${finding.file}:${finding.line}`);
    console.log(`   👁️  Preview: ${finding.preview}`);
    console.log('');
  });

  console.log('⛔ COMMIT BLOCKED FOR SECURITY');
  console.log('==============================');
  console.log('1. Remove all hardcoded secrets from your code');
  console.log('2. Use environment variables instead');
  console.log('3. If these are false positives, update the detection patterns');
  console.log('4. Rotate any real secrets that were exposed');
  console.log('');

  process.exit(1);
}

main().catch(error => {
  console.error('Error during secret detection:', error);
  process.exit(1);
});
