/**
 * api.fixture.js — Playwright API Context Fixture
 *
 * Provides a pre-configured Playwright `apiContext` for making
 * authenticated API requests inside tests.
 *
 * Usage in tests (after merging into index.js):
 *   const { test, expect } = require('../../src/fixtures');
 *   test('API test', async ({ apiContext }) => {
 *     const response = await apiContext.get('/rma/list');
 *     expect(response.ok()).toBeTruthy();
 *   });
 */
const { test: base, request } = require('@playwright/test');
const { BASE_URL } = require('../helpers/config');
const Logger = require('../helpers/Logger');

const logger = new Logger('ApiFixture');

const test = base.extend({
  /**
   * apiContext — Playwright request context with base URL pre-set.
   * Use for API-level assertions and test data setup/cleanup.
   */
  apiContext: async ({}, use) => {
    logger.info(`Creating API context for ${BASE_URL}`);
    const context = await request.newContext({
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    await use(context);

    logger.info('Disposing API context');
    await context.dispose();
  },
});

module.exports = { test };
