// @ts-check
require('dotenv').config();

/**
 * Global Setup — MyConnect RMA Suite
 *
 * Runs once before all tests. Validates environment configuration
 * and logs framework metadata.
 *
 * NOTE: RMA tests use per-test login (not persistent auth state)
 * because different tests require different user roles (RBAC).
 */
module.exports = async function globalSetup() {
  const startTime = Date.now();

  console.log('\n🔧 [Global Setup] Starting framework initialization...');
  console.log(`   Environment: ${process.env.ENV || 'qa'}`);
  console.log(`   Base URL: ${process.env.RMA_BASE_URL || 'https://myconnect-dev.ekinops.com'}`);
  console.log(`   Build: ${process.env.BUILD_NUMBER || 'local'}`);
  console.log(`   Branch: ${process.env.BRANCH_NAME || 'main'}`);

  // Validate required env vars
  const baseURL = process.env.RMA_BASE_URL || 'https://myconnect-dev.ekinops.com';
  if (!baseURL.startsWith('http')) {
    throw new Error(`Invalid RMA_BASE_URL: ${baseURL}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`   ✅ Global setup completed in ${elapsed}s\n`);
};
