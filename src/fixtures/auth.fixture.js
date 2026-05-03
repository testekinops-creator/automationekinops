const { test: base } = require('@playwright/test');
const { loginAs } = require('../helpers/rmaAuthHelper');
const { USERS } = require('../helpers/Constants');

/**
 * Auth Fixture — Provides pre-authenticated page for RMA Admin.
 * For multi-role tests, use loginAs() helper directly instead.
 */
const test = base.extend({
  /** Pre-authenticated page logged in as RMA Admin */
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page, USERS.rmaAdmin);
    await use(page);
  },
});

module.exports = { test };
