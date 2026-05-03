require('dotenv').config();

/**
 * RMAConstants - Centralized test data for MyConnect RMA module.
 * Replaces fixtures/testData.js with framework-standard Constants pattern.
 */
const RMAConstants = {
  // --- Base URL ---
  BASE_URL: process.env.RMA_BASE_URL || 'https://myconnect-dev.ekinops.com',

  // --- Test Users ---
  USERS: {
    adminUser: {
      displayName: 'Admin User',
      userType: 'Employee',
      email: process.env.RMA_ADMIN_EMAIL || 'administrator.test@rma.com',
      password: process.env.RMA_ADMIN_PASSWORD || 'Admin@1234567',
      role: 'Administrator',
    },
    rmaAdmin: {
      displayName: 'RMA Admin',
      userType: 'Employee',
      email: 'rma.admin@rma.com',
      password: 'RmaAdmin@1234567',
      role: 'RMA Admin',
    },
    repairEngineer: {
      displayName: 'Repair Engineer',
      userType: 'Employee',
      email: 'rma.engineer@rma.com',
      password: 'Engineer@1234567',
      role: 'RMA Repair Engineer',
    },
    repairWatcher: {
      displayName: 'Repair Watcher',
      userType: 'Employee',
      email: 'rma.watcher@rma.com',
      password: 'Watcher@1234567',
      role: 'RMA Repair Watcher',
    },
    customerOne: {
      displayName: 'Customer One',
      userType: 'Customer',
      email: 'customer.testaccess@rma.com',
      password: 'Customer@1234567',
      role: 'Customer User',
    },
    customerTwo: {
      displayName: 'Customer Two',
      userType: 'Customer',
      email: 'customer.testtransport@rma.com',
      password: 'Customer@1234567',
      role: 'Customer User',
    },
    systemUser: {
      displayName: 'System user',
      userType: 'System User',
      email: 'system.user@rma.com',
      password: 'System@1234567',
      role: 'System User',
    },
  },

  // --- RMA Test Data ---
  RMA: {
    validSerial: process.env.RMA_VALID_SERIAL || 'S0283505',
    invalidSerial: 'INVALID-SN-999',
    emptySerial: '',
    longSerial: 'A'.repeat(20),
    sqlInjection: "' OR '1'='1",
    xssPayload: '<script>alert("XSS")</script>',
    specialChars: 'SN@#$%!',

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
      onHold: 'On-Hold',
      repaired: 'Repaired',
      rejected: 'Rejected',
      closed: 'Closed',
    },

    statusColors: {
      Submitted: { bg: '#E3E8F0', text: '#546E7A' },
      Accepted: { bg: '#E8F5E9', text: '#2E7D32' },
      Received: { bg: '#E3F2FD', text: '#1565C0' },
      'On-Hold': { bg: '#FFF3E0', text: '#E65100' },
      Repaired: { bg: '#C8E6C9', text: '#1B5E20' },
      Rejected: { bg: '#FFEBEE', text: '#C62828' },
      Closed: { bg: '#F5F5F5', text: '#616161' },
    },
  },

  // --- Dashboard KPI Cards ---
  DASHBOARD: {
    employee: {
      pendingAccept: 'RMA - Pending Accept',
      inProgress: 'RMA In Progress',
      inProgressOver30: 'RMA In Progress - More than 30 days',
      submittedMore3Times: 'RMA Submitted More than 3 times',
      repairedNotClosed: 'RMA Repaired but not closed',
      acceptedNotReceived: 'RMA Accepted & Not Received',
    },
    customer: {
      awaitingDevice: 'RMA - Awaiting Device',
      inProgress: 'RMA In Progress',
      repaired: 'RMA Repaired',
    },
  },

  // --- URL Paths ---
  ROUTES: {
    login: '/login',
    rmaDashboard: '/rma',
    submitRma: '/rma/add',
    viewRma: '/rma/requests',
    factoryInsert: '/rma/factory-insert',
    factoryReceive: '/rma/factory-receive',
    manageAddress: '/rma/address',
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
  },
};

module.exports = RMAConstants;
