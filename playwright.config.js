// @ts-check
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration — MyConnect RMA Automation Suite
 * @see https://playwright.dev/docs/test-configuration
 *
 * Pure TDD approach — no BDD/Cucumber dependencies.
 * RMA tests use per-test login (no persistent auth state) due to multi-role RBAC testing.
 */

const RMA_BASE_URL = process.env.RMA_BASE_URL || 'https://myconnect-dev.ekinops.com';

module.exports = defineConfig({
  // --- Test Directory ---
  testDir: './tests',
  testMatch: '**/*.spec.js',

  // --- Execution ---
  fullyParallel: false,       // RMA tests share state — run sequentially
  workers: 1,
  forbidOnly: !!process.env.CI,

  // --- Retry & Timeout ---
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  // --- Reporting ---
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
    ['./src/reporters/SummaryReporter.js'],
  ],

  // --- Global Settings ---
  use: {
    baseURL: RMA_BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // --- Artifacts ---
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // --- Browser Settings ---
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    locale: 'en-US',

    // --- Metadata for Reports ---
    extraHTTPHeaders: {
      'x-build-number': process.env.BUILD_NUMBER || 'local',
      'x-branch-name': process.env.BRANCH_NAME || 'main',
    },
  },

  // --- Output Directories ---
  outputDir: 'test-results',

  // --- Global Setup / Teardown ---
  globalSetup: require.resolve('./config/global-setup'),
  globalTeardown: require.resolve('./config/global-teardown'),

  // --- Projects ---
  projects: [
    // === RMA Full Suite (Chromium) ===
    {
      name: 'rma',
      testDir: './tests/rma',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === Cross-Browser ===
    {
      name: 'rma-firefox',
      testDir: './tests/rma',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'rma-webkit',
      testDir: './tests/rma',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    // === Mobile ===
    {
      name: 'rma-mobile',
      testDir: './tests/rma',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
});
