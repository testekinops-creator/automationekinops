const fs = require('fs');
const path = require('path');
const { cleanupSerials } = require('../src/helpers/rmaCleanup');
const Logger = require('../src/helpers/Logger');

const logger = new Logger('GlobalTeardown');

/**
 * Global Teardown — Runs once after all tests complete.
 *
 * Layer 3 (Safety Net) — Catches anything the per-test fixture missed.
 *
 * Responsibilities:
 *   1. Cleanup .auth/ storageState session files (security hygiene)
 *   2. Final sweep: Reject + Close any RMAs still active for test serial numbers
 *   3. Archive logs/ directory with timestamp for CI artifact storage
 *   4. Log test run end summary
 *
 * @returns {Promise<void>}
 */
async function globalTeardown() {
  logger.info('Global teardown started — cleaning up...');

  // --- Cleanup .auth/ session files (contain sensitive cookies) ---
  const authDir = path.resolve(__dirname, '..', '.auth');
  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      fs.unlinkSync(path.join(authDir, file));
    }
    logger.info(`Removed ${files.length} cached session file(s) from .auth/`);
  }

  // --- Layer 3: Safety-net cleanup for any remaining active RMAs ---
  logger.info('[Layer 3] Cleaning up generic test serials...');
  const testSerials = [
    'L1040003043099099', // CI serial for customer-reassignment tests
  ];
  await cleanupSerials(testSerials, {
    prefix: '[Global Teardown]',
    includeEngineerPhase: true,
  });

  // --- Archive logs/ with timestamp ---
  const logsDir = path.resolve(__dirname, '..', 'logs');
  if (fs.existsSync(logsDir)) {
    const archiveBase = path.resolve(__dirname, '..', 'logs-archive');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const archiveDest = path.join(archiveBase, `run-${timestamp}`);
    try {
      fs.mkdirSync(archiveDest, { recursive: true });
      const logFiles = fs.readdirSync(logsDir).filter((f) => f.endsWith('.log'));
      for (const file of logFiles) {
        fs.copyFileSync(path.join(logsDir, file), path.join(archiveDest, file));
      }
      logger.info(`Logs archived to logs-archive/run-${timestamp}/ (${logFiles.length} file(s))`);
    } catch (err) {
      logger.warn(`Log archiving failed: ${err.message}`);
    }
  }

  logger.info('='.repeat(60));
  logger.info('TEST RUN COMPLETE');
  logger.info('='.repeat(60));
}

module.exports = globalTeardown;
