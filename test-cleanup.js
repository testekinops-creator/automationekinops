/**
 * Quick test: verify rmaCleanup can clean up RMAs from the previous test run.
 */
const { cleanupSerials } = require('./src/helpers/rmaCleanup');

// These serials were created by the TC-SUB-003 test run we just did
const testSerials = [
  'T2137008182014457',  // SUBMITTED → RMA 104320
  'T2149008234103530',  // ACCEPTED → RMA 104321
];

(async () => {
  console.log('=== Testing cleanup with 2 serials from last run ===\n');
  try {
    await cleanupSerials(testSerials, {
      prefix: '[CleanupTest]',
      includeEngineerPhase: true,
    });
    console.log('\n✅ Cleanup completed successfully!');
  } catch (err) {
    console.error('\n❌ Cleanup failed:', err.message);
  }
})();
