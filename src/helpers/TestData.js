/**
 * src/helpers/TestData.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Test Data Reader — provides guaranteed RMA IDs pre-created in global-setup.
 *
 * Usage in spec files:
 *   const TestData = require('../../../src/helpers/TestData');
 *   const { rmaId } = TestData.get('SUBMITTED');  // { rmaId, serial }
 *   const rmaId     = TestData.getId('ACCEPTED');  // just the ID string
 *
 * Available keys: SUBMITTED | ACCEPTED | RECEIVED | REPAIRED | ON_HOLD |
 *                 REJECTED  | CLOSED   | CUSTOMER_RMA
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const STATE_FILE = path.resolve(__dirname, '..', '..', '.auth', 'test-data-state.json');

let _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    if (fs.existsSync(STATE_FILE)) {
      _cache = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    _cache = {};
  }
  return _cache || {};
}

const TestData = {
  /**
   * Returns the full data entry for a status.
   * @param {'SUBMITTED'|'ACCEPTED'|'RECEIVED'|'REPAIRED'|'ON_HOLD'|'REJECTED'|'CLOSED'|'CUSTOMER_RMA'} status
   * @returns {{ rmaId: string, serial: string } | null}
   */
  get(status) {
    const state = load();
    return state[status] || null;
  },

  /**
   * Returns just the RMA ID for a status, or null if not available.
   */
  getId(status) {
    const entry = this.get(status);
    return entry ? entry.rmaId : null;
  },

  /**
   * Returns just the serial for a status.
   */
  getSerial(status) {
    const entry = this.get(status);
    return entry ? entry.serial : null;
  },

  /**
   * Returns true if the status has a valid pre-created RMA.
   */
  has(status) {
    const entry = this.get(status);
    return !!(entry && entry.rmaId);
  },

  /**
   * Returns the full state object (for debugging).
   */
  getAll() {
    return load();
  },

  /** Force reload from disk (useful if state file updated during run) */
  reload() {
    _cache = null;
    return load();
  },
};

module.exports = TestData;
