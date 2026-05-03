const { test: base } = require('@playwright/test');
const { USERS, RMA, ROUTES, DASHBOARD, ERRORS } = require('../helpers/Constants');

/**
 * TestData Fixture — Provides RMA test constants via fixture injection.
 *
 * @example
 * test('my test', async ({ testData }) => {
 *   console.log(testData.USERS.rmaAdmin.email);
 * });
 */
const test = base.extend({
  testData: async ({}, use) => {
    await use({ USERS, RMA, ROUTES, DASHBOARD, ERRORS });
  },
});

module.exports = { test };
