#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Secure Environment Setup for Database Scripts');
console.log('================================================\n');

const envPath = path.join(process.cwd(), '.env.local');

// Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.error('   Please create .env.local file first');
  process.exit(1);
}

// Read current .env.local
const envContent = fs.readFileSync(envPath, 'utf8');

// Check for required variables
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const missingVars = [];
const presentVars = [];

requiredVars.forEach(varName => {
  if (envContent.includes(`${varName}=`)) {
    presentVars.push(varName);
  } else {
    missingVars.push(varName);
  }
});

console.log('📋 Environment Variable Status:');
console.log('================================');

presentVars.forEach(varName => {
  console.log(`✅ ${varName} - Found`);
});

missingVars.forEach(varName => {
  console.log(`❌ ${varName} - Missing`);
});

console.log('\n📝 Required Variables for Database Scripts:');
console.log('===========================================');
console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
console.log('\n🔐 For Production Scripts (optional):');
console.log(
  'NEXT_PUBLIC_SUPABASE_URL_PRODUCTION=https://prod-project.supabase.co',
);
console.log('SUPABASE_SERVICE_ROLE_KEY_PRODUCTION=your-prod-service-role-key');

console.log('\n⚠️  SECURITY REMINDERS:');
console.log('======================');
console.log('1. Never commit service role keys to git');
console.log('2. Rotate keys immediately if they were exposed');
console.log('3. Use different keys for development and production');
console.log('4. Keep your .env.local file secure and private');

if (missingVars.length > 0) {
  console.log('\n❗ Action Required:');
  console.log('==================');
  console.log('Add the missing environment variables to your .env.local file');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are present!');
  console.log('   Database scripts should work correctly.');
}
