// @ts-check
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { cleanupSerials } = require('../src/helpers/rmaCleanup');

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

  console.log('\n🔧 [Global Setup] Starting framework initialization...');
  console.log(`   Environment: ${process.env.ENV || 'qa'}`);
  console.log(`   Base URL: ${process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com'}`);
  console.log(`   Build: ${process.env.BUILD_NUMBER || 'local'}`);
  console.log(`   Branch: ${process.env.BRANCH_NAME || 'main'}`);

  // Validate required env vars
  const baseURL = process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com';
  if (!baseURL.startsWith('http')) {
    throw new Error(`Invalid RMA_BASE_URL: ${baseURL}`);
  }

  // Create .auth/ directory for storageState session caching
  const authDir = path.resolve(__dirname, '..', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log('   📁 Created .auth/ directory for session caching');
  } else {
    console.log('   📁 .auth/ directory already exists');
  }

  // --- Layer 1: Clear stale RMAs from previous crashed/interrupted runs ---
  if (process.env.SKIP_CLEANUP === 'true') {
    console.log('\n   ⏭️  [Layer 1] Skipping cleanup (SKIP_CLEANUP=true)');
  } else {
    console.log('\n   🛡️  [Layer 1] Clearing stale RMAs from previous runs...');
    const testSerials = [
      process.env.RMA_VALID_SERIAL || 'T1138004504037565',
      // 'L1040004215100962', // Temporarily disabled to avoid 10-minute cleanup of 27 stale entries
    ];
    await cleanupSerials(testSerials, {
      prefix: '[Global Setup]',
      includeEngineerPhase: true,
    });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`   ✅ Global setup completed in ${elapsed}s\n`);
};
