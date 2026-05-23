// @ts-check
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { cleanupSerials } = require('../src/helpers/rmaCleanup');
const { setupTestData } = require('../src/helpers/rmaTestDataSetup');
const Logger = require('../src/helpers/Logger');

const logger = new Logger('GlobalSetup');

/**
 * Global Setup — MyConnect RMA Suite
 *
 * Runs once before all tests. Responsibilities:
 *   1. Validate environment configuration
 *   2. Create .auth/ directory for storageState session caching
 *   3. Layer 1 Cleanup: Clear any stale/orphaned RMAs from previous
 *      crashed or interrupted runs (crash recovery)
 */
module.exports = async function globalSetup() {
  const startTime = Date.now();

  // Ensure logs/ directory exists for Winston file transports
  const logsDir = path.resolve(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  logger.info('='.repeat(60));
  logger.info('TEST RUN STARTED');
  logger.info(`Environment : ${process.env.ENV || 'qa'}`);
  logger.info(`Base URL    : ${process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com'}`);
  logger.info(`Build       : ${process.env.BUILD_NUMBER || 'local'}`);
  logger.info(`Branch      : ${process.env.BRANCH_NAME || 'main'}`);
  logger.info('='.repeat(60));

  // Validate required env vars
  const baseURL = process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com';
  if (!baseURL.startsWith('http')) {
    throw new Error(`Invalid RMA_BASE_URL: ${baseURL}`);
  }

  // Create .auth/ directory for storageState session caching
  const authDir = path.resolve(__dirname, '..', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    logger.info('.auth/ directory created for session caching');
  } else {
    logger.info('.auth/ directory already exists');
  }

  // --- Layer 1: Clear stale RMAs from previous crashed/interrupted runs ---
  if (process.env.SKIP_CLEANUP === 'true') {
    logger.info('[Layer 1] Skipping cleanup (SKIP_CLEANUP=true)');
  } else {
    logger.info('[Layer 1] Clearing stale RMAs from previous runs...');
    const testSerials = [
      process.env.RMA_VALID_SERIAL || 'T1138004504037565',
      'L1040003043099099', // CI serial for customer-reassignment tests
      'S2513008343588978', // Workflow & edit-rma test serial
      // All 8 setup serials — cleanup previous run's RMAs so they can be re-created
      process.env.RMA_SETUP_SERIAL_1 || 'T2137008182014457',  // SUBMITTED
      process.env.RMA_SETUP_SERIAL_2 || 'T2149008234103530',  // ACCEPTED
      process.env.RMA_SETUP_SERIAL_3 || 'T2149008234103378',  // RECEIVED (legacy)
      process.env.RMA_SETUP_SERIAL_4 || 'T2341008344060248',  // REPAIRED (legacy)
      process.env.RMA_SETUP_SERIAL_5 || 'T2048008256056664',  // ON_HOLD (legacy)
      process.env.RMA_SETUP_SERIAL_6 || 'T2036008256051168',  // REJECTED (legacy)
      process.env.RMA_SETUP_SERIAL_7 || 'T2103008256059686',  // CLOSED (legacy)
      process.env.RMA_SETUP_SERIAL_8 || 'S2415008554503003',  // CUSTOMER_RMA
    ];
    await cleanupSerials(testSerials, {
      prefix: '[Global Setup]',
      includeEngineerPhase: true,
    });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`Global setup completed in ${elapsed}s`);

  // NOTE: Test data setup (Layer 2) now runs as the 'data-setup' Playwright project
  // AFTER auth.setup.js creates the .auth/*.json session files.
  // See tests/test-data.setup.js

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`Total global setup time: ${totalElapsed}s`);
};
