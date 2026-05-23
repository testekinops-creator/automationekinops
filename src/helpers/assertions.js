/**
 * assertions.js — Soft & Hard Assertion Helpers
 *
 * Wraps Playwright's expect / expect.soft() with Logger.verify() integration
 * so every assertion is automatically logged to the Winston log files.
 *
 * Methods:
 *   softCheck(locator, expected, message?) — non-fatal, test continues on failure
 *   hardCheck(locator, expected, message?) — fatal, test stops on failure
 *
 * Usage:
 *   const { softCheck, hardCheck } = require('./assertions');
 *   const logger = new Logger('MyTest');
 *
 *   await softCheck(page.locator('#title'), 'Dashboard', logger, 'Page title');
 *   await hardCheck(page.locator('#error'), '', logger, 'No error message');
 */
const { expect } = require('@playwright/test');

/**
 * Soft assertion — test continues even if this check fails.
 * All soft failures are reported together at the end of the test.
 *
 * @param {import('@playwright/test').Locator} locator   - Element to check
 * @param {string|RegExp}                      expected  - Expected text/value
 * @param {import('./Logger')}                 logger    - Logger instance for this context
 * @param {string}                             [message] - Human-readable label for the log
 * @returns {Promise<void>}
 */
async function softCheck(locator, expected, logger, message = '') {
  const label = message || String(expected);
  if (logger) logger.verify(label, String(expected));
  await expect.soft(locator).toContainText(expected);
}

/**
 * Hard assertion — test fails immediately if this check fails.
 *
 * @param {import('@playwright/test').Locator} locator   - Element to check
 * @param {string|RegExp}                      expected  - Expected text/value
 * @param {import('./Logger')}                 logger    - Logger instance for this context
 * @param {string}                             [message] - Human-readable label for the log
 * @returns {Promise<void>}
 */
async function hardCheck(locator, expected, logger, message = '') {
  const label = message || String(expected);
  if (logger) logger.verify(label, String(expected));
  await expect(locator).toContainText(expected);
}

/**
 * Soft visibility check — verifies element is visible (non-fatal).
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {import('./Logger')}                 logger
 * @param {string}                             [message]
 * @returns {Promise<void>}
 */
async function softVisible(locator, logger, message = 'Element visible') {
  if (logger) logger.verify(message, 'visible');
  await expect.soft(locator).toBeVisible();
}

/**
 * Hard visibility check — verifies element is visible (fatal).
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {import('./Logger')}                 logger
 * @param {string}                             [message]
 * @returns {Promise<void>}
 */
async function hardVisible(locator, logger, message = 'Element visible') {
  if (logger) logger.verify(message, 'visible');
  await expect(locator).toBeVisible();
}

module.exports = { softCheck, hardCheck, softVisible, hardVisible };
