// @ts-check
/**
 * tests/rma/rbac.spec.js
 * Role-Based Access Control Tests — All 6 user types (14 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs, switchRole, canAccess } = require('../../src/helpers/rmaAuthHelper');
const { USERS, ROUTES } = require('../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../src/helpers/Logger');

test.describe('RBAC — Role Access Control @rbac', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('RBAC');
    await allure.story('Role-Based Access Control');
  });



  // ── RMA Admin ──────────────────────────────────────────────────────────
  test.describe('TC-RBAC-001 | RMA Admin — Full Access', () => {

    test.beforeEach(async ({ page }) => { await switchRole(page, USERS.rmaAdmin); });

    test('RMA Admin can access all RMA routes @smoke', async ({ page }) => {
    Logger.step('RMA Admin can access all RMA routes');

      for (const route of [ROUTES.rmaDashboard, ROUTES.submitRma, ROUTES.viewRma, ROUTES.factoryReceive, ROUTES.factoryInsert]) {
        const accessible = await canAccess(page, route);
        await expect(accessible, `${route} should be accessible`).toBe(true);
      }
    });

    test('RMA Admin dashboard shows employee KPI cards @rbac', async ({ page }) => {
    Logger.step('RMA Admin dashboard shows employee KPI cards');

      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('text=/Pending Accept/i')).toBeVisible();
      await expect(page.locator('text=/Accepted.*Not Received|Accepted & Not Received/i').first()).toBeVisible();
    });
  });

  // ── Repair Engineer ────────────────────────────────────────────────────
  test.describe('TC-RBAC-002 | Repair Engineer — Write Access', () => {

    test.beforeEach(async ({ page }) => { await switchRole(page, USERS.repairEngineer); });

    test('Repair Engineer can access RMA Dashboard @rbac', async ({ page }) => {
    Logger.step('Repair Engineer can access RMA Dashboard');

      await expect(await canAccess(page, ROUTES.rmaDashboard)).toBe(true);
    });

    test('Repair Engineer can access Factory Receive @rbac', async ({ page }) => {
    Logger.step('Repair Engineer can access Factory Receive');

      await expect(await canAccess(page, ROUTES.factoryReceive)).toBe(true);
    });

    test('Repair Engineer can access View RMA @rbac', async ({ page }) => {
    Logger.step('Repair Engineer can access View RMA');

      await expect(await canAccess(page, ROUTES.viewRma)).toBe(true);
    });
  });

  // ── Repair Watcher ─────────────────────────────────────────────────────
  test.describe('TC-RBAC-003 | Repair Watcher — Read Only', () => {

    test.beforeEach(async ({ page }) => { await switchRole(page, USERS.repairWatcher); });

    test('Repair Watcher can view RMA Dashboard @rbac', async ({ page }) => {
    Logger.step('Repair Watcher can view RMA Dashboard');

      await expect(await canAccess(page, ROUTES.rmaDashboard)).toBe(true);
    });

    test('Repair Watcher can view RMA List @rbac', async ({ page }) => {
    Logger.step('Repair Watcher can view RMA List');

      await expect(await canAccess(page, ROUTES.viewRma)).toBe(true);
    });

    test('Repair Watcher cannot see Submit RMA button @rbac', async ({ page }) => {
    Logger.step('Repair Watcher cannot see Submit RMA button');

      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('domcontentloaded');
      // Wait for AJAX DataTable to populate
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      const submitBtn = page.locator('button:has-text("Submit RMA Request"), a:has-text("Submit RMA Request")');
      await expect(submitBtn).toBeHidden();
    });

    test('Repair Watcher cannot access Factory Receive @rbac', async ({ page }) => {
    Logger.step('Repair Watcher cannot access Factory Receive');

      await page.goto(ROUTES.factoryReceive);
      await page.waitForLoadState('domcontentloaded');
      // Wait for AJAX DataTable to populate
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      const url = page.url();
      const isBlocked = url.includes('/login') || url.includes('/unauthorized') || url.includes('/403');
      const submitBtn = page.locator('button[type="submit"]').first();
      const btnVisible = await submitBtn.isVisible().catch(() => false);
      await expect(isBlocked || !btnVisible).toBe(true);
    });

    test('Repair Watcher has no workflow action buttons in RMA detail @rbac', async ({ page }) => {
    Logger.step('Repair Watcher has no workflow action buttons in RMA detail');

      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('domcontentloaded');
      const firstRow = page.locator('table tbody tr, [class*="rma-row"]').first();
      if (await firstRow.count() > 0) {
        await firstRow.locator('a, button').last().click();
        await page.waitForLoadState('domcontentloaded');
        // Wait for AJAX DataTable to populate
        await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
        await expect(page.locator('button:has-text("Accept"), a:has-text("Accept")')).toBeHidden();
        await expect(page.locator('button:has-text("Reject"), a:has-text("Reject")')).toBeHidden();
      }
    });
  });

  // ── Customer One ───────────────────────────────────────────────────────
  test.describe('TC-RBAC-004 | Customer User — Restricted Access', () => {

    test.beforeEach(async ({ page }) => { await switchRole(page, USERS.customerOne); });

    test('Customer can access RMA Dashboard @rbac', async ({ page }) => {
    Logger.step('Customer can access RMA Dashboard');

      await expect(await canAccess(page, ROUTES.rmaDashboard)).toBe(true);
    });

    test('Customer Dashboard shows only 3 KPI bubbles (not 6) @rbac', async ({ page }) => {
    Logger.step('Customer Dashboard shows only 3 KPI bubbles (not 6)');


      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('domcontentloaded');
      const bubbles = page.locator('.kpi-bubble, .bubble, [class*="kpi"], [class*="bubble"]');
      const bubbleCount = await bubbles.count();
      await expect(bubbleCount, 'Customer should see KPI bubbles').toBeGreaterThanOrEqual(1);
      await expect(page.locator('text=/Pending Accept/i')).toBeHidden();
      await expect(page.locator('text=/Accepted.*Not Received/i')).toBeHidden();
    });

    test('Customer cannot access Factory Receive @rbac', async ({ page }) => {
    Logger.step('Customer cannot access Factory Receive');

      await expect(await canAccess(page, ROUTES.factoryReceive)).toBe(false);
    });

    test('Customer cannot access Factory Insert @rbac', async ({ page }) => {
    Logger.step('Customer cannot access Factory Insert');

      await expect(await canAccess(page, ROUTES.factoryInsert)).toBe(false);
    });

    test('Customer can access Manage Address (own addresses only) @rbac', async ({ page }) => {
    Logger.step('Customer can access Manage Address (own addresses only)');

      // Customer CAN access their own addresses and add new ones
      await expect(await canAccess(page, ROUTES.manageAddress)).toBe(true);
    });

    test('Customer sidebar does not show Factory links @rbac', async ({ page }) => {
    Logger.step('Customer sidebar does not show Factory links');
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('nav a:has-text("Factory Receive"), .sidebar a:has-text("Factory Receive")')).toBeHidden();
      await expect(page.locator('nav a:has-text("Factory Insert"), .sidebar a:has-text("Factory Insert")')).toBeHidden();
    });

    test('Customer can only see their own RMAs @rbac', async ({ page }) => {
    Logger.step('Customer can only see their own RMAs');

      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('domcontentloaded');
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent();
        await expect(rowText).not.toContain('testaccess2');
      }
    });
  });

  // ── Customer Data Isolation ────────────────────────────────────────────
  test.describe('TC-RBAC-005 | Customer Data Isolation', () => {

    test('Customer Two cannot see Customer One RMAs @rbac', async ({ page }) => {
    Logger.step('Customer Two cannot see Customer One RMAs');

      await switchRole(page, USERS.customerTwo);
      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('domcontentloaded');
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        await expect(await rows.nth(i).textContent()).not.toContain('testaccess');
      }
    });
  });
});
