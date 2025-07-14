#!/usr/bin/env node

/* eslint-disable no-console */
const { spawn } = require('child_process');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', err => {
      reject(err);
    });
  });
}

async function validateProduction() {
  console.log(colorize('blue', '🔍 Starting production validation...'));
  console.log('');

  const steps = [
    {
      name: 'Environment Variables',
      command: 'npm',
      args: ['run', 'env:validate'],
      description: 'Validating required environment variables',
    },
    {
      name: 'TypeScript Type Checking',
      command: 'npm',
      args: ['run', 'type-check'],
      description: 'Checking TypeScript types and compilation',
    },
    {
      name: 'ESLint',
      command: 'npm',
      args: ['run', 'lint'],
      description: 'Linting code for style and potential errors',
    },
    {
      name: 'Production Build',
      command: 'npm',
      args: ['run', 'build'],
      description: 'Building application for production',
    },
  ];

  for (const step of steps) {
    try {
      console.log(colorize('cyan', `📋 ${step.name}:`));
      console.log(`   ${step.description}`);
      console.log('');

      await runCommand(step.command, step.args);

      console.log(colorize('green', `✅ ${step.name} passed`));
      console.log('');
    } catch (err) {
      console.log('');
      console.log(colorize('red', `❌ ${step.name} failed`));
      console.log('');
      console.log(colorize('yellow', '💡 Troubleshooting tips:'));

      // Provide specific troubleshooting tips based on the step
      switch (step.name) {
        case 'Environment Variables':
          console.log('   - Check .env.local file exists');
          console.log('   - Verify all required variables are set');
          console.log('   - Run: npm run env:guide');
          break;
        case 'TypeScript Type Checking':
          console.log('   - Check for type mismatches in interfaces');
          console.log('   - Verify database schema alignment');
          console.log('   - Look for nullable vs non-nullable type issues');
          break;
        case 'ESLint':
          console.log('   - Run: npm run lint:fix to auto-fix issues');
          console.log('   - Check for unused variables');
          console.log('   - Verify import statements are correct');
          break;
        case 'Production Build':
          console.log('   - Previous validation steps must pass first');
          console.log('   - Check for runtime errors in components');
          console.log('   - Verify all dependencies are installed');
          break;
      }

      console.log('');
      console.log(colorize('blue', '📚 For more help, check:'));
      console.log('   - DEVELOPMENT_TROUBLESHOOTING.md');
      console.log('   - Recent git commit messages');
      console.log('   - Notion development documentation');
      console.log('');

      process.exit(1);
    }
  }

  console.log(colorize('green', '🎉 All production validations passed!'));
  console.log(colorize('green', '🚀 Safe to deploy to production'));
}

// Run validation
validateProduction().catch(err => {
  console.error(colorize('red', 'Validation failed:'), err.message);
  process.exit(1);
});
