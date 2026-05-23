// @ts-check
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');
const { getStorageStatePath } = require('./src/helpers/rmaAuthHelper');
const environments = require('./config/environments');

/**
 * Playwright Configuration — MyConnect RMA Automation Suite
 * @see https://playwright.dev/docs/test-configuration
 *
 * Uses storageState session caching to log in once per role,
 * eliminating server rate-limiting from 93+ per-test UI logins.
 *
 * Project execution order:
 *   auth-tests → rma-setup → rma (+ cross-browser: Firefox, WebKit)
 */

const ENV_KEY = process.env.ENV || 'qa';
const envConfig = environments[ENV_KEY] || environments.qa;
const RMA_BASE_URL = process.env.RMA_BASE_URL || envConfig.baseURL;

module.exports = defineConfig({
  // --- Test Directory ---
  testDir: './tests',
  testMatch: '**/*.spec.js',

  // --- Execution ---
  fullyParallel: true,        // Parallel execution — each test gets its own page
  workers: 4,                 // 4 parallel workers for speed
  forbidOnly: !!process.env.CI,

  // --- Retry & Timeout ---
  retries: 1,                 // Retry once to handle flaky network
  timeout: 60_000,
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
    video: 'off',               // Disabled for speed — enable when debugging
    trace: 'retain-on-failure',

    // --- Browser Settings ---
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    launchOptions: {
      args: ['--start-maximized'],   // full-screen window in --headed mode
    },

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

  // --- Projects (dependency chain) ---
  projects: [
    // ─── Phase 1: Auth Tests (real UI logins — no storageState) ───
    // These tests exercise the login/logout flow itself.
    // Runs first before rate-limiting can kick in (~9 logins).
    {
      name: 'auth-tests',
      testDir: './tests/rma',
      testMatch: 'auth.spec.js',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ─── Phase 2: Session Setup (cache one login per role) ───
    // Logs in once per user role and saves cookies to .auth/<role>.json.
    // Future roles: just add an entry in tests/auth.setup.js ROLES_TO_CACHE.
    {
      name: 'rma-setup',
      testDir: './tests',
      testMatch: 'auth.setup.js',
      dependencies: ['auth-tests'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ─── Phase 2b: Test Data Setup (create RMAs in all statuses) ───
    // Runs AFTER auth setup so .auth/*.json files exist.
    // Creates RMAs in Submitted/Accepted/Received/Repaired/On-Hold/Rejected/Closed.
    {
      name: 'data-setup',
      testDir: './tests',
      testMatch: 'test-data.setup.js',
      dependencies: ['rma-setup'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ─── Phase 3: RMA Full Suite (cached sessions — zero UI logins) ───
    // All spec files except auth.spec.js. Default storageState = rmaAdmin.
    // Tests needing a different role override via test.use({ storageState }).
    {
      name: 'rma',
      testDir: './tests/rma',
      testIgnore: ['auth.spec.js', '**/security/**/*.spec.js'],
      // Only match specs from subdirectories + root-level rbac
      // This naturally excludes legacy root-level duplicates (submit-rma, dashboard, etc.)
      testMatch: [
        '**/functional/**/*.spec.js',
        '**/regression/**/*.spec.js',
        '**/access/**/*.spec.js',
        'rbac.spec.js',
      ],
      dependencies: ['data-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: getStorageStatePath('rmaAdmin'),
      },
    },

    // === Cross-Browser — DISABLED per user request (Run 11) ===
    // Firefox run disabled — only Chromium tests active
    // {
    //   name: 'rma-firefox',
    //   testDir: './tests/rma',
    //   testIgnore: ['auth.spec.js'],
    //   dependencies: ['rma-setup'],
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     storageState: getStorageStatePath('rmaAdmin'),
    //   },
    // },
    // WebKit also removed — only Chrome active
  ],
});
