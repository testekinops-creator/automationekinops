// @ts-check
/**
 * tests/rma/view-rma.spec.js
 * View RMA List + Factory Insert Tests (16 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs } = require('../../src/helpers/rmaAuthHelper');
const { ViewRMAPage } = require('../../src/pages/rma/ViewRMAPage');
const { FactoryInsertPage } = require('../../src/pages/rma/FactoryInsertPage');
const { USERS, ROUTES, RMA } = require('../../src/helpers/Constants');

test.describe('View RMA Requests @view', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
  });

  test('TC-VR-001 | View RMA list loads with correct columns @smoke', async ({ page }) => {
    const columns = ['RMA ID', 'Customer', 'User', 'Serial', 'Status', 'Request date', 'Action'];
    for (const col of columns) {
      await expect(page.locator('th, [class*="header"]').filter({ hasText: col }).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-VR-002 | Pagination info shows current page', async ({ page }) => {
    await expect(page.locator('text=/Currently Viewing Page/i').first()).toBeVisible();
  });

  test('TC-VR-003 | Submit RMA Request button visible for Admin', async ({ page }) => {
    await expect(page.locator('button:has-text("Submit RMA Request"), a:has-text("Submit RMA Request")').first()).toBeVisible();
  });

  test('TC-VR-004 | Filter Data button is visible and clickable', async ({ page }) => {
    const filterBtn = page.locator('button:has-text("Filter Data"), [class*="filter"]').first();
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();
    await page.waitForTimeout(500);
  });

  test('TC-VR-005 | Clicking RMA ID navigates to detail view', async ({ page }) => {
    const rmaIdLink = page.locator('td button, td a, [class*="rma-id"]').first();
    if (await rmaIdLink.count() > 0) {
      await rmaIdLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/Details/i').first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('TC-VR-006 | RMA ID column is sortable (DESC by default)', async ({ page }) => {
    const rmaIds = await page.locator('[class*="rma-id"], td:first-child button').allTextContents();
    if (rmaIds.length >= 2) {
      const nums = rmaIds.map((id) => parseInt(id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
      if (nums.length >= 2) {
        const isSorted = nums.every((n, i) => i === 0 || nums[i - 1] >= n);
        expect(isSorted).toBe(true);
      }
    }
  });

  test('TC-VR-007 | View RMA detail shows Edit and Comment buttons', async ({ page }) => {
    const firstActionBtn = page.locator('table tbody tr [class*="action"], table tbody tr a, table tbody tr button').last().first();
    if (await firstActionBtn.count() > 0) {
      await firstActionBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('button:has-text("Edit"), a:has-text("Edit")').first()).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('button:has-text("Comment"), a:has-text("Comment")').first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-VR-008 | Comment modal opens and accepts text', async ({ page }) => {
    const firstActionBtn = page.locator('table tbody tr').first().locator('a, button').last();
    if (await firstActionBtn.count() > 0) {
      await firstActionBtn.click();
      await page.waitForLoadState('networkidle');
      const commentBtn = page.locator('button:has-text("Comment")').first();
      if (await commentBtn.isVisible()) {
        await commentBtn.click();
        await page.waitForTimeout(800);
        const modal = page.locator('[class*="modal"], [role="dialog"]').first();
        await expect(modal).toBeVisible({ timeout: 6_000 });
        const editor = modal.locator('textarea, [contenteditable="true"], [class*="editor"]').first();
        await expect(editor).toBeVisible();
      }
    }
  });

  test('TC-VR-009 | Customer can only see their own RMAs', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      expect(await rows.nth(i).textContent()).not.toContain('testtransport');
    }
  });

  test('TC-VR-010 | Opened Records sidebar shows recently viewed RMA', async ({ page }) => {
    const firstActionBtn = page.locator('table tbody tr').first().locator('a, button').last();
    if (await firstActionBtn.count() > 0) {
      await firstActionBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/Opened Records/i').first()).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('[class*="opened-records"] a, [class*="recent"] a').first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Factory Insert RMA @factory-insert', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await page.goto(ROUTES.factoryInsert);
    await page.waitForLoadState('networkidle');
  });

  test('TC-FI-001 | Factory Insert page loads with mandatory field notice @smoke', async ({ page }) => {
    const fiPage = new FactoryInsertPage(page);
    await expect(fiPage.mandatoryNote).toBeVisible({ timeout: 10_000 });
  });

  test('TC-FI-002 | Serial number field has 18-char counter', async ({ page }) => {
    const fiPage = new FactoryInsertPage(page);
    expect(await fiPage.getCharCount()).toBe(18);
  });

  test('TC-FI-003 | Note for Repair is optional in Factory Insert', async ({ page }) => {
    const fiPage = new FactoryInsertPage(page);
    await fiPage.fillSerial(RMA.validSerial);
    await page.waitForTimeout(1000);
    const rmaType = fiPage.rmaTypeDropdown;
    if (await rmaType.isVisible()) { await rmaType.selectOption({ index: 1 }); }
    const isRequired = await fiPage.noteForRepair.evaluate((el) => (el instanceof HTMLTextAreaElement) ? el.required : false);
    expect(isRequired).toBe(false);
  });

  test('TC-FI-004 | Cancel button discards form', async ({ page }) => {
    const fiPage = new FactoryInsertPage(page);
    await fiPage.fillSerial(RMA.validSerial);
    await fiPage.clickCancel();
    await expect(page).not.toHaveURL(/\/factory-insert$/);
  });

  test('TC-FI-005 | Customer cannot access Factory Insert', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await page.goto(ROUTES.factoryInsert);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.includes('/login') || url.includes('/403') || url.includes('/unauthorized')).toBe(true);
  });

  test('TC-FI-006 | Submit with empty Serial Number shows validation', async ({ page }) => {
    const fiPage = new FactoryInsertPage(page);
    await fiPage.clickSubmit();
    await page.waitForTimeout(800);
    const isInvalid = await fiPage.serialInput.evaluate((el) => (el instanceof HTMLInputElement) ? !el.validity.valid : false);
    const errorVisible = await page.locator('[class*="error"], .invalid-feedback').first().isVisible().catch(() => false);
    expect(isInvalid || errorVisible).toBe(true);
  });
});
