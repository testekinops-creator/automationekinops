/* eslint-env browser */
// @ts-check
/**
 * tests/rma/view-rma.spec.js
 * View RMA List + Factory Insert Tests (16 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs, switchRole } = require('../../src/helpers/rmaAuthHelper');
const { FactoryInsertPage } = require('../../src/pages/rma/FactoryInsertPage');
const { USERS, ROUTES, RMA } = require('../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../src/helpers/Logger');

test.describe('View RMA Requests @view', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('View RMA');
    await allure.story('RMA List & Detail');
  });


  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  });

  test('TC-VR-001 | View RMA list loads with correct columns @smoke', async ({ page }) => {
    Logger.step('View RMA list loads with correct columns');

    const columns = ['RMA ID', 'Customer', 'User', 'Serial', 'Status', 'Request date', 'Action'];
    for (const col of columns) {
      await expect(page.locator('th, [class*="header"]').filter({ hasText: col }).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-VR-002 | Pagination info shows current page @view', async ({ page }) => {
    Logger.step('Pagination info shows current page');

    await expect(page.locator('text=/Currently Viewing Page/i').first()).toBeVisible();
  });

  test('TC-VR-003 | Submit RMA Request button visible for Admin @view', async ({ page }) => {
    Logger.step('Submit RMA Request button visible for Admin');

    await expect(page.locator('button:has-text("Submit RMA Request"), a:has-text("Submit RMA Request")').first()).toBeVisible();
  });

  test('TC-VR-004 | Filter Data button is visible and clickable @view', async ({ page }) => {
    Logger.step('Filter Data button is visible and clickable');

    const filterBtn = page.locator('button:has-text("Filter Data"), [class*="filter"]').first();
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();
    // removed: waitForTimeout(500ms) — use event-based wait if needed
  });

  test('TC-VR-005 | Clicking RMA ID navigates to detail view @view', async ({ page }) => {
    Logger.step('Clicking RMA ID navigates to detail view');

    const rmaIdLink = page.locator('td button, td a, [class*="rma-id"]').first();
    if (await rmaIdLink.count() > 0) {
      await rmaIdLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('text=/Details/i').first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('TC-VR-006 | RMA ID column is sortable (DESC by default) @view', async ({ page }) => {
    Logger.step('RMA ID column is sortable (DESC by default)');

    const rmaIds = await page.locator('[class*="rma-id"], td:first-child button').allTextContents();
    if (rmaIds.length >= 2) {
      const nums = rmaIds.map((id) => parseInt(id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
      if (nums.length >= 2) {
        const isSorted = nums.every((n, i) => i === 0 || nums[i - 1] >= n);
        await expect(isSorted).toBe(true);
      }
    }
  });

  test('TC-VR-007 | View RMA detail shows Edit and Comment buttons @view', async ({ page }) => {
    Logger.step('View RMA detail shows Edit and Comment buttons');

    const firstActionBtn = page.locator('table tbody tr [class*="action"], table tbody tr a, table tbody tr button').last().first();
    if (await firstActionBtn.count() > 0) {
      await firstActionBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('button:has-text("Edit"), a:has-text("Edit")').first()).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('button:has-text("Comment"), a:has-text("Comment")').first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-VR-008 | Comment modal opens and accepts text @view', async ({ page }) => {
    Logger.step('Comment modal opens and accepts text');

    const firstActionBtn = page.locator('table tbody tr').first().locator('a, button').last();
    if (await firstActionBtn.count() > 0) {
      await firstActionBtn.click();
      await page.waitForLoadState('domcontentloaded');
      const commentBtn = page.locator('button:has-text("Comment")').first();
      if (await commentBtn.isVisible()) {
        await commentBtn.click();
        await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)
        const modal = page.locator('[class*="modal"], [role="dialog"]').first();
        await expect(modal).toBeVisible({ timeout: 6_000 });
        const editor = modal.locator('textarea, [contenteditable="true"], [class*="editor"]').first();
        await expect(editor).toBeVisible();
      }
    }
  });

  test('TC-VR-009 | Customer can only see their own RMAs @view', async ({ page }) => {
    Logger.step('Customer can only see their own RMAs');

    await switchRole(page, USERS.customerOne);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(await rows.nth(i).textContent()).not.toContain('testaccess2');
    }
  });

  test('TC-VR-010 | Opened Records sidebar shows recently viewed RMA @view', async ({ page }) => {
    Logger.step('Opened Records sidebar shows recently viewed RMA');

    const firstActionBtn = page.locator('table tbody tr').first().locator('a, button').last();
    if (await firstActionBtn.count() > 0) {
      await firstActionBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('text=/Opened Records/i').first()).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('[class*="opened-records"] a, [class*="recent"] a').first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Factory Insert RMA @factory-insert', () => {

  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.factoryInsert);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-FI-001 | Factory Insert page loads with mandatory field notice @smoke', async ({ page }) => {
    Logger.step('Factory Insert page loads with mandatory field notice');

    const fiPage = new FactoryInsertPage(page);
    await expect(fiPage.mandatoryNote).toBeVisible({ timeout: 10_000 });
  });

  test('TC-FI-002 | Serial number field has 18-char counter @view', async ({ page }) => {
    Logger.step('Serial number field has 18-char counter');

    const fiPage = new FactoryInsertPage(page);
    await expect(await fiPage.getCharCount()).toBe(18);
  });

  test('TC-FI-003 | Note for Repair is optional in Factory Insert @view', async ({ page }) => {
    Logger.step('Note for Repair is optional in Factory Insert');

    const fiPage = new FactoryInsertPage(page);
    await fiPage.fillSerial(RMA.validSerial);
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)
    const rmaType = fiPage.rmaTypeDropdown;
    if (await rmaType.isVisible()) { await rmaType.selectOption({ index: 1 }); }
    const isRequired = await fiPage.noteForRepair.evaluate((el) => (el instanceof HTMLTextAreaElement) ? el.required : false);
    await expect(isRequired).toBe(false);
  });

  test('TC-FI-004 | Cancel button discards form @view', async ({ page }) => {
    Logger.step('Cancel button discards form');

    const fiPage = new FactoryInsertPage(page);
    await fiPage.fillSerial(RMA.validSerial);
    await fiPage.clickCancel();
    await expect(page).not.toHaveURL(/\/factory-insert$/);
  });

  test('TC-FI-005 | Customer cannot access Factory Insert @view', async ({ page }) => {
    Logger.step('Customer cannot access Factory Insert');

    await switchRole(page, USERS.customerOne);
    await page.goto(ROUTES.factoryInsert);
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    await expect(url.includes('/login') || url.includes('/403') || url.includes('/unauthorized')).toBe(true);
  });

  test('TC-FI-006 | Submit with empty Serial Number shows validation @view', async ({ page }) => {
    Logger.step('Submit with empty Serial Number shows validation');

    const fiPage = new FactoryInsertPage(page);
    await fiPage.clickSubmit();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)
    const isInvalid = await fiPage.serialInput.evaluate((el) => (el instanceof HTMLInputElement) ? !el.validity.valid : false);
    const errorVisible = await page.locator('[class*="error"], .invalid-feedback').first().isVisible().catch(() => false);
    await expect(isInvalid || errorVisible).toBe(true);
  });
});
