#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class AutoRestartWatcher {
  constructor() {
    this.debounceTimeout = null;
    this.isRestarting = false;
    this.watchedDirs = [
      'src/components',
      'src/lib',
      'src/app/api',
      'src/middleware.ts',
    ];
    this.watchedFiles = ['package.json', 'next.config.ts', 'tsconfig.json'];
    this.watchers = [];

    console.log('🔄 Auto-restart watcher starting...');
    this.setupWatchers();
    this.setupGracefulShutdown();
  }

  setupWatchers() {
    // Watch directories recursively
    this.watchedDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        console.log(`👁️  Watching directory: ${dir}`);
        const watcher = fs.watch(
          fullPath,
          { recursive: true },
          (eventType, filename) => {
            if (filename && this.shouldTriggerRestart(filename)) {
              this.scheduleRestart(`${dir}/${filename}`);
            }
          },
        );
        this.watchers.push(watcher);
      }
    });

    // Watch individual files
    this.watchedFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        console.log(`👁️  Watching file: ${file}`);
        const watcher = fs.watch(fullPath, eventType => {
          if (eventType === 'change') {
            this.scheduleRestart(file);
          }
        });
        this.watchers.push(watcher);
      }
    });

    console.log('✅ Auto-restart watcher ready');
    console.log(
      '💡 The dev server will automatically restart when you modify:',
    );
    console.log('   - Components, API routes, lib files');
    console.log('   - Config files (package.json, next.config.ts, etc.)');
    console.log('   - Press Ctrl+C to stop watching');
  }

  shouldTriggerRestart(filename) {
    // Only restart for relevant file types
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    const ext = path.extname(filename);

    // Skip temporary files, cache files, etc.
    if (
      filename.includes('.tmp') ||
      filename.includes('node_modules') ||
      filename.includes('.next') ||
      filename.includes('.git') ||
      filename.startsWith('.')
    ) {
      return false;
    }

    return extensions.includes(ext);
  }

  scheduleRestart(changedFile) {
    if (this.isRestarting) {
      console.log(
        `⏳ Restart already in progress, ignoring change to ${changedFile}`,
      );
      return;
    }

    // Debounce to avoid multiple restarts for rapid file changes
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.performRestart(changedFile);
    }, 1000); // Wait 1 second for additional changes
  }

  async performRestart(changedFile) {
    if (this.isRestarting) return;

    this.isRestarting = true;
    console.log(`\n🔄 File changed: ${changedFile}`);
    console.log('🚀 Auto-restarting development server...');

    try {
      // Run the existing restart script
      const restartProcess = spawn('npm', ['run', 'restart'], {
        stdio: 'inherit',
        shell: true,
      });

      restartProcess.on('close', code => {
        if (code === 0) {
          console.log('✅ Auto-restart completed successfully\n');
        } else {
          console.log(`❌ Auto-restart failed with code ${code}\n`);
        }
        this.isRestarting = false;
      });
    } catch (error) {
      console.error('❌ Auto-restart error:', error);
      this.isRestarting = false;
    }
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      console.log('\n🛑 Stopping auto-restart watcher...');
      this.watchers.forEach(watcher => watcher.close());
      clearTimeout(this.debounceTimeout);
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

// Start the watcher
new AutoRestartWatcher();
