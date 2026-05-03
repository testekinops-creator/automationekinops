const { test: base } = require('@playwright/test');
const { RMALoginPage } = require('../pages/rma/RMALoginPage');
const { RMADashboardPage } = require('../pages/rma/RMADashboardPage');
const { SubmitRMAPage } = require('../pages/rma/SubmitRMAPage');
const { ViewRMAPage } = require('../pages/rma/ViewRMAPage');
const { FactoryReceivePage } = require('../pages/rma/FactoryReceivePage');
const { FactoryInsertPage } = require('../pages/rma/FactoryInsertPage');

/**
 * Pages Fixture — Auto-instantiates all RMA POM classes.
 * Eliminates `new RMALoginPage(page)` boilerplate in tests.
 *
 * @example
 * const { test } = require('../../src/fixtures');
 * test('my test', async ({ loginPage, dashboardPage }) => { ... });
 */
const test = base.extend({
  loginPage: async ({ page }, use) => { await use(new RMALoginPage(page)); },
  dashboardPage: async ({ page }, use) => { await use(new RMADashboardPage(page)); },
  submitRmaPage: async ({ page }, use) => { await use(new SubmitRMAPage(page)); },
  viewRmaPage: async ({ page }, use) => { await use(new ViewRMAPage(page)); },
  factoryReceivePage: async ({ page }, use) => { await use(new FactoryReceivePage(page)); },
  factoryInsertPage: async ({ page }, use) => { await use(new FactoryInsertPage(page)); },
});

module.exports = { test };
