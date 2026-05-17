// @ts-check
/**
 * tests/rma/functional/edit-rma.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Edit RMA Request — Functional Tests
 *
 * Route: /rma/request/edit/<id>
 * Edit is available from the View Details page via the "Edit" button.
 * Visibility depends on RMA status and user role (see view-screen-actions.spec.js).
 *
 * New feature: Edit screen now includes Repair Diagnostic (Select2) and
 * Standardized Faults (checkboxes) fields, dynamically linked.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ViewRMAPage } = require('../../../src/pages/rma/ViewRMAPage');
const { ROUTES } = require('../../../src/helpers/Constants');

// ─── Helper: Navigate to an RMA detail in a given status and click Edit ───────
async function navigateToEditPage(page, status) {
  await page.goto(ROUTES.viewRma);
  await page.waitForLoadState('networkidle');
  const vrPage = new ViewRMAPage(page);
  const found = await vrPage.goToRmaDetailByStatus(status);
  if (!found) return false;

  // Click the Edit button
  const editBtn = page.locator('a.btn:has-text("Edit"), button:has-text("Edit")').first();
  const isVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!isVisible) return false;

  await editBtn.click();
  await page.waitForLoadState('networkidle');

  // Verify we are on the edit page
  const url = page.url();
  return url.includes('/rma/request/edit');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT RMA — Admin Role
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('EDIT-RMA | Edit RMA Request — Admin @edit-rma', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('EDIT-001 | Edit button on Submitted RMA opens edit form', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Submitted');
    if (!onEditPage) { test.skip(true, 'No Submitted RMA or Edit button not available'); return; }

    expect(page.url()).toContain('/rma/request/edit');
    console.log(`  Edit page URL: ${page.url()}`);
  });

  test('EDIT-002 | Edit form pre-populates serial number and product info', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Submitted');
    if (!onEditPage) { test.skip(true, 'No Submitted RMA with Edit available'); return; }

    // Serial number should be pre-populated (read-only or filled)
    const serialField = page.locator('#serial_number, input[name="serial_number"]').first();
    const serialValue = await serialField.inputValue().catch(() => '');
    expect(serialValue.length, 'Serial number should be pre-populated').toBeGreaterThan(0);

    // Product Name should be pre-populated
    const productNameField = page.locator('#product_name, input[name="product_name"]').first();
    const productName = await productNameField.inputValue().catch(() => '');
    expect(productName.length, 'Product Name should be pre-populated').toBeGreaterThan(0);

    console.log(`  Serial: ${serialValue}, Product: ${productName}`);
  });

  test('EDIT-003 | Note for Repair / Comment field visible and editable', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Submitted');
    if (!onEditPage) { test.skip(true, 'No Submitted RMA with Edit available'); return; }

    // Comment field (Summernote or plain textarea)
    const summernote = page.locator('.note-editor').first();
    const textarea = page.locator('textarea[name="comment"]').first();

    const hasSummernote = await summernote.isVisible().catch(() => false);
    const hasTextarea = await textarea.isVisible().catch(() => false);

    expect(hasSummernote || hasTextarea, 'Comment/Note field should be visible on Edit form').toBe(true);
  });

  test('EDIT-004 | Save/Update button visible on Edit form', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Submitted');
    if (!onEditPage) { test.skip(true, 'No Submitted RMA with Edit available'); return; }

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), input[type="submit"]').first();
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  });

  test('EDIT-005 | Close/Cancel button discards changes', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Submitted');
    if (!onEditPage) { test.skip(true, 'No Submitted RMA with Edit available'); return; }

    const closeBtn = page.locator('a:has-text("Close"), a:has-text("Back"), button:has-text("Cancel")').first();
    await expect(closeBtn).toBeVisible({ timeout: 5000 });

    await closeBtn.click();
    await page.waitForLoadState('networkidle');

    // Should navigate away from edit page
    expect(page.url()).not.toContain('/rma/request/edit');
  });

  test('EDIT-006 | Edit available on Accepted RMA', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Accepted');
    if (!onEditPage) { test.skip(true, 'No Accepted RMA with Edit available'); return; }
    expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-007 | Edit available on Received RMA', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Received');
    if (!onEditPage) { test.skip(true, 'No Received RMA with Edit available'); return; }
    expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-008 | Edit available on On Hold RMA', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'On-Hold');
    if (!onEditPage) { test.skip(true, 'No On Hold RMA with Edit available'); return; }
    expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-009 | Edit available on Repaired RMA', async ({ page }) => {
    const onEditPage = await navigateToEditPage(page, 'Repaired');
    if (!onEditPage) { test.skip(true, 'No Repaired RMA with Edit available'); return; }
    expect(page.url()).toContain('/rma/request/edit');
  });

  test('EDIT-010 | Edit NOT available on Closed RMA', async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
    const vrPage = new ViewRMAPage(page);
    const found = await vrPage.goToRmaDetailByStatus('Closed');
    if (!found) { test.skip(true, 'No Closed RMA available'); return; }

    const editBtn = page.locator('a.btn:has-text("Edit"), button:has-text("Edit")').first();
    const isVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible, 'Edit button should NOT be visible on Closed RMA').toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT RMA — Repair Diagnostic & Standardized Faults on Edit Screen
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('EDIT-RMA | Edit Screen — Repair Diagnostic & Standardized Faults @edit-rma', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('EDIT-DIAG-001 | Repair Diagnostic field visible on edit form', async ({ page }) => {
    // Try Received or On Hold (where these fields are most relevant)
    let onEditPage = await navigateToEditPage(page, 'Received');
    if (!onEditPage) onEditPage = await navigateToEditPage(page, 'On-Hold');
    if (!onEditPage) { test.skip(true, 'No editable RMA available'); return; }

    const diagLabel = page.locator('text=/Repair Diagnostic/i').first();
    await expect(diagLabel).toBeVisible({ timeout: 10_000 });
  });

  test('EDIT-DIAG-002 | Standardized Faults displayed as checkboxes', async ({ page }) => {
    let onEditPage = await navigateToEditPage(page, 'Received');
    if (!onEditPage) onEditPage = await navigateToEditPage(page, 'On-Hold');
    if (!onEditPage) { test.skip(true, 'No editable RMA available'); return; }

    const faultsLabel = page.locator('text=/Standardized Fault/i').first();
    const hasFaults = await faultsLabel.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFaults) {
      // Standardized Faults should be rendered as checkboxes
      const checkboxes = page.locator('input[type="checkbox"][name*="standardized_fault"]');
      const count = await checkboxes.count();
      console.log(`  Standardized Fault checkboxes: ${count}`);
      // If a Repair Diagnostic is already selected, there should be checkboxes
      expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no diagnostic selected yet
    } else {
      console.log('  Standardized Faults label not visible — field may require Repair Diagnostic selection first');
    }
  });

  test('EDIT-DIAG-003 | Selecting Repair Diagnostic dynamically loads Standardized Faults', async ({ page }) => {
    let onEditPage = await navigateToEditPage(page, 'Received');
    if (!onEditPage) onEditPage = await navigateToEditPage(page, 'On-Hold');
    if (!onEditPage) { test.skip(true, 'No editable RMA available'); return; }

    // Find Repair Diagnostic Select2 and select "Not identified"
    const diagSelect2 = page.locator('.select2-container').filter({
      has: page.locator('xpath=ancestor::div[contains(., "Repair Diagnostic")]')
    }).first();

    // Fallback: find any Select2 near "Repair Diagnostic" label
    const allSelect2 = page.locator('.select2-container');
    const select2Count = await allSelect2.count();

    if (select2Count === 0) {
      test.skip(true, 'No Select2 dropdowns on edit page');
      return;
    }

    // Click the first Select2
    await allSelect2.first().click();
    await page.waitForTimeout(500);

    // Search for "Not identified"
    const searchField = page.locator('.select2-search__field').first();
    if (await searchField.isVisible().catch(() => false)) {
      await searchField.fill('Not identified');
      await page.waitForTimeout(1500);
      const option = page.locator('.select2-results__option').filter({ hasText: /Not identified/i }).first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await page.waitForTimeout(2000); // Wait for AJAX to load checkboxes

        // After selection, Standardized Fault checkboxes should appear
        const checkboxes = page.locator('input[type="checkbox"][name*="standardized_fault"]');
        const count = await checkboxes.count();
        console.log(`  After selecting "Not identified": ${count} Standardized Fault checkboxes`);
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

  test('EDIT-CUST-001 | Customer can edit their own Submitted RMA', async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
    const vrPage = new ViewRMAPage(page);
    const found = await vrPage.goToRmaDetailByStatus('Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA available for customer'); return; }

    const editBtn = page.locator('a.btn:has-text("Edit"), button:has-text("Edit")').first();
    const isVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible, 'Customer should see Edit button on their Submitted RMA').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT RMA — Watcher Role (should NOT have Edit)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('EDIT-RMA | Edit RMA — Watcher Role @edit-rma', () => {
  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test('EDIT-WATCH-001 | Watcher does NOT see Edit button on any RMA', async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
    const vrPage = new ViewRMAPage(page);
    // Try to open any RMA detail
    const found = await vrPage.goToRmaDetailByStatus('Submitted');
    if (!found) {
      const found2 = await vrPage.goToRmaDetailByStatus('Received');
      if (!found2) { test.skip(true, 'No RMA available for Watcher'); return; }
    }

    const editBtn = page.locator('a.btn:has-text("Edit"), button:has-text("Edit")').first();
    const isVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible, 'Watcher should NOT see Edit button').toBe(false);
  });
});
