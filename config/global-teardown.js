const fs = require('fs');
const path = require('path');
const { cleanupSerials } = require('../src/helpers/rmaCleanup');

/**
 * Global Teardown — Runs once after all tests complete.
 *
 * Layer 3 (Safety Net) — Catches anything the per-test fixture missed.
 *
 * Responsibilities:
 *   1. Cleanup .auth/ storageState session files (security hygiene)
 *   2. Final sweep: Reject + Close any RMAs still active for test serial numbers
 *   3. Log summary
 *
 * @returns {Promise<void>}
 */
async function globalTeardown() {
  console.log('\n🧹 [Global Teardown] Cleaning up...');

  // --- Cleanup .auth/ session files (contain sensitive cookies) ---
  const authDir = path.resolve(__dirname, '..', '.auth');
  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      fs.unlinkSync(path.join(authDir, file));
    }
    console.log(`   🗑️  Removed ${files.length} cached session file(s) from .auth/`);
  }

  // --- Layer 3: Safety-net cleanup for any remaining active RMAs ---
  console.log('\n   🛡️  [Layer 3] Safety-net cleanup — catching anything fixture missed...');
  const testSerials = [
    process.env.RMA_VALID_SERIAL || 'T1138004504037565',
    'L1040003043099099', // CI serial for customer-reassignment tests
    'S2513008343588978', // Workflow & edit-rma test serial
    // 'L1040004215100962',
  ];
  await cleanupSerials(testSerials, {
    prefix: '[Global Teardown]',
    includeEngineerPhase: true,
  });

  console.log('   ✅ Teardown complete.\n');
}

module.exports = globalTeardown;
