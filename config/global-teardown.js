/**
 * Global Teardown — Runs once after all tests complete.
 *
 * Responsibilities:
 * 1. Cleanup temporary test artifacts
 * 2. Log summary statistics
 * 3. Optional: Send notifications
 *
 * @returns {Promise<void>}
 */
async function globalTeardown() {
  console.log('\n🧹 [Global Teardown] Cleaning up...');

  // --- Cleanup Tasks ---
  // Add any cleanup logic here:
  // - Delete temporary test data created via API
  // - Clear uploaded files
  // - Reset application state

  console.log('   ✅ Teardown complete.\n');
}

module.exports = globalTeardown;
