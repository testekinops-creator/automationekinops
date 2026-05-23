/**
 * tests/test-data.setup.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Test Data Setup — Ensures RMAs exist in all required statuses before tests run.
 * Runs AFTER auth.setup.js (which creates .auth/*.json session files).
 *
 * Creates RMAs in: Submitted, Accepted, Received, Repaired, On Hold,
 *                  Rejected, Closed, Customer RMA
 *
 * Writes results to .auth/test-data-state.json for spec files to consume
 * via TestData helper.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const { test } = require('@playwright/test');
const { setupTestData } = require('../src/helpers/rmaTestDataSetup');

test('Setup test data — create RMAs in all statuses', async () => {
  test.setTimeout(300_000); // 5 min max
  await setupTestData();
});
