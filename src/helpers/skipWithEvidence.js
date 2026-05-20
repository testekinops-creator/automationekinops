/**
 * src/helpers/skipWithEvidence.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Captures a screenshot + page context and attaches them to the Playwright/Allure
 * report BEFORE skipping a test.  This ensures that skipped tests always have
 * diagnostic evidence (screenshot, URL, reason) visible in the Allure report.
 *
 * Usage:
 *   const { skipWithEvidence } = require('../../src/helpers/skipWithEvidence');
 *
 *   test('my test', async ({ page }) => {
 *     if (noData) {
 *       await skipWithEvidence(page, test.info(), 'No Received RMA available');
 *       return;
 *     }
 *   });
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Capture a screenshot and attach diagnostic context to the test report,
 * then mark the test as skipped.
 *
 * @param {import('@playwright/test').Page} page      - Playwright page instance
 * @param {import('@playwright/test').TestInfo} testInfo - Current test info object
 * @param {string} reason - Human-readable reason for skipping
 */
async function skipWithEvidence(page, testInfo, reason) {
  try {
    // 1. Full-page screenshot
    const screenshot = await page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      await testInfo.attach('skip-evidence-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }

    // 2. Textual context (URL, timestamp, reason)
    const context = [
      `Skip Reason : ${reason}`,
      `Page URL    : ${page.url()}`,
      `Timestamp   : ${new Date().toISOString()}`,
      `Test Title  : ${testInfo.title}`,
    ].join('\n');

    await testInfo.attach('skip-reason', {
      body: context,
      contentType: 'text/plain',
    });

    // 3. Add annotation so Allure picks it up
    testInfo.annotations.push({
      type: 'skip-reason',
      description: reason,
    });
  } catch (err) {
    // Never let evidence collection crash the test
    console.warn(`  [skipWithEvidence] Failed to capture evidence: ${err.message}`);
  }

  // 4. Now skip the test
  testInfo.skip(true, reason);
}

module.exports = { skipWithEvidence };
