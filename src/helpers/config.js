/**
 * config.js — Centralized Environment Configuration
 *
 * Single source of truth for all environment-driven values.
 * Reads from .env (loaded by dotenv in playwright.config.js).
 *
 * Usage:
 *   const { BASE_URL, ENV_USERS, HEADLESS, BROWSER } = require('./config');
 *
 * Never read process.env directly in test/page files — always import from here.
 */

/** Base URL of the application under test */
const BASE_URL = process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com';

/** Current environment name (qa / staging / prod) */
const ENV = process.env.ENV || 'qa';

/** Run browser in headless mode */
const HEADLESS = process.env.HEADLESS !== 'false';

/** Browser to use (chromium / firefox / webkit) */
const BROWSER = process.env.BROWSER || 'chromium';

/** Log verbosity level for Winston (error / warn / info / debug) */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * All user credentials keyed by role name.
 * Matches the USERS object in Constants.js for drop-in compatibility.
 */
const ENV_USERS = {
  adminUser: {
    email: process.env.RMA_ADMIN_EMAIL || 'administrator.test@rma.com',
    password: process.env.RMA_ADMIN_PASSWORD || 'Admin@1234567',
  },
  rmaAdmin: {
    email: process.env.RMA_RMA_ADMIN_EMAIL || 'rma.admin@rma.com',
    password: process.env.RMA_RMA_ADMIN_PASSWORD || 'RmaAdmin@1234567',
  },
  repairEngineer: {
    email: process.env.RMA_ENGINEER_EMAIL || 'rma.engineer@rma.com',
    password: process.env.RMA_ENGINEER_PASSWORD || 'Engineer@1234567',
  },
  repairWatcher: {
    email: process.env.RMA_WATCHER_EMAIL || 'rma.watcher@rma.com',
    password: process.env.RMA_WATCHER_PASSWORD || 'Watcher@1234567',
  },
  customerOne: {
    email: process.env.RMA_CUSTOMER1_EMAIL || 'customer.testaccess@rma.com',
    password: process.env.RMA_CUSTOMER1_PASSWORD || 'Customer@1234567',
  },
  customerTwo: {
    email: process.env.RMA_CUSTOMER2_EMAIL || 'customer.testtransport@rma.com',
    password: process.env.RMA_CUSTOMER2_PASSWORD || 'Customer@1234567',
  },
  systemUser: {
    email: process.env.RMA_SYSTEM_EMAIL || 'system.user@rma.com',
    password: process.env.RMA_SYSTEM_PASSWORD || 'System@1234567',
  },
  inactivecustomer: {
    email: process.env.RMA_INACTIVE_EMAIL || 'inactive.customer@rma.com',
    password: process.env.RMA_INACTIVE_PASSWORD || 'Customer@1234567',
  },
  seccustomer: {
    email: process.env.RMA_SECCUSTOMER_EMAIL || 'customer.testaccess2@rma.com',
    password: process.env.RMA_SECCUSTOMER_PASSWORD || 'Customer@1234567',
  },
};

/** Valid serial numbers for test data */
const TEST_SERIALS = {
  valid: process.env.RMA_VALID_SERIAL || 'T1138004504037566',
  ciSerial: 'L1040003043099099',
  workflowSerial: 'S2513008343588978',
};

/** API Auth Token for cleanup helpers */
const AUTH_TOKEN = process.env.RMA_AUTH_TOKEN || '';

module.exports = {
  AUTH_TOKEN,
  BASE_URL,
  ENV,
  HEADLESS,
  BROWSER,
  LOG_LEVEL,
  ENV_USERS,
  TEST_SERIALS,
};
