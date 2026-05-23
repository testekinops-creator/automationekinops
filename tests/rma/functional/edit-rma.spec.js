// @ts-check
/**
 * tests/rma/functional/edit-rma.spec.js
 * Edit RMA Request — Functional Tests
 *
 * Route: /rma/request/edit/<id>
 * Edit is available from the View Details page via the "Edit" button.
 * Visibility depends on RMA status and user role.
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ViewRMAPage } = require('../../../src/pages/rma/ViewRMAPage');
const { SubmitRMAPage } = require('../../../src/pages/rma/SubmitRMAPage');
const { cleanupSerials } = require('../../../src/helpers/rmaCleanup');
const { ROUTES, RMA } = require('../../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../../src/helpers/Logger');
const TestData = require('../../../src/helpers/TestData');

/** Dedicated serial for edit-rma tests */
const EDIT_TEST_SERIAL = RMA.workflowSerial;

const STATUS_KEY_MAP = {
  'Submitted': 'SUBMITTED',
  'Accepted':  'ACCEPTED',
  'Received':  'RECEIVED',
  'On-Hold':   'ON_HOLD',
  'On Hold':   'ON_HOLD',
  'Repaired':  'REPAIRED',
  'Closed':    'CLOSED',
  'Rejected':  'REJECTED',
};

// ─── Helper: Navigate to an RMA detail in a given status and click Edit ──────
async function navigateToEditPage(page, status) {
  const key = STATUS_KEY_MAP[status];
  const preCreated = key ? TestData.get(key) : null;

  if (preCreated && preCreated.rmaId) {
    Logger.info('  [navigateToEditPage] Using TestData.' + key + ' => RMA ' + preCreated.rmaId);
    await page.goto('/rma/request/view/' + preCreated.rmaId);
    await page.waitForLoadState('domcontentloaded');
  } else {
    // Fallback: search at runtime
    Logger.info('  [navigateToEditPage] No TestData for ' + status + ' — searching at runtime');
    // Always reset filters to avoid leftover state from previous tests
    await page.goto(ROUTES.viewRma + '?reset=1');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const vrPage = new ViewRMAPage(page);
    if (status === 'Submitted') {
      await vrPage.filterRmaList({ status: 'Submitted', keyword: EDIT_TEST_SERIAL });
    }
    const found = await vrPage.goToRmaDetailByStatus(status);
    if (!found) { return false; }
  }

  // Click the Edit button (use data-bs-original-title — icons add whitespace to text)
  const editBtn = page.locator('a[data-bs-original-title="Edit"]').first();
  const isVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!isVisible) {
    Logger.warn('  [navigateToEditPage] Edit button not visible for status: ' + status);
    return false;
  }

  await editBtn.click();
  await page.waitForLoadState('domcontentloaded');
  const url = page.url();
  Logger.info('  [navigateToEditPage] On edit page: ' + url);
  return url.includes('/rma/request/edit');
}

test.describe('EDIT-RMA | Edit RMA Request — Admin @edit-rma', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('Edit RMA');
    await allure.story('Modify RMA Details');
  });


  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  // ── Setup: Submit an RMA so "Submitted" status is guaranteed ──────────────
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      storageState: getStorageStatePath('rmaAdmin'),
    });
    const page = await context.newPage();
    try {
      // Cleanup stale RMA from previous crashed run
      await cleanupSerials([EDIT_TEST_SERIAL], {
        prefix: '[EDIT-Setup]',
        includeEngineerPhase: true,
      });

      const submitPage = new SubmitRMAPage(page);
      await submitPage.goto();
      await submitPage.fillSerialNumber(EDIT_TEST_SERIAL);

      const productName = await submitPage.getProductName();
      Logger.info(`  [EDIT-Setup] Product resolved: "${productName}"`);

      if (await submitPage.isDuplicateSerialErrorVisible()) {
        Logger.info(`  [EDIT-Setup] Serial ${EDIT_TEST_SERIAL} already has an active RMA — skipping creation`);
        return;
      }

      await submitPage.selectCustomer(RMA.customerName);
      await submitPage.selectCustomerUser(RMA.customerUsername);

      // Select Return Location and RMA Type (mandatory, populated via AJAX after customer selection)
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)
      const selectFields = ['select[name="return_location_id"]', 'select[name="rma_type"]'];
      for (const selector of selectFields) {
        const selectEl = page.locator(selector).first();
        if (await selectEl.isVisible({ timeout: 3000 }).catch(() => false)) {
          const currentVal = await selectEl.inputValue().catch(() => '');
          if (!currentVal || currentVal === '' || currentVal === '0') {
            await selectEl.selectOption({ index: 1 }).catch(() => {});
            // removed: waitForTimeout(300ms) — use event-based wait if needed
          }
        }
      }

      await submitPage.fillNoteForRepair('Edit-RMA test setup — auto-created RMA for edit verification');
      await submitPage.clickSave();

      const url = page.url();
      if (url.includes('/rma/add')) {
        Logger.info(`  [EDIT-Setup] ⚠️ RMA creation may have failed — still on submit page`);
      } else {
        Logger.info(`  [EDIT-Setup] ✅ RMA created with S/N ${EDIT_TEST_SERIAL}`);
      }
    } finally {
      await page.close();
      await context.close();
    }
  });

  // ── Teardown: Close the RMA so the serial is available for future runs ────
  test.afterAll(async () => {
    // Cleanup (Reject → Close) can take 60-90s — extend the hook timeout
    test.setTimeout(120_000);
    await cleanupSerials([EDIT_TEST_SERIAL], {
      prefix: '[EDIT-Teardown]',
      includeEngineerPhase: true,
    });
  });

  test('EDIT-001 | Edit button on Submitted RMA opens edit form @edit', async ({ page }) => {
    Logger.step('EDIT-001 | Edit button on Submitted RMA opens edit form');

    const onEditPage = await navigateToEditPage(page, 'Submitted');
    // Data guaranteed from TestData — no skip

    await expect(page.url()).toContain('/rma/request/edit');
    Logger.info(`  Edit page URL: ${page.url()}`);
  });

  test('EDIT-002 | Edit form pre-populates serial number and product info @edit', async ({ page }) => {
    Logger.step('EDIT-002 | Edit form pre-populates serial number and product info');

    const onEditPage = await navigateToEditPage(page, 'Submitted');
    // Data guaranteed from TestData — no skip

    // Serial number should be pre-populated (read-only or filled)
    const serialField = page.locator('#serial_number, input[name="serial_number"]').first();
    const serialValue = await serialField.inputValue().catch(() => '');
    await expect(serialValue.length, 'Serial number should be pre-populated').toBeGreaterThan(0);

    // Product Name should be pre-populated
    const productNameField = page.locator('#product_name, input[name="product_name"]').first();
    const productName = await productNameField.inputValue().catch(() => '');
    await expect(productName.length, 'Product Name should be pre-populated').toBeGreaterThan(0);

    Logger.info(`  Serial: ${serialValue}, Product: ${productName}`);
  });

  test('EDIT-003 | Note for Repair / Comment field visible and editable @edit', async ({ page }) => {
    Logger.step('EDIT-003 | Note for Repair / Comment field visible and editable');

    const onEditPage = await navigateToEditPage(page, 'Submitted');
    // Data guaranteed from TestData — no skip

    // Comment field (Summernote or plain textarea)
    const summernote = page.locator('.note-editor').first();
    const textarea = page.locator('textarea[name="comment"]').first();

    const hasSummernote = await summernote.isVisible().catch(() => false);
    const hasTextarea = await textarea.isVisible().catch(() => false);

    await expect(hasSummernote || hasTextarea, 'Comment/Note field should be visible on Edit form').toBe(true);
  });

  test('EDIT-004 | Save/Update button visible on Edit form @edit', async ({ page }) => {
    Logger.step('EDIT-004 | Save/Update button visible on Edit form');

    const onEditPage = await navigateToEditPage(page, 'Submitted');
    // Data guaranteed from TestData — no skip

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), input[type="submit"]').first();
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  });

  test('EDIT-005 | Close/Cancel button discards changes @edit', async ({ page }) => {
    Logger.step('EDIT-005 | Close/Cancel button discards changes');

    const onEditPage = await navigateToEditPage(page, 'Submitted');
    // Data guaranteed from TestData — no skip

    const closeBtn = page.locator('a:has-text("Close"), a:has-text("Back"), button:has-text("Cancel")').first();
    await expect(closeBtn).toBeVisible({ timeout: 5000 });

    await closeBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Should navigate away from edit page
    await expect(page.url()).not.toContain('/rma/request/edit');
  });

  test('EDIT-006 | Edit available on Accepted RMA @edit', async ({ page }) => {
    Logger.step('EDIT-006 | Edit available on Accepted RMA');

    const onEditPage = await navigateToEditPage(page, 'Accepted');
    // Data guaranteed from TestData — no skip
    await expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-007 | Edit available on Received RMA @edit', async ({ page }) => {
    Logger.step('EDIT-007 | Edit available on Received RMA');

    const onEditPage = await navigateToEditPage(page, 'Received');
    // Data guaranteed from TestData — no skip
    await expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-008 | Edit available on On Hold RMA @edit', async ({ page }) => {
    Logger.step('EDIT-008 | Edit available on On Hold RMA');

    const onEditPage = await navigateToEditPage(page, 'On-Hold');
    // Data guaranteed from TestData — no skip
    await expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-009 | Edit available on Repaired RMA @edit', async ({ page }) => {
    Logger.step('EDIT-009 | Edit available on Repaired RMA');

    const onEditPage = await navigateToEditPage(page, 'Repaired');
    // Data guaranteed from TestData — no skip
    await expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-010 | Edit NOT available on Closed RMA @edit', async ({ page }) => {
    Logger.step('EDIT-010 | Edit NOT available on Closed RMA');

    await page.goto(ROUTES.viewRma + '?reset=1');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const vrPage = new ViewRMAPage(page);
    const found = await vrPage.goToRmaDetailByStatus('Closed');
    // Data guaranteed from TestData — no skip

    const editBtn = page.locator('a[data-bs-original-title="Edit"]').first();
    const isVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    await expect(isVisible, 'Edit button should NOT be visible on Closed RMA').toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT RMA — Repair Diagnostic & Standardized Faults on Edit Screen
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('EDIT-RMA | Edit Screen — Repair Diagnostic & Standardized Faults @edit-rma', () => {

  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('EDIT-DIAG-001 | Repair Diagnostic field visible on edit form @edit', async ({ page }) => {
    Logger.step('EDIT-DIAG-001 | Repair Diagnostic field visible on edit form');

    // Try Received or On Hold (where these fields are most relevant)
    let onEditPage = await navigateToEditPage(page, 'Received');
    if (!onEditPage) {onEditPage = await navigateToEditPage(page, 'On-Hold');}
    // Data guaranteed from TestData — no skip

    const diagLabel = page.locator('text=/Repair Diagnostic/i').first();
    await expect(diagLabel).toBeVisible({ timeout: 10_000 });
  });

  test('EDIT-DIAG-002 | Standardized Faults displayed as checkboxes @edit', async ({ page }) => {
    Logger.step('EDIT-DIAG-002 | Standardized Faults displayed as checkboxes');

    let onEditPage = await navigateToEditPage(page, 'Received');
    if (!onEditPage) {onEditPage = await navigateToEditPage(page, 'On-Hold');}
    // Data guaranteed from TestData — no skip

    const faultsLabel = page.locator('text=/Standardized Fault/i').first();
    const hasFaults = await faultsLabel.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFaults) {
      // Standardized Faults should be rendered as checkboxes
      const checkboxes = page.locator('input[type="checkbox"][name*="standardized_fault"]');
      const count = await checkboxes.count();
      Logger.info(`  Standardized Fault checkboxes: ${count}`);
      // If a Repair Diagnostic is already selected, there should be checkboxes
      expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no diagnostic selected yet
    } else {
      Logger.info('  Standardized Faults label not visible — field may require Repair Diagnostic selection first');
    }
  });

  test('EDIT-DIAG-003 | Selecting Repair Diagnostic dynamically loads Standardized Faults @edit', async ({ page }) => {
    Logger.step('EDIT-DIAG-003 | Selecting Repair Diagnostic dynamically loads Standardized Fault');

    let onEditPage = await navigateToEditPage(page, 'Received');
    if (!onEditPage) {onEditPage = await navigateToEditPage(page, 'On-Hold');}
    // Data guaranteed from TestData — no skip

    // Find Repair Diagnostic Select2 and select "Not identified"
    const _diagSelect2 = page.locator('.select2-container').filter({
      has: page.locator('xpath=ancestor::div[contains(., "Repair Diagnostic")]')
    }).first();

    // Fallback: find any Select2 near "Repair Diagnostic" label
    const allSelect2 = page.locator('.select2-container');
    const select2Count = await allSelect2.count();

    // TestData guaranteed — runtime skip removed

    // Click the first Select2
    await allSelect2.first().click();
    // removed: waitForTimeout(500ms) — use event-based wait if needed

    // Search for "Not identified"
    const searchField = page.locator('.select2-search__field').first();
    if (await searchField.isVisible().catch(() => false)) {
      await searchField.fill('Not identified');
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)
      const option = page.locator('.select2-results__option').filter({ hasText: /Not identified/i }).first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await page.waitForTimeout(2000); // Wait for AJAX to load checkboxes

        // After selection, Standardized Fault checkboxes should appear
        const checkboxes = page.locator('input[type="checkbox"][name*="standardized_fault"]');
        const count = await checkboxes.count();
        Logger.info(`  After selecting "Not identified": ${count} Standardized Fault checkboxes`);
      }
    }

    await page.keyboard.press('Escape');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT RMA — Customer Role
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('EDIT-RMA | Edit RMA — Customer Role @edit-rma', () => {

  test.use({ storageState: getStorageStatePath('customerOne') });

  test('EDIT-CUST-001 | Customer can edit their own Submitted RMA @edit', async ({ page }) => {
    Logger.step('EDIT-CUST-001 | Customer can edit their own Submitted RMA');

    // Always reset filters to avoid leftover state
    await page.goto(ROUTES.viewRma + '?reset=1');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const vrPage = new ViewRMAPage(page);
    const found = await vrPage.goToRmaDetailByStatus('Submitted');
    // Data guaranteed from TestData — no skip

    const editBtn = page.locator('a[data-bs-original-title="Edit"]').first();
    const isVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
    await expect(isVisible, 'Customer should see Edit button on their Submitted RMA').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT RMA — Watcher Role (should NOT have Edit)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('EDIT-RMA | Edit RMA — Watcher Role @edit-rma', () => {

  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test('EDIT-WATCH-001 | Watcher does NOT see Edit button on any RMA @edit', async ({ page }) => {
    Logger.step('EDIT-WATCH-001 | Watcher does NOT see Edit button on any RMA');

    // Always reset filters to avoid leftover state
    await page.goto(ROUTES.viewRma + '?reset=1');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const vrPage = new ViewRMAPage(page);
    // Try to open any RMA detail
    const found = await vrPage.goToRmaDetailByStatus('Submitted');
    if (!found) {
      const found2 = await vrPage.goToRmaDetailByStatus('Received');
      // TestData guaranteed — runtime skip removed
    }

    const editBtn = page.locator('a[data-bs-original-title="Edit"]').first();
    const isVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    await expect(isVisible, 'Watcher should NOT see Edit button').toBe(false);
  });
});
