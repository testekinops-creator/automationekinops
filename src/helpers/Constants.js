require('dotenv').config();

/**
 * Helper: read an env var or return a fallback.
 * In CI mode, missing critical vars will throw to fail fast.
 * @param {string} envKey  - Environment variable name
 * @param {string} fallback - Fallback value for local development
 * @returns {string}
 */
function env(envKey, fallback) {
  const value = process.env[envKey];
  if (value) return value;
  if (process.env.CI === 'true' && !fallback) {
    throw new Error(`Missing required env var in CI: ${envKey}`);
  }
  return fallback || '';
}

/**
 * RMAConstants - Centralized test data for MyConnect RMA module.
 *
 * SECURITY: All credentials are read from environment variables.
 * See .env.example for the full list of required variables.
 * Never commit real passwords to this file.
 */
const RMAConstants = {
  // --- Base URL ---
  BASE_URL: env('RMA_BASE_URL', 'https://myconnect-acc.ekinops.com'),

  // --- Test Users ---
  // All emails and passwords are externalized to environment variables.
  // Fallbacks are provided ONLY for local development convenience.
  USERS: {
    adminUser: {
      displayName: 'Admin User',
      userType: 'Employee',
      email: env('RMA_ADMIN_EMAIL', 'administrator.test@rma.com'),
      password: env('RMA_ADMIN_PASSWORD'),
      role: 'Administrator',
    },
    rmaAdmin: {
      displayName: 'RMA Admin',
      userType: 'Employee',
      email: env('RMA_RMA_ADMIN_EMAIL', 'rma.admin@rma.com'),
      password: env('RMA_RMA_ADMIN_PASSWORD'),
      role: 'RMA Admin',
    },
    repairEngineer: {
      displayName: 'Repair Engineer',
      userType: 'Employee',
      email: env('RMA_ENGINEER_EMAIL', 'rma.engineer@rma.com'),
      password: env('RMA_ENGINEER_PASSWORD'),
      role: 'RMA Repair Engineer',
    },
    repairWatcher: {
      displayName: 'Repair Watcher',
      userType: 'Employee',
      email: env('RMA_WATCHER_EMAIL', 'rma.watcher@rma.com'),
      password: env('RMA_WATCHER_PASSWORD'),
      role: 'RMA Repair Watcher',
    },
    customerOne: {
      displayName: 'Customer One',
      userType: 'Customer',
      email: env('RMA_CUSTOMER1_EMAIL', 'customer.testaccess@rma.com'),
      password: env('RMA_CUSTOMER1_PASSWORD'),
      role: 'Customer User',
    },
    customerTwo: {
      displayName: 'Customer Two',
      userType: 'Customer',
      email: env('RMA_CUSTOMER2_EMAIL', 'customer.testtransport@rma.com'),
      password: env('RMA_CUSTOMER2_PASSWORD'),
      role: 'Customer User',
    },
    systemUser: {
      displayName: 'System user',
      userType: 'System User',
      email: env('RMA_SYSTEM_EMAIL', 'system.user@rma.com'),
      password: env('RMA_SYSTEM_PASSWORD'),
      role: 'System User',
    },
    inactivecustomer: {
      displayName: 'Inactive Customer User',
      userType: 'Customer',
      email: env('RMA_INACTIVE_EMAIL', 'inactive.customer@rma.com'),
      password: env('RMA_INACTIVE_PASSWORD'),
      role: 'Customer User',
    },
    seccustomer: {
      displayName: 'Customer User',
      userType: 'Customer',
      email: env('RMA_SECCUSTOMER_EMAIL', 'customer.testaccess2@rma.com'),
      password: env('RMA_SECCUSTOMER_PASSWORD'),
      role: 'Customer User',
    },
  },

  // --- RMA Test Data ---
  RMA: {
    validSerial: process.env.RMA_VALID_SERIAL || 'T1138004504037565',
    validSerial2: 'L1040004215100962',
    invalidSerial: 'INVALID-SN-999',
    emptySerial: '',
    longSerial: 'A'.repeat(20),
    sqlInjection: "' OR '1'='1",
    xssPayload: '<script>alert("XSS")</script>',
    specialChars: 'SN@#$%!',

    // --- Standardised customer data for all RMA creation tests ---
    // All Submit RMA and Factory Insert tests MUST use these values.
    customerName: '1&1 VERSATEL GmbH',
    customerUsername: 'ACustomer One',

    rmaTypes: {
      standardRepair: 'Standard Repair',
      doa: 'DoA',
      refurbishment: 'Refurbishment',
      commercialReturn: 'Commercial Return',
    },

    noteForRepair: 'Automated test — device exhibiting boot loop issue. Factory reset performed with no resolution.',
    customerIntRef: 'AUTO-TEST-REF-001',

    statuses: {
      submitted: 'Submitted',
      accepted: 'Accepted',
      received: 'Received',
      onHold: 'On Hold',
      repaired: 'Repaired',
      rejected: 'Rejected',
      closed: 'Closed',
    },

    statusColors: {
      Submitted: { bg: '#E3E8F0', text: '#546E7A' },
      Accepted: { bg: '#E8F5E9', text: '#2E7D32' },
      Received: { bg: '#E3F2FD', text: '#1565C0' },
      'On Hold': { bg: '#FFF3E0', text: '#E65100' },
      Repaired: { bg: '#C8E6C9', text: '#1B5E20' },
      Rejected: { bg: '#FFEBEE', text: '#C62828' },
      Closed: { bg: '#F5F5F5', text: '#616161' },
    },
  },

  // --- Dashboard KPI Cards (actual text from the live application) ---
  DASHBOARD: {
    employee: {
      awaitingDevice: 'RMA - Awaiting Device',
      repairInProgress: 'RMA Repair In Progress',
      repaired: 'RMA Repaired',
      inProgress: 'RMA Repair In Progress',          // alias used in integration tests
      pendingAccept: 'RMA - Pending Accept',
      inProgressOver30: 'RMA - In Progress More Than 30 Days',
      acceptedNotReceived: 'RMA - Accepted & Not Received',
      submittedMore3Times: 'Open RMA - Submitted More Than 3 Times',
      repairedNotClosed: 'RMA - Repaired But Not Closed',
    },
    customer: {
      awaitingDevice: 'RMA - Awaiting Device',
      inProgress: 'RMA - In Progress',
      repaired: 'RMA - RMA Repaired',
    },
  },

  // --- URL Paths (actual routes from the live application) ---
  ROUTES: {
    login: '/login',
    home: '/home',
    rmaDashboard: '/rma/dashboard/',
    submitRma: '/rma/add',
    viewRma: '/rma/list',
    factoryInsert: '/rma/factory/add',
    factoryReceive: '/rma/factory/receive/',
    manageAddress: '/rma/manageaddr/',
    standardizedFaults: '/rma/standardizedfaults/list',
    editRma: '/rma/request/edit',  // append /<id> at runtime
  },

  // --- LHS Sidebar Navigation Items Per Role (from ACC Test spreadsheet Row 7) ---
  SIDEBAR: {
    adminEngineer: [
      'Dashboard', 'RMA Requests', 'Submit RMA Request',
      'Factory Insert RMA', 'Factory Receive RMA',
      'Manage Address', 'Standardized Faults',
    ],
    watcher: [
      'Dashboard', 'RMA Requests',
      // NOTE: Spreadsheet marks Submit RMA appearing for Watcher as a BUG (Fail).
      // Watcher should NOT see: Submit RMA Request, Factory Insert, Factory Receive
      'Manage Address',
    ],
    customer: [
      'Dashboard', 'RMA Requests', 'Submit RMA Request', 'Manage Address',
    ],
  },

  // --- RMA List Buttons Per Role (from ACC Test spreadsheet Row 8) ---
  LIST_BUTTONS: {
    adminEngineer: ['Submit RMA Request', 'Export To Excel', 'Filter Data'],
    watcher: ['Export To Excel', 'Filter Data'],
    customer: ['Submit RMA Request', 'Filter Data'],
  },

  // --- RMA List Grid Columns Per Role (from ACC Test spreadsheet Row 9) ---
  LIST_COLUMNS: {
    adminEngineerWatcher: ['RMA ID', 'Customer', 'Serial', 'Status', 'Submitted On', 'Last Updated On', 'Action'],
    customer: ['RMA ID', 'Serial', 'Status', 'Submitted On', 'Action'],
  },

  // --- Timeouts ---
  TIMEOUTS: {
    SHORT: 5_000,
    MEDIUM: 15_000,
    LONG: 30_000,
    NAVIGATION: 30_000,
  },

  // --- Error Messages ---
  ERRORS: {
    factoryReceiveNotFound: 'No request can be found for this serial number. Please ask your supervisor for assistance.',
    mandatoryField: 'This field is required',
    invalidEmail: 'Invalid email format',
    customerAndUserEmpty: 'Customer Name and Customer\'s Username should not be empty',
    serialInProgress: 'A RMA request for the provided serial number is in progress. Please contact your Ekinops sales representative or send an email to repair.contact@ekinops.com to submit the RMA request.',
    serialNotFound: 'Sorry, The serial number you have entered is not found in our system. Please contact your Ekinops sales representative or send an email to repair.contact@ekinops.com to submit the RMA request.',
    productCodeNotFound: 'Sorry, The Product Code you have entered is not found in our system',
    returnLocationRequired: 'The Return Location field is required.',
  },
};

module.exports = RMAConstants;
