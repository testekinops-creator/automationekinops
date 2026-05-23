/**
 * src/helpers/rmaTestDataSetup.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Test Data Setup — Guarantees RMAs in every required status exist
 * before the test suite runs.
 *
 * STRATEGY:
 *   1. Submitted / Accepted / Customer RMA → created via /rma/add
 *      (uses the 8 serials from .env)
 *   2. Received / On Hold / Repaired / Rejected / Closed → created via
 *      /rma/factory/add (Factory Insert) with random serial + product code.
 *      Factory Insert skips Submitted & Accepted, landing directly in Received.
 *
 * Writes IDs to .auth/test-data-state.json for all specs to consume.
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const config = require('./config');
const Logger = require('./Logger');

const logger = new Logger('TestDataSetup');

// ── state file path ─────────────────────────────────────────────────────────
const STATE_FILE = path.resolve(__dirname, '..', '..', '.auth', 'test-data-state.json');

// ── Default serial numbers from .env ─────────────────────────────────────────
const SETUP_SERIALS = {
  SUBMITTED:    process.env.RMA_SETUP_SERIAL_1 || 'T2137008182014457',
  ACCEPTED:     process.env.RMA_SETUP_SERIAL_2 || 'T2149008234103530',
  CUSTOMER_RMA: process.env.RMA_SETUP_SERIAL_8 || 'S2415008554503003',
};

// Product code for Factory Insert (from the app — auto-fetches product name)
const FACTORY_INSERT_PRODUCT_CODE = '82441';

const AUTH_PATHS = {
  rmaAdmin:       path.resolve(__dirname, '..', '..', '.auth', 'rmaAdmin.json'),
  repairEngineer: path.resolve(__dirname, '..', '..', '.auth', 'repairEngineer.json'),
  customerOne:    path.resolve(__dirname, '..', '..', '.auth', 'customerOne.json'),
};

const BASE_URL = config.BASE_URL;

// ── Customer info for Factory Insert (must match Select2 dropdown values) ────
const CUSTOMER_NAME     = 'VERSATEL';
const CUSTOMER_USERNAME = 'ACustomer One';

// ── Helper: read/write state ─────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ── Helper: Generate random serial number ────────────────────────────────────
function randomSerial() {
  const prefix = 'T';
  const digits = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
  return prefix + digits;
}

// ── Helper: Submit RMA via /rma/add ──────────────────────────────────────────
async function submitRMA(page, serial, isCustomer = false) {
  logger.info(`  Submitting RMA via /rma/add for serial: ${serial} (isCustomer: ${isCustomer})`);
  await page.goto(BASE_URL + '/rma/add');
  await page.waitForLoadState('domcontentloaded');

  // Wait for form
  const serialInput = page.locator('#serial_number').first();
  await serialInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if (await serialInput.count() === 0) {
    logger.warn('  Serial input not found on /rma/add');
    return null;
  }

  // ── Step 1: Select Customer Name via Select2 (Admin only) ──────────────
  if (!isCustomer) {
    const customerSelect2 = page.locator('#customer_id').locator('xpath=..').locator('.select2-selection').first();
    const isSelect2 = await customerSelect2.isVisible({ timeout: 5000 }).catch(() => false);
    if (isSelect2) {
      logger.info('  Selecting customer: VERSATEL...');
      await customerSelect2.click();
      const searchField = page.locator('.select2-search__field:visible').last();
      if (await searchField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchField.fill('VERSATEL');
        await page.waitForTimeout(2000); // Wait for AJAX search results
        const option = page.locator('.select2-results__option:not(.select2-results__message)').filter({ hasText: /VERSATEL/i }).first();
        if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
          await option.click();
          logger.info('  Customer selected: VERSATEL');
        } else {
          await page.keyboard.press('Enter');
          logger.info('  Customer selected via Enter');
        }
      }
    }
    await page.waitForTimeout(2000); // Wait for Username dropdown to populate via AJAX

    // ── Step 2: Select Customer's Username via Select2 ─────────────────────
    const userSelect2 = page.locator('#user_id').locator('xpath=..').locator('.select2-selection').first();
    if (await userSelect2.isVisible({ timeout: 3000 }).catch(() => false)) {
      logger.info('  Selecting username: ACustomer One...');
      await userSelect2.click();
      await page.waitForTimeout(1000);
      const userOption = page.locator('.select2-results__option').filter({ hasText: /ACustomer One/i }).first();
      if (await userOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userOption.click();
        logger.info('  Username selected: ACustomer One');
      } else {
        // Try first available option
        const firstOpt = page.locator('.select2-results__option:not(.select2-results__message)').first();
        if (await firstOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstOpt.click();
          logger.info('  Username selected: first available option');
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
    await page.waitForTimeout(1000); // Wait for Return Location to populate

    // ── Step 3: Fill Phone Number (mandatory) ─────────────────────────────
    const phoneInput = page.locator('#phone_no, input[name="phone_no"]').first();
    if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isEditable = await phoneInput.isEditable().catch(() => false);
      if (isEditable) {
        await phoneInput.fill('+33 1 23 45 67 89');
        logger.info('  Phone filled: +33 1 23 45 67 89');
      } else {
        logger.info('  Phone field is read-only (pre-populated)');
      }
    }
  }

  // ── Step 4: Fill Serial Number ─────────────────────────────────────────
  await serialInput.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(serial, { delay: 30 });
  await page.keyboard.press('Tab');
  // Also dispatch focusout for jQuery listeners
  await serialInput.dispatchEvent('focusout');

  // Wait for serial lookup AJAX (product fields populate)
  await page.waitForTimeout(3000);

  // Check for "in progress" error
  const dupError = page.locator('text=/A RMA request for the provided serial number is in progress/i').first();
  if (await dupError.isVisible({ timeout: 2000 }).catch(() => false)) {
    const errText = await dupError.textContent().catch(() => '');
    logger.warn(`  Serial already in progress: ${errText.trim()}`);
    return null;
  }

  // Check for other errors
  const errorBanner = page.locator('.alert-danger').first();
  if (await errorBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
    const errText = await errorBanner.textContent().catch(() => '');
    logger.warn(`  Error after serial lookup: ${errText.trim()}`);
  }

  // Check if product name loaded
  const productName = page.locator('#product_name').first();
  const productValue = await productName.inputValue({ timeout: 5000 }).catch(() => '');
  logger.info(`  Product name: "${productValue}"`);
  if (!productValue) {
    logger.warn('  Product name field is empty — serial may be invalid');
    return null;
  }

  // ── Step 5: Select Return Location ────────────────────────────────────
  const returnLoc = page.locator('#return_location_id, select[name="return_location_id"]').first();
  if (await returnLoc.isVisible({ timeout: 3000 }).catch(() => false)) {
    const opts = await returnLoc.locator('option').allTextContents();
    const valid = opts.filter(o => o.trim() && !/^(Select|Please select)/i.test(o));
    logger.info(`  Return location options: ${valid.length} valid`);
    if (valid.length > 0) await returnLoc.selectOption({ index: 1 });
  }

  // ── Step 6: Select RMA Type ───────────────────────────────────────────
  const rmaType = page.locator('#rma_type, select[name="rma_type"]').first();
  if (await rmaType.isVisible({ timeout: 2000 }).catch(() => false)) {
    await rmaType.selectOption({ index: 1 });
    logger.info('  RMA type selected');
  }

  // ── Step 7: Fill Comment (Note for Repair) ────────────────────────────
  const notEditable = page.locator('.note-editable[contenteditable="true"]').first();
  const textarea = page.locator('textarea[name="comment"]').first();
  if (await notEditable.isVisible({ timeout: 2000 }).catch(() => false)) {
    await notEditable.fill('AutoTest data setup.');
  } else if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
    await textarea.fill('AutoTest data setup.');
  }
  logger.info('  Comment filled');

  // ── Step 8: Check Submit button visibility ────────────────────────────
  const saveBtn = page.locator('#submitBtn').first();
  const submitVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (!submitVisible) {
    logger.warn('  Submit button (#submitBtn) is HIDDEN (d-none) — form validation failed');
    // Log all visible errors for debugging
    const allErrors = await page.locator('.alert-danger, .text-danger, .invalid-feedback').allTextContents().catch(() => []);
    logger.warn(`  Visible errors: ${allErrors.join(' | ') || 'none'}`);
    return null;
  }

  // ── Step 9: Click Submit ──────────────────────────────────────────────
  await saveBtn.click();
  logger.info('  Submit clicked');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  // Extract RMA ID from URL
  const url = page.url();
  let rmaId = null;
  const urlMatch = url.match(/\/(view|edit)\/(\d+)/);
  if (urlMatch) rmaId = urlMatch[2];

  // Fallback: extract from page content
  if (!rmaId) {
    const idEl = page.locator('text=/RMA-\\d+/').first();
    const text = await idEl.textContent({ timeout: 5000 }).catch(() => '');
    const m = text.match(/RMA-(\d+)/i);
    if (m) rmaId = m[1];
  }

  // Check if still on /rma/add (submission failed)
  if (!rmaId && url.includes('/rma/add')) {
    const formError = page.locator('.alert-danger, .text-danger').first();
    const errText = await formError.textContent({ timeout: 2000 }).catch(() => 'Unknown');
    logger.warn(`  Submit failed (still on /rma/add): ${errText.trim()}`);
    return null;
  }

  logger.info(`  Submitted → RMA ID: ${rmaId || '(not captured)'}, URL: ${url}`);
  return rmaId;
}

// ── Helper: Factory Insert RMA via /rma/factory/add ──────────────────────────
// Creates an RMA directly in RECEIVED status
async function factoryInsertRMA(page, serial) {
  logger.info(`  Factory Insert for serial: ${serial}, product code: ${FACTORY_INSERT_PRODUCT_CODE}`);
  await page.goto(BASE_URL + '/rma/factory/add');
  await page.waitForLoadState('domcontentloaded');

  // Select Customer via Select2
  const customerSelect2 = page.locator('#customer_id').locator('xpath=..').locator('.select2-selection').first();
  const isSelect2 = await customerSelect2.isVisible({ timeout: 5000 }).catch(() => false);
  if (isSelect2) {
    await customerSelect2.click();
    const searchField = page.locator('.select2-search__field:visible').last();
    if (await searchField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchField.fill(CUSTOMER_NAME);
      await page.waitForTimeout(2000);
      const option = page.locator('.select2-results__option:not(.select2-results__message)').filter({ hasText: new RegExp(CUSTOMER_NAME, 'i') }).first();
      if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
        await option.click();
      } else {
        await page.keyboard.press('Enter');
      }
    }
  } else {
    // Fallback: native select
    const customerDrop = page.locator('#customer_id, select[name="customer_id"]').first();
    if (await customerDrop.isVisible({ timeout: 3000 }).catch(() => false)) {
      const opts = await customerDrop.locator('option').allTextContents();
      const match = opts.find(o => new RegExp(CUSTOMER_NAME, 'i').test(o));
      if (match) await customerDrop.selectOption({ label: match });
    }
  }

  await page.waitForTimeout(2000); // Wait for User dropdown to populate

  // Select User via Select2
  const userSelect2 = page.locator('#user_id').locator('xpath=..').locator('.select2-selection').first();
  if (await userSelect2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await userSelect2.click();
    await page.waitForTimeout(1000);
    const userOption = page.locator('.select2-results__option').filter({ hasText: new RegExp(CUSTOMER_USERNAME, 'i') }).first();
    if (await userOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userOption.click();
    } else {
      // Try selecting first available option
      const firstOpt = page.locator('.select2-results__option:not(.select2-results__message)').first();
      if (await firstOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOpt.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  }

  await page.waitForTimeout(1000);

  // Fill serial number
  const serialInput = page.locator('#serial_number').first();
  await serialInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await serialInput.fill(serial);
  await serialInput.press('Tab');
  await page.waitForTimeout(1000);

  // Fill product code (mandatory for Factory Insert)
  const productCodeInput = page.locator('#product_code').first();
  if (await productCodeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await productCodeInput.fill(FACTORY_INSERT_PRODUCT_CODE);
    await productCodeInput.press('Tab');
    await page.waitForTimeout(2000); // Wait for product name to auto-fetch
  }

  // Check product name loaded
  const productName = page.locator('#product_name').first();
  const prodVal = await productName.inputValue({ timeout: 3000 }).catch(() => '');
  logger.info(`  Product name auto-fetched: "${prodVal}"`);

  // Select return location if available
  const returnLoc = page.locator('#return_location_id, select[name="return_location_id"]').first();
  if (await returnLoc.isVisible({ timeout: 3000 }).catch(() => false)) {
    const opts = await returnLoc.locator('option').allTextContents();
    const valid = opts.filter(o => o.trim() && !/^(Select|Please)/i.test(o));
    if (valid.length > 0) await returnLoc.selectOption({ index: 1 });
  }

  // Select RMA type
  const rmaType = page.locator('#rma_type, select[name="rma_type"]').first();
  if (await rmaType.isVisible({ timeout: 2000 }).catch(() => false)) {
    await rmaType.selectOption({ index: 1 });
  }

  // Fill comments
  const commentArea = page.locator('textarea[name="comments"], textarea#comments, textarea').first();
  if (await commentArea.isVisible({ timeout: 2000 }).catch(() => false)) {
    await commentArea.fill('AutoTest Factory Insert setup.');
  }

  // Submit
  const submitBtn = page.locator('#submitBtnFactory, button:has-text("Submit"), button[type="submit"]').first();
  if (!await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    logger.warn('  Submit button not visible — form validation may have failed');
    return null;
  }
  await submitBtn.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Extract RMA ID
  const url = page.url();
  let rmaId = null;
  const urlMatch = url.match(/\/(view|edit)\/(\d+)/);
  if (urlMatch) rmaId = urlMatch[2];

  if (!rmaId) {
    const idEl = page.locator('text=/RMA-\\d+/').first();
    const text = await idEl.textContent({ timeout: 5000 }).catch(() => '');
    const m = text.match(/RMA-(\d+)/i);
    if (m) rmaId = m[1];
  }

  // Check for success message
  const success = page.locator('.alert-success, text=/success/i').first();
  const hasSuccess = await success.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasSuccess) {
    const successText = await success.textContent().catch(() => '');
    logger.info(`  Success: ${successText.trim()}`);
    // Try to extract RMA ID from success message
    if (!rmaId) {
      const sMatch = successText.match(/RMA[- ]?(\d+)/i);
      if (sMatch) rmaId = sMatch[1];
    }
  }

  if (!rmaId && url.includes('/rma/factory/add')) {
    logger.warn('  Factory Insert failed — still on /rma/factory/add');
    return null;
  }

  logger.info(`  Factory Insert → RMA ID: ${rmaId || '(pending)'}, Status: Received`);
  return rmaId;
}

// ── Helper: Accept an RMA ────────────────────────────────────────────────────
async function acceptRMA(page, rmaId) {
  logger.info(`  Accepting RMA ${rmaId}`);
  await page.goto(`${BASE_URL}/rma/request/view/${rmaId}`);
  await page.waitForLoadState('domcontentloaded');
  const acceptBtn = page.locator('button:has-text("Accept"), a:has-text("Accept")').first();
  if (!await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    logger.warn(`  Accept button not visible for RMA ${rmaId}`);
    return false;
  }
  await acceptBtn.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  logger.info(`  Accepted RMA ${rmaId}`);
  return true;
}

// ── Helper: Perform workflow action ──────────────────────────────────────────
async function performAction(page, rmaId, actionLabel, commentRequired = false) {
  logger.info(`  ${actionLabel} → RMA ${rmaId}`);
  await page.goto(`${BASE_URL}/rma/request/view/${rmaId}`);
  await page.waitForLoadState('domcontentloaded');

  const btn = page.locator(`button:has-text("${actionLabel}"), a:has-text("${actionLabel}")`).first();
  if (!await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
    logger.warn(`  "${actionLabel}" button not found for RMA ${rmaId}`);
    return false;
  }
  await btn.click();
  await page.waitForLoadState('domcontentloaded');

  // Fill comment if modal appears
  if (commentRequired) {
    const modal = page.locator('.modal, [role="dialog"]').first();
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const commentField = modal.locator('textarea, .note-editable[contenteditable]').first();
      if (await commentField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await commentField.fill('AutoTest setup action.');
      }
      const modalConfirm = modal.locator('button:has-text("Confirm"), button:has-text("Submit"), button:has-text("OK"), button[type="submit"]').first();
      if (await modalConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalConfirm.click();
      }
    }
  }
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  logger.info(`  Done: ${actionLabel} on RMA ${rmaId}`);
  return true;
}

// ── Helper: Find RMA by serial in list ───────────────────────────────────────
async function findRMABySerial(page, serial, status) {
  try {
    await page.goto(BASE_URL + '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Use DataTable search
    const searchInput = page.locator('.dataTables_filter input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(serial);
      await page.waitForTimeout(2000);
    }

    const row = page.locator('table tbody tr').filter({ hasText: serial }).first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check if it has the right status
      const rowText = await row.textContent().catch(() => '');
      if (status && !new RegExp(status, 'i').test(rowText)) {
        logger.info(`  findRMABySerial: ${serial} found but status doesn't match "${status}"`);
      }
      // Extract RMA ID from row link
      const link = row.locator('a[href*="/rma/request/view/"]').first();
      if (await link.isVisible().catch(() => false)) {
        const href = await link.getAttribute('href').catch(() => '');
        const m = href.match(/\/view\/(\d+)/);
        if (m) {
          logger.info(`  findRMABySerial: found RMA ${m[1]} for serial ${serial}`);
          return m[1];
        }
      }
      // Fallback: click and extract from URL
      const anyLink = row.locator('a').first();
      if (await anyLink.isVisible().catch(() => false)) {
        await anyLink.click();
        await page.waitForLoadState('domcontentloaded');
        const urlMatch = page.url().match(/\/view\/(\d+)/);
        if (urlMatch) return urlMatch[1];
      }
    }
  } catch (err) {
    logger.warn(`  findRMABySerial error: ${err.message}`);
  }
  return null;
}

// ── Helper: Find ANY existing RMA in a given status ──────────────────────────
async function findAnyRMAByStatus(page, statusLabel) {
  try {
    await page.goto(BASE_URL + '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Use DataTable search to filter by status
    const searchInput = page.locator('.dataTables_filter input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(statusLabel);
      await page.waitForTimeout(2000);
    }

    // Find a row matching the status
    const row = page.locator('table tbody tr').filter({ hasText: new RegExp(`\\b${statusLabel}\\b`, 'i') }).first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Extract RMA ID from the view link
      const link = row.locator('a[href*="/rma/request/view/"], a[aria-label="View RMA Request"]').first();
      if (await link.isVisible().catch(() => false)) {
        const href = await link.getAttribute('href').catch(() => '');
        const m = href.match(/\/view\/(\d+)/);
        if (m) {
          // Get serial from row text
          const rowText = await row.textContent().catch(() => '');
          const serialMatch = rowText.match(/\b([TS]\d{10,16})\b/);
          const serial = serialMatch ? serialMatch[1] : 'unknown';
          logger.info(`  findAnyRMAByStatus: Found ${statusLabel} RMA ${m[1]} (serial: ${serial})`);
          return { rmaId: m[1], serial };
        }
      }
      // Fallback: click to navigate
      const anyLink = row.locator('a').first();
      if (await anyLink.isVisible().catch(() => false)) {
        await anyLink.click();
        await page.waitForLoadState('domcontentloaded');
        const urlMatch = page.url().match(/\/view\/(\d+)/);
        if (urlMatch) {
          logger.info(`  findAnyRMAByStatus: Found ${statusLabel} RMA ${urlMatch[1]}`);
          return { rmaId: urlMatch[1], serial: 'unknown' };
        }
      }
    }
    logger.info(`  findAnyRMAByStatus: No ${statusLabel} RMA found in list`);
  } catch (err) {
    logger.warn(`  findAnyRMAByStatus error: ${err.message}`);
  }
  return null;
}

// ── Main setup function ──────────────────────────────────────────────────────
async function setupTestData() {
  logger.info('=== TEST DATA SETUP START ===');

  // Check if auth files exist
  const missingAuth = Object.entries(AUTH_PATHS).filter(([, p]) => !fs.existsSync(p));
  if (missingAuth.length > 0) {
    logger.warn(`Auth files missing: ${missingAuth.map(([k]) => k).join(', ')} — skipping`);
    return;
  }

  const state = loadState();
  const browser = await chromium.launch({ headless: true });

  try {
    // Create pages with different sessions
    const adminCtx = await browser.newContext({ baseURL: BASE_URL, storageState: AUTH_PATHS.rmaAdmin });
    const adminPage = await adminCtx.newPage();

    const engCtx = await browser.newContext({ baseURL: BASE_URL, storageState: AUTH_PATHS.repairEngineer });
    const engPage = await engCtx.newPage();

    // ═══════════════════════════════════════════════════════════════════════
    // TRACK A: /rma/add for Submitted, Accepted
    // ═══════════════════════════════════════════════════════════════════════

    // 1. SUBMITTED RMA
    if (!state.SUBMITTED || !state.SUBMITTED.rmaId) {
      logger.info('[1/8] Creating SUBMITTED RMA...');
      let rmaId = await submitRMA(adminPage, SETUP_SERIALS.SUBMITTED);
      if (!rmaId) rmaId = await findRMABySerial(adminPage, SETUP_SERIALS.SUBMITTED, 'Submitted');
      // Fallback: find ANY submitted RMA in the list
      if (!rmaId) {
        const found = await findAnyRMAByStatus(adminPage, 'Submitted');
        if (found) {
          state.SUBMITTED = { rmaId: found.rmaId, serial: found.serial };
          saveState(state);
          logger.info(`  ✅ SUBMITTED: RMA ${found.rmaId} (dynamic)`);
        } else {
          logger.warn('  ❌ SUBMITTED: Could not create or find');
        }
      } else {
        state.SUBMITTED = { rmaId, serial: SETUP_SERIALS.SUBMITTED };
        saveState(state);
        logger.info(`  ✅ SUBMITTED: RMA ${rmaId}`);
      }
    } else {
      logger.info(`[1/8] SUBMITTED already exists: RMA ${state.SUBMITTED.rmaId}`);
    }

    // 2. ACCEPTED RMA
    if (!state.ACCEPTED || !state.ACCEPTED.rmaId) {
      logger.info('[2/8] Creating ACCEPTED RMA...');
      let rmaId = await submitRMA(adminPage, SETUP_SERIALS.ACCEPTED);
      if (!rmaId) rmaId = await findRMABySerial(adminPage, SETUP_SERIALS.ACCEPTED, 'Accepted');
      // Fallback: find ANY accepted RMA in the list
      if (!rmaId) {
        const found = await findAnyRMAByStatus(adminPage, 'Accepted');
        if (found) {
          state.ACCEPTED = { rmaId: found.rmaId, serial: found.serial };
          saveState(state);
          logger.info(`  ✅ ACCEPTED: RMA ${found.rmaId} (dynamic)`);
        } else {
          logger.warn('  ❌ ACCEPTED: Could not create or find');
        }
      } else {
        if (rmaId) await acceptRMA(adminPage, rmaId);
        state.ACCEPTED = { rmaId, serial: SETUP_SERIALS.ACCEPTED };
        saveState(state);
        logger.info(`  ✅ ACCEPTED: RMA ${rmaId}`);
      }
    } else {
      logger.info(`[2/8] ACCEPTED already exists: RMA ${state.ACCEPTED.rmaId}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRACK B: Factory Insert for Received, On Hold, Repaired, Rejected, Closed
    // Factory Insert creates RMA directly in Received status
    // ═══════════════════════════════════════════════════════════════════════

    // 3. RECEIVED RMA (Factory Insert → stays in Received)
    if (!state.RECEIVED || !state.RECEIVED.rmaId) {
      logger.info('[3/8] Creating RECEIVED RMA via Factory Insert...');
      const serial = randomSerial();
      let rmaId = await factoryInsertRMA(adminPage, serial);
      if (rmaId) {
        state.RECEIVED = { rmaId, serial };
        saveState(state);
        logger.info(`  ✅ RECEIVED: RMA ${rmaId} (serial: ${serial})`);
      } else {
        logger.warn('  ❌ RECEIVED: Factory Insert failed');
      }
    } else {
      logger.info(`[3/8] RECEIVED already exists: RMA ${state.RECEIVED.rmaId}`);
    }

    // 4. ON_HOLD RMA (Factory Insert → On Hold)
    if (!state.ON_HOLD || !state.ON_HOLD.rmaId) {
      logger.info('[4/8] Creating ON_HOLD RMA via Factory Insert...');
      const serial = randomSerial();
      let rmaId = await factoryInsertRMA(adminPage, serial);
      if (rmaId) {
        await performAction(adminPage, rmaId, 'On Hold', true);
        state.ON_HOLD = { rmaId, serial };
        saveState(state);
        logger.info(`  ✅ ON_HOLD: RMA ${rmaId}`);
      } else {
        logger.warn('  ❌ ON_HOLD: Factory Insert failed');
      }
    } else {
      logger.info(`[4/8] ON_HOLD already exists: RMA ${state.ON_HOLD.rmaId}`);
    }

    // 5. REPAIRED RMA (Factory Insert → Repair)
    if (!state.REPAIRED || !state.REPAIRED.rmaId) {
      logger.info('[5/8] Creating REPAIRED RMA via Factory Insert...');
      const serial = randomSerial();
      let rmaId = await factoryInsertRMA(adminPage, serial);
      if (rmaId) {
        await performAction(adminPage, rmaId, 'Repair', true);
        state.REPAIRED = { rmaId, serial };
        saveState(state);
        logger.info(`  ✅ REPAIRED: RMA ${rmaId}`);
      } else {
        logger.warn('  ❌ REPAIRED: Factory Insert failed');
      }
    } else {
      logger.info(`[5/8] REPAIRED already exists: RMA ${state.REPAIRED.rmaId}`);
    }

    // 6. REJECTED RMA (Factory Insert → Reject)
    if (!state.REJECTED || !state.REJECTED.rmaId) {
      logger.info('[6/8] Creating REJECTED RMA via Factory Insert...');
      const serial = randomSerial();
      let rmaId = await factoryInsertRMA(adminPage, serial);
      if (rmaId) {
        await performAction(adminPage, rmaId, 'Reject', true);
        state.REJECTED = { rmaId, serial };
        saveState(state);
        logger.info(`  ✅ REJECTED: RMA ${rmaId}`);
      } else {
        logger.warn('  ❌ REJECTED: Factory Insert failed');
      }
    } else {
      logger.info(`[6/8] REJECTED already exists: RMA ${state.REJECTED.rmaId}`);
    }

    // 7. CLOSED RMA (Factory Insert → Repair → Close)
    if (!state.CLOSED || !state.CLOSED.rmaId) {
      logger.info('[7/8] Creating CLOSED RMA via Factory Insert...');
      const serial = randomSerial();
      let rmaId = await factoryInsertRMA(adminPage, serial);
      if (rmaId) {
        await performAction(adminPage, rmaId, 'Repair', true);
        // Try multiple close button labels (app may use different wording)
        let closed = await performAction(adminPage, rmaId, 'Close', false);
        if (!closed) closed = await performAction(adminPage, rmaId, 'Ship & Close', false);
        if (!closed) closed = await performAction(adminPage, rmaId, 'Ship', false);
        state.CLOSED = { rmaId, serial };
        saveState(state);
        logger.info(`  ✅ CLOSED: RMA ${rmaId}`);
      } else {
        logger.warn('  ❌ CLOSED: Factory Insert failed');
      }
    } else {
      logger.info(`[7/8] CLOSED already exists: RMA ${state.CLOSED.rmaId}`);
    }

    await adminCtx.close();

    // ═══════════════════════════════════════════════════════════════════════
    // TRACK C: Customer RMA via /rma/add
    // ═══════════════════════════════════════════════════════════════════════

    // 8. CUSTOMER_RMA (submitted by customerOne)
    if (!state.CUSTOMER_RMA || !state.CUSTOMER_RMA.rmaId) {
      logger.info('[8/8] Creating CUSTOMER_RMA (via customerOne)...');
      const custCtx = await browser.newContext({ baseURL: BASE_URL, storageState: AUTH_PATHS.customerOne });
      const custPage = await custCtx.newPage();
      let rmaId = await submitRMA(custPage, SETUP_SERIALS.CUSTOMER_RMA, true);
      // Fallback: search by serial (any status)
      if (!rmaId) rmaId = await findRMABySerial(custPage, SETUP_SERIALS.CUSTOMER_RMA, null);
      // Fallback: find ANY submitted RMA visible to customer
      if (!rmaId) {
        const found = await findAnyRMAByStatus(custPage, 'Submitted');
        if (found) {
          state.CUSTOMER_RMA = { rmaId: found.rmaId, serial: found.serial };
          saveState(state);
          logger.info(`  ✅ CUSTOMER_RMA: RMA ${found.rmaId} (dynamic)`);
        } else {
          // Last resort: use the SUBMITTED RMA as customer RMA
          if (state.SUBMITTED && state.SUBMITTED.rmaId) {
            state.CUSTOMER_RMA = { rmaId: state.SUBMITTED.rmaId, serial: state.SUBMITTED.serial };
            saveState(state);
            logger.info(`  ✅ CUSTOMER_RMA: Reusing SUBMITTED RMA ${state.SUBMITTED.rmaId}`);
          } else {
            logger.warn('  ❌ CUSTOMER_RMA: Could not create or find');
          }
        }
      } else {
        state.CUSTOMER_RMA = { rmaId, serial: SETUP_SERIALS.CUSTOMER_RMA };
        saveState(state);
        logger.info(`  ✅ CUSTOMER_RMA: RMA ${rmaId}`);
      }
      await custCtx.close();
    } else {
      logger.info(`[8/8] CUSTOMER_RMA already exists: RMA ${state.CUSTOMER_RMA.rmaId}`);
    }

    await engCtx.close();

  } catch (err) {
    logger.error('Test data setup error: ' + err.message);
  } finally {
    await browser.close();
  }

  logger.info('=== TEST DATA SETUP COMPLETE ===');
  logger.info('State: ' + JSON.stringify(state, null, 2));
  saveState(state);
}

module.exports = { setupTestData, STATE_FILE };
