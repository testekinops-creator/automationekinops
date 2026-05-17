/**
 * src/fixtures/rmaFixtures.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Custom Playwright Fixtures — RMA Test Cleanup
 *
 * Extends the base `test` with a `trackRma` fixture that registers serial
 * numbers for automatic cleanup after each test ends (pass or fail).
 *
 * Usage:
 *   const { test, expect } = require('../../src/fixtures/rmaFixtures');
 *
 *   test('creates an RMA', async ({ page, trackRma }) => {
 *     trackRma('L1040004215100962');   // ← register for cleanup
 *     // ... test logic ...
 *   });
 *   // ↑ After test ends, fixture teardown cleans up L1040004215100962 automatically
 *
 * Zero overhead if trackRma() is never called (no browser launched).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const base = require('@playwright/test');
const { cleanupSerials } = require('../helpers/rmaCleanup');

/**
 * Extended test object with `trackRma` fixture.
 *
 * The fixture uses Playwright's `use` pattern:
 *   - Before test: provides the `trackRma` function
 *   - After test: calls `cleanupSerials` for all tracked serials
 */
const test = base.test.extend({
  /**
   * trackRma fixture — call trackRma(serial) inside your test to register
   * a serial number for automatic cleanup after the test finishes.
   *
   * @example
   *   test('submit RMA', async ({ page, trackRma }) => {
   *     trackRma('L1040004215100962');
   *     // ... create RMA ...
   *   });
   */
  trackRma: async ({}, use, testInfo) => {
    // Array to collect serial numbers during the test
    const trackedSerials = [];

    // Provide the trackRma function to the test
    await use((serial) => {
      if (serial && !trackedSerials.includes(serial)) {
        trackedSerials.push(serial);
      }
    });

    // ── Teardown: runs after the test function returns (pass or fail) ──
    if (trackedSerials.length > 0) {
      const testName = testInfo.title.substring(0, 40);
      console.log(`\n   🧹 [Fixture] Cleaning up ${trackedSerials.length} tracked serial(s) after "${testName}..."`);
      await cleanupSerials(trackedSerials, {
        prefix: `[Fixture/${testInfo.title.substring(0, 20)}]`,
        includeEngineerPhase: true,
      });
    }
  },
});

// Re-export expect so specs can import both from one place
const expect = base.expect;

module.exports = { test, expect };
