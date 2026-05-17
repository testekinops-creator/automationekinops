// @ts-check
/**
 * tests/rma/functional/standardized-faults.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Standardized Faults & Manage Repair Diagnostics — Module Tests
 *
 * New feature: Repair Diagnostics and Standardized Faults relation.
 * Standardized Faults are linked to Repair Diagnostics. Displayed as checkboxes
 * in workflow popups based on the selected Repair Diagnostic value.
 *
 * Accessible to: Admin, Repair Engineer
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ROUTES } = require('../../../src/helpers/Constants');

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARDIZED FAULTS LIST PAGE
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SF-LIST | Standardized Faults List Page @standardized-faults', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.standardizedFaults);
    await page.waitForLoadState('networkidle');
  });

  test('SF-001 | Page loads with correct title @smoke', async ({ page }) => {
    const heading = page.locator('h2, h3, .page-title, .content-header').filter({ hasText: /Standardized Faults/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('SF-002 | Table shows correct columns', async ({ page }) => {
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const headers = await table.locator('thead th').allTextContents();
    const headerText = headers.join(' ').toLowerCase();
    expect(headerText).toContain('#');
    expect(headerText).toContain('repair diagnostic');
    expect(headerText).toContain('standardized fault');
    expect(headerText).toContain('status');
    expect(headerText).toContain('action');
  });

  test('SF-003 | Pagination text visible', async ({ page }) => {
    const pagination = page.locator('text=/Currently Viewing Page/i').first();
    await expect(pagination).toBeVisible({ timeout: 10_000 });
  });

  test('SF-004 | "+ Add Standardized Fault" button visible', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Standardized Fault"), a:has-text("Add Standardized Fault")').first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
  });

  test('SF-005 | "+ Manage Repair Diagnostic" button visible', async ({ page }) => {
    const manageBtn = page.locator('button:has-text("Manage Repair Diagnostic"), a:has-text("Manage Repair Diagnostic")').first();
    await expect(manageBtn).toBeVisible({ timeout: 10_000 });
  });

  test('SF-006 | "Filter Data" button visible and opens filter panel', async ({ page }) => {
    const filterBtn = page.locator('button:has-text("Filter Data"), a:has-text("Filter Data")').first();
    await expect(filterBtn).toBeVisible({ timeout: 10_000 });

    await filterBtn.click();
    await page.waitForTimeout(500);

    // Filter panel should be visible with fields
    const filterPanel = page.locator('text=/Repair Diagnostic/i').first();
    await expect(filterPanel).toBeVisible({ timeout: 5000 });
  });

  test('SF-007 | Filter panel has Repair Diagnostic dropdown and Keyword field', async ({ page }) => {
    const filterBtn = page.locator('button:has-text("Filter Data"), a:has-text("Filter Data")').first();
    await filterBtn.click();
    await page.waitForTimeout(500);

    // Repair Diagnostic filter
    const diagFilter = page.locator('text=/Repair Diagnostic/i').first();
    await expect(diagFilter).toBeVisible();

    // Keyword filter
    const keywordFilter = page.locator('text=/Keyword/i').first();
    await expect(keywordFilter).toBeVisible();

    // Apply, Reset, Close buttons
    const applyBtn = page.locator('button:has-text("Apply"), input[value="Apply"]').first();
    const resetBtn = page.locator('button:has-text("Reset"), input[value="Reset"]').first();
    const closeBtn = page.locator('button:has-text("Close"), input[value="Close"]').first();
    await expect(applyBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(closeBtn).toBeVisible();
  });

  test('SF-008 | Edit action (pencil icon) is visible in table rows', async ({ page }) => {
    const editIcon = page.locator('table tbody tr').first().locator('a[title="Edit"], a i.fa-pencil, a i.fa-edit, a.edit-btn').first();
    const isVisible = await editIcon.isVisible().catch(() => false);
    // Fallback: check for any link in the Action column
    const actionLink = page.locator('table tbody tr').first().locator('td:last-child a').first();
    const actionVisible = await actionLink.isVisible().catch(() => false);
    expect(isVisible || actionVisible, 'Edit icon or action link should be visible').toBe(true);
  });

  test('SF-009 | Table has data rows', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count, 'Table should have at least 1 data row').toBeGreaterThanOrEqual(1);
    console.log(`  Standardized Faults table: ${count} rows`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADD STANDARDIZED FAULT (navigates to /rma/standardizedfaults/add)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SF-ADD | Add Standardized Fault @standardized-faults', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  // Helper: open the Add Standardized Fault overlay (loads in iframe#iframeWindow)
  async function openAddOverlay(page) {
    await page.goto(ROUTES.standardizedFaults);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('a:has-text("Add Standardized Fault")').first();
    await addBtn.click();

    // The overlay loads content inside iframe#iframeWindow
    const iframeLocator = page.frameLocator('#iframeWindow');
    const form = iframeLocator.locator('#standardizedFaultForm, form[action*="standardizedfaults/add"], fieldset').first();
    await form.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(500);
    return iframeLocator;
  }

  test('SF-ADD-001 | Add form has Repair Diagnostic, Standardized Fault, and Status fields', async ({ page }) => {
    const iframe = await openAddOverlay(page);

    // Repair Diagnostic (select dropdown) — mandatory
    const diagSelect = iframe.locator('select').first();
    await expect(diagSelect).toBeVisible({ timeout: 5_000 });

    // Standardized Fault (text input) — mandatory
    const faultInput = iframe.locator('input[type="text"]').first();
    await expect(faultInput).toBeVisible();

    // Status (radio Active/In Active)
    const activeRadio = iframe.locator('input[type="radio"]').first();
    await expect(activeRadio).toBeVisible();

    // Save button
    const saveBtn = iframe.locator('button:has-text("Save"), input[type="submit"][value="Save"]').first();
    await expect(saveBtn).toBeVisible();

    console.log('  Add Standardized Fault overlay: all fields visible ✓');
  });

  test('SF-ADD-002 | Repair Diagnostic dropdown has options', async ({ page }) => {
    const iframe = await openAddOverlay(page);

    const diagSelect = iframe.locator('select').first();
    const options = await diagSelect.locator('option').allTextContents();
    const realOptions = options.filter(o => o.trim() !== '' && !/^Select/i.test(o.trim()));
    expect(realOptions.length, 'Repair Diagnostic should have options').toBeGreaterThanOrEqual(1);
    console.log(`  Repair Diagnostic options: ${realOptions.length}`);
  });

  test('SF-ADD-003 | Status defaults to Active', async ({ page }) => {
    const iframe = await openAddOverlay(page);

    const activeRadio = iframe.locator('input[type="radio"][value="Active"], input[type="radio"]').first();
    const isChecked = await activeRadio.isChecked().catch(() => false);
    expect(isChecked, 'Active radio should be checked by default').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGE REPAIR DIAGNOSTICS (navigates to /rma/repairdiagnostic/manage)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SF-RD | Manage Repair Diagnostics @standardized-faults', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  // Helper: open the Manage Repair Diagnostics overlay (loads in iframe#iframeWindow)
  async function openManageOverlay(page) {
    await page.goto(ROUTES.standardizedFaults);
    await page.waitForLoadState('networkidle');

    const manageBtn = page.locator('a:has-text("Manage Repair Diagnostic")').first();
    await manageBtn.click();

    // The overlay loads content inside iframe#iframeWindow
    const iframeLocator = page.frameLocator('#iframeWindow');
    // Wait for the table to appear inside the iframe
    const table = iframeLocator.locator('table').first();
    await table.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(500);
    return iframeLocator;
  }

  test('SF-RD-001 | Manage Repair Diagnostic page loads with correct title', async ({ page }) => {
    const iframe = await openManageOverlay(page);

    // Check for heading text inside the iframe
    const heading = iframe.locator('h2, h3, h4, .page-title, .content-header, .box-title').filter({ hasText: /Repair Diagnostic/i }).first();
    const headingVisible = await heading.isVisible({ timeout: 5_000 }).catch(() => false);

    // Fallback: check for any text "Repair Diagnostic" in iframe
    const anyText = iframe.locator('text=Repair Diagnostic').first();
    const textVisible = await anyText.isVisible({ timeout: 3_000 }).catch(() => false);

    expect(headingVisible || textVisible, 'Should have Repair Diagnostic heading in overlay').toBe(true);
  });

  test('SF-RD-002 | Table shows columns: #, Name, Status, Action', async ({ page }) => {
    const iframe = await openManageOverlay(page);

    const table = iframe.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const headers = await table.locator('thead th').allTextContents();
    const headerText = headers.join(' ').toLowerCase();
    expect(headerText).toContain('#');
    expect(headerText).toContain('name');
    expect(headerText).toContain('status');
    expect(headerText).toContain('action');
  });

  test('SF-RD-003 | "+ Add New Repair Diagnostic" button visible', async ({ page }) => {
    const iframe = await openManageOverlay(page);

    const addBtn = iframe.locator(
      'button:has-text("Add New Repair Diagnostic"), a:has-text("Add New Repair Diagnostic")'
    ).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
  });

  test('SF-RD-004 | Add Repair Diagnostic form has Name, Status, Save/Cancel', async ({ page }) => {
    const iframe = await openManageOverlay(page);

    // Click the "+ Add New Repair Diagnostic" button inside the iframe
    const addBtn = iframe.locator(
      'button:has-text("Add New Repair Diagnostic"), a:has-text("Add New Repair Diagnostic")'
    ).first();
    await addBtn.click();
    await page.waitForTimeout(1500);

    // Name input field
    const nameInput = iframe.locator('input[type="text"]').last();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });

    // Status radio buttons
    const activeRadio = iframe.locator('input[type="radio"]').first();
    await expect(activeRadio).toBeVisible();

    // Save and Cancel buttons
    const saveBtn = iframe.locator('button:has-text("Save"), input[type="submit"][value="Save"]').first();
    const cancelBtn = iframe.locator('button:has-text("Cancel"), a:has-text("Cancel")').first();
    await expect(saveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();
  });

  test('SF-RD-005 | Table has existing Repair Diagnostic records', async ({ page }) => {
    await page.goto(ROUTES.standardizedFaults);
    await page.waitForLoadState('networkidle');

    const manageBtn = page.locator('button:has-text("Manage Repair Diagnostic"), a:has-text("Manage Repair Diagnostic")').first();
    await manageBtn.click();
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count, 'Should have existing Repair Diagnostics').toBeGreaterThanOrEqual(1);
    console.log(`  Repair Diagnostics table: ${count} rows`);

    // Verify known values from screenshots
    const tableText = await page.locator('table tbody').textContent();
    expect(tableText).toContain('Not identified');
    expect(tableText).toContain('Fault on Motherboard');
  });

  test('SF-RD-006 | Edit action (pencil icon) visible in rows', async ({ page }) => {
    await page.goto(ROUTES.standardizedFaults);
    await page.waitForLoadState('networkidle');

    const manageBtn = page.locator('button:has-text("Manage Repair Diagnostic"), a:has-text("Manage Repair Diagnostic")').first();
    await manageBtn.click();
    await page.waitForLoadState('networkidle');

    const actionLink = page.locator('table tbody tr').first().locator('td:last-child a').first();
    await expect(actionLink).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESS CONTROL — Watcher and Customer should NOT see Standardized Faults
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SF-ACCESS | Standardized Faults Access Control @standardized-faults', () => {
  test('SF-ACC-001 | Repair Watcher cannot access Standardized Faults', async ({ browser }) => {
    const context = await browser.newContext({ storageState: getStorageStatePath('repairWatcher') });
    const page = await context.newPage();
    await page.goto(ROUTES.standardizedFaults);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const isBlocked = url.includes('/login') || url.includes('/403') || url.includes('/dashboard') || !url.includes('standardizedfaults');
    expect(isBlocked, `Watcher should be blocked from Standardized Faults, URL: ${url}`).toBe(true);
    await context.close();
  });

  test('SF-ACC-002 | Customer cannot access Standardized Faults', async ({ browser }) => {
    const context = await browser.newContext({ storageState: getStorageStatePath('customerOne') });
    const page = await context.newPage();
    await page.goto(ROUTES.standardizedFaults);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const isBlocked = url.includes('/login') || url.includes('/403') || url.includes('/dashboard') || !url.includes('standardizedfaults');
    expect(isBlocked, `Customer should be blocked from Standardized Faults, URL: ${url}`).toBe(true);
    await context.close();
  });
});
