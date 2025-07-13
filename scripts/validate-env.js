#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Required environment variables with validation rules
const REQUIRED_VARS = {
  // Supabase Configuration
  'NEXT_PUBLIC_SUPABASE_URL': {
    required: true,
    pattern: /^https:\/\/[a-zA-Z0-9]+\.supabase\.co$/,
    description: 'Supabase project URL'
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    required: true,
    pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    description: 'Supabase anonymous key (JWT)'
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    required: true,
    pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    description: 'Supabase service role key (JWT)'
  },
  
  // Clerk Authentication
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': {
    required: true,
    pattern: /^pk_(test|live)_[A-Za-z0-9]+$/,
    description: 'Clerk publishable key'
  },
  'CLERK_SECRET_KEY': {
    required: true,
    pattern: /^sk_(test|live)_[A-Za-z0-9]+$/,
    description: 'Clerk secret key'
  },
  
  // API Keys
  'ISBNDB_API_KEY': {
    required: true,
    pattern: /^[0-9]+_[a-f0-9]+$/,
    description: 'ISBNDB API key'
  },
  'GOOGLE_BOOKS_API_KEY': {
    required: true,
    pattern: /^AIza[A-Za-z0-9_-]+$/,
    description: 'Google Books API key'
  },
  'ANTHROPIC_API_KEY': {
    required: true,
    pattern: /^sk-ant-[A-Za-z0-9_-]+$/,
    description: 'Anthropic API key for Claude'
  }
};

// Common misnamed variables that should be flagged
const COMMON_MISTAKES = {
  'SUPABASE_SERVICE_KEY': 'SUPABASE_SERVICE_ROLE_KEY',
  'CLERK_PUBLISHABLE_KEY': 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'SUPABASE_URL': 'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_ANON_KEY': 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
};

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return vars;
  } catch (error) {
    return null;
  }
}

function validateEnvironment(envFile = '.env.local') {
  console.log(`🔍 Validating environment variables in ${envFile}...`);
  
  let envVars;
  
  // Check if we're running in Vercel (or other CI environments)
  if (process.env.VERCEL || process.env.CI || process.env.NODE_ENV === 'production') {
    console.log('📦 Running in deployment environment - using injected environment variables');
    envVars = process.env;
  } else {
    envVars = loadEnvFile(envFile);
    
    if (!envVars) {
      console.error(`❌ Could not load ${envFile}`);
      return false;
    }
  }
  
  let isValid = true;
  const errors = [];
  const warnings = [];
  
  // Check for required variables
  for (const [varName, config] of Object.entries(REQUIRED_VARS)) {
    if (!envVars[varName]) {
      errors.push(`❌ Missing required variable: ${varName} (${config.description})`);
      isValid = false;
    } else if (config.pattern && !config.pattern.test(envVars[varName])) {
      errors.push(`❌ Invalid format for ${varName}: ${config.description}`);
      isValid = false;
    }
  }
  
  // Check for common mistakes
  for (const [wrong, correct] of Object.entries(COMMON_MISTAKES)) {
    if (envVars[wrong] && !envVars[correct]) {
      warnings.push(`⚠️  Found '${wrong}' but expected '${correct}' - this may cause runtime errors`);
    }
  }
  
  // Check for deprecated or suspicious variables
  for (const varName of Object.keys(envVars)) {
    if (COMMON_MISTAKES[varName]) {
      warnings.push(`⚠️  Variable '${varName}' should be renamed to '${COMMON_MISTAKES[varName]}'`);
    }
  }
  
  // Report results
  if (isValid && warnings.length === 0) {
    console.log('✅ All environment variables are valid!');
    return true;
  }
  
  if (errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    errors.forEach(error => console.log(error));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(warning));
  }
  
  console.log('\n📋 Required variables:');
  Object.entries(REQUIRED_VARS).forEach(([name, config]) => {
    const status = envVars[name] ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${config.description}`);
  });
  
  return isValid && warnings.length === 0;
}

function showHelp() {
  console.log(`
🔧 Environment Variable Validator

Usage: node scripts/validate-env.js [options]

Options:
  --file, -f    Specify env file to validate (default: .env.local)
  --help, -h    Show this help message

Examples:
  node scripts/validate-env.js
  node scripts/validate-env.js --file .env.production
  `);
}

// CLI handling
const args = process.argv.slice(2);
let envFile = '.env.local';

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--file':
    case '-f':
      envFile = args[i + 1];
      i++;
      break;
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      break;
  }
}

// Run validation
const isValid = validateEnvironment(envFile);
process.exit(isValid ? 0 : 1); 