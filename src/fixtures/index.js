/**
 * Fixture Barrel Export
 *
 * Combines all custom fixtures into a single unified `test` and `expect`.
 * Import from this file in all test files instead of '@playwright/test'.
 *
 * @example
 * const { test, expect } = require('../../src/fixtures');
 * test('my test', async ({ authenticatedPage, loginPage, dashboardPage }) => { ... });
 */
const base = require('@playwright/test');
const { mergeTests } = require('@playwright/test');

// Import individual fixtures
const { test: authTest } = require('./auth.fixture');
const { test: pagesTest } = require('./pages.fixture');
const { test: testDataTest } = require('./testData.fixture');

// Merge all fixtures into a single test object
const test = mergeTests(authTest, pagesTest, testDataTest);
const expect = base.expect;

module.exports = { test, expect };
