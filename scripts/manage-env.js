#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKUP_DIR = 'backups/env';
const ENV_FILES = ['.env.local', '.env.production'];

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function createBackup() {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  let backedUp = 0;
  
  ENV_FILES.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      const backupFile = path.join(BACKUP_DIR, `${envFile.replace('.', '')}-${timestamp}`);
      fs.copyFileSync(envFile, backupFile);
      console.log(`✅ Backed up ${envFile} to ${backupFile}`);
      backedUp++;
    }
  });
  
  if (backedUp === 0) {
    console.log('⚠️  No environment files found to backup');
  } else {
    console.log(`\n📦 Successfully backed up ${backedUp} environment file(s)`);
  }
}

function listBackups() {
  ensureBackupDir();
  
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files.filter(f => f.startsWith('env-')).sort().reverse();
    
    if (backups.length === 0) {
      console.log('📂 No backups found');
      return;
    }
    
    console.log('📋 Available backups:');
    backups.forEach((backup, index) => {
      const filePath = path.join(BACKUP_DIR, backup);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      console.log(`  ${index + 1}. ${backup} (${size} KB, ${stats.mtime.toLocaleString()})`);
    });
  } catch (error) {
    console.error('❌ Error listing backups:', error.message);
  }
}

function restoreBackup(backupName) {
  ensureBackupDir();
  
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupName}`);
    process.exit(1);
  }
  
  // Determine target file name
  let targetFile = '.env.local';
  if (backupName.includes('env-production')) {
    targetFile = '.env.production';
  }
  
  // Create current backup before restore
  if (fs.existsSync(targetFile)) {
    const currentBackup = path.join(BACKUP_DIR, `${targetFile.replace('.', '')}-before-restore-${Date.now()}`);
    fs.copyFileSync(targetFile, currentBackup);
    console.log(`📦 Created backup of current file: ${currentBackup}`);
  }
  
  // Restore the backup
  fs.copyFileSync(backupPath, targetFile);
  console.log(`✅ Restored ${backupName} to ${targetFile}`);
}

function setupFromTemplate() {
  const templateFile = '.env.example';
  const targetFile = '.env.local';
  
  if (!fs.existsSync(templateFile)) {
    console.error(`❌ Template file ${templateFile} not found`);
    process.exit(1);
  }
  
  if (fs.existsSync(targetFile)) {
    console.log(`⚠️  ${targetFile} already exists. Use --force to overwrite.`);
    process.exit(1);
  }
  
  fs.copyFileSync(templateFile, targetFile);
  console.log(`✅ Created ${targetFile} from template`);
  console.log('⚠️  Remember to fill in the actual values!');
}

function validateSchema() {
  const { execSync } = require('child_process');
  
  try {
    execSync('node scripts/validate-env.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Environment validation failed');
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🔧 Environment Management Tool

Usage: node scripts/manage-env.js <command> [options]

Commands:
  backup              Create backup of current environment files
  restore <backup>    Restore from a specific backup
  list                List all available backups
  setup               Create .env.local from .env.example template
  validate            Validate current environment configuration

Options:
  --force             Force overwrite existing files
  --help, -h          Show this help message

Examples:
  node scripts/manage-env.js backup
  node scripts/manage-env.js list
  node scripts/manage-env.js restore env-local-2025-01-13T10-30-00-000Z
  node scripts/manage-env.js setup
  node scripts/manage-env.js validate
  `);
}

// CLI handling
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'backup':
    createBackup();
    break;
    
  case 'restore':
    if (!args[1]) {
      console.error('❌ Please specify a backup file to restore');
      console.log('Use "node scripts/manage-env.js list" to see available backups');
      process.exit(1);
    }
    restoreBackup(args[1]);
    break;
    
  case 'list':
    listBackups();
    break;
    
  case 'setup':
    const force = args.includes('--force');
    if (force && fs.existsSync('.env.local')) {
      createBackup(); // Backup before overwriting
    }
    setupFromTemplate();
    break;
    
  case 'validate':
    validateSchema();
    break;
    
  case '--help':
  case '-h':
  case 'help':
    showHelp();
    break;
    
  default:
    console.error('❌ Unknown command:', command);
    showHelp();
    process.exit(1);
} 