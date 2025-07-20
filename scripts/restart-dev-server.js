#!/usr/bin/env node

/**
 * Clean Development Server Restart Script
 *
 * This script performs a complete development server restart:
 * 1. Kills existing Next.js dev server processes
 * 2. Removes corrupted .next build cache
 * 3. Clears port 3000 of any lingering processes
 * 4. Starts fresh development server
 * 5. Verifies server is responding
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: '\x1b[36m', // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m', // Reset
  };

  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function killExistingServer() {
  log('🔄 Killing existing Next.js development server...', 'info');

  try {
    // Kill Next.js dev processes
    execSync('pkill -f "next dev"', { stdio: 'ignore' });
    log('✅ Next.js dev processes terminated', 'success');
  } catch (error) {
    log('ℹ️  No existing Next.js dev processes found', 'info');
  }

  try {
    // Clear port 3000
    execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true', {
      stdio: 'ignore',
    });
    log('✅ Port 3000 cleared', 'success');
  } catch (error) {
    log('ℹ️  Port 3000 was already free', 'info');
  }
}

async function cleanBuildCache() {
  log('🧹 Cleaning .next build cache...', 'info');

  const nextDir = path.join(process.cwd(), '.next');

  try {
    if (fs.existsSync(nextDir)) {
      execSync('rm -rf .next', { stdio: 'ignore' });
      log('✅ .next cache removed successfully', 'success');
    } else {
      log('ℹ️  .next cache already clean', 'info');
    }
  } catch (error) {
    log(`❌ Error cleaning .next cache: ${error.message}`, 'error');
    throw error;
  }
}

async function startDevServer() {
  log('🚀 Starting fresh development server...', 'info');

  return new Promise((resolve, reject) => {
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      detached: true,
    });

    let startupOutput = '';
    let serverReady = false;

    devProcess.stdout.on('data', data => {
      const output = data.toString();
      startupOutput += output;

      // Check for successful startup indicators
      if (output.includes('Ready in') || output.includes('Local:')) {
        serverReady = true;
      }

      // Forward output to console
      process.stdout.write(output);
    });

    devProcess.stderr.on('data', data => {
      const output = data.toString();
      startupOutput += output;
      process.stderr.write(output);
    });

    devProcess.on('error', error => {
      log(`❌ Failed to start dev server: ${error.message}`, 'error');
      reject(error);
    });

    // Give the server time to start up
    setTimeout(() => {
      if (serverReady) {
        log('✅ Development server started successfully', 'success');
        resolve(devProcess);
      } else {
        log('⚠️  Server may still be starting up...', 'warning');
        resolve(devProcess);
      }
    }, 8000);
  });
}

async function verifyServer() {
  log('🔍 Verifying server is responding...', 'info');

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        log(`✅ Server responding with HTTP ${response.status}`, 'success');
        return true;
      }
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        log(
          `⏳ Waiting for server (attempt ${retries}/${maxRetries})...`,
          'warning',
        );
        await sleep(2000);
      }
    }
  }

  log('❌ Server verification failed - manual check recommended', 'error');
  return false;
}

async function main() {
  try {
    log('🔧 Starting Clean Development Server Restart...', 'info');
    log('', 'info'); // Empty line for readability

    // Step 1: Kill existing processes
    await killExistingServer();
    await sleep(1000);

    // Step 2: Clean build cache
    await cleanBuildCache();
    await sleep(1000);

    // Step 3: Start fresh server
    const serverProcess = await startDevServer();
    await sleep(3000);

    // Step 4: Verify server
    const serverOk = await verifyServer();

    log('', 'info'); // Empty line for readability

    if (serverOk) {
      log('🎉 Clean Development Server Restart Complete!', 'success');
      log('🌐 Server available at: http://localhost:3000', 'success');
    } else {
      log('⚠️  Server restart completed but verification failed', 'warning');
      log('🌐 Please manually check: http://localhost:3000', 'info');
    }

    // Keep the script running so the server doesn't exit
    log('ℹ️  Press Ctrl+C to stop the development server', 'info');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('🛑 Stopping development server...', 'info');
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');
      }
      process.exit(0);
    });
  } catch (error) {
    log(`❌ Restart failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the script
main();
