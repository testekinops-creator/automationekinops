/**
 * config/environments.js
 * Multi-environment configuration for MyConnect RMA.
 */
const environments = {
  dev: {
    baseURL: 'https://myconnect-dev.ekinops.com',
    timeout: 45_000,
    retries: 0,
    description: 'Development Environment',
  },

  qa: {
    baseURL: 'https://myconnect-dev.ekinops.com',
    timeout: 45_000,
    retries: 1,
    description: 'QA / Testing Environment',
  },

  staging: {
    baseURL: 'https://myconnect-staging.ekinops.com',
    timeout: 45_000,
    retries: 2,
    description: 'Staging / Pre-Production Environment',
  },

  production: {
    baseURL: 'https://myconnect.ekinops.com',
    timeout: 60_000,
    retries: 3,
    description: 'Production Environment (read-only tests)',
  },
};

module.exports = environments;
