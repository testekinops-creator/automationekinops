// @ts-check
/**
 * tests/rma/rbac.spec.js
 * Role-Based Access Control Tests — All 6 user types (14 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs, canAccess } = require('../../src/helpers/rmaAuthHelper');
const { USERS, ROUTES } = require('../../src/helpers/Constants');

test.describe('RBAC — Role Access Control @rbac', () => {

  // ── RMA Admin ──────────────────────────────────────────────────────────
  test.describe('TC-RBAC-001 | RMA Admin — Full Access', () => {
    test.beforeEach(async ({ page }) => { await loginAs(page, USERS.rmaAdmin); });

    test('RMA Admin can access all RMA routes @smoke', async ({ page }) => {
      for (const route of [ROUTES.rmaDashboard, ROUTES.submitRma, ROUTES.viewRma, ROUTES.factoryReceive, ROUTES.factoryInsert]) {
        const accessible = await canAccess(page, route);
        expect(accessible, `${route} should be accessible`).toBe(true);
      }
    });

    test('RMA Admin dashboard shows employee KPI cards', async ({ page }) => {
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/Pending Accept/i')).toBeVisible();
      await expect(page.locator('text=/Accepted.*Not Received|Accepted & Not Received/i').first()).toBeVisible();
    });
  });

  // ── Repair Engineer ────────────────────────────────────────────────────
  test.describe('TC-RBAC-002 | Repair Engineer — Write Access', () => {
    test.beforeEach(async ({ page }) => { await loginAs(page, USERS.repairEngineer); });

    test('Repair Engineer can access RMA Dashboard', async ({ page }) => {
      expect(await canAccess(page, ROUTES.rmaDashboard)).toBe(true);
    });

    test('Repair Engineer can access Factory Receive', async ({ page }) => {
      expect(await canAccess(page, ROUTES.factoryReceive)).toBe(true);
    });

    test('Repair Engineer can access View RMA', async ({ page }) => {
      expect(await canAccess(page, ROUTES.viewRma)).toBe(true);
    });
  });

  // ── Repair Watcher ─────────────────────────────────────────────────────
  test.describe('TC-RBAC-003 | Repair Watcher — Read Only', () => {
    test.beforeEach(async ({ page }) => { await loginAs(page, USERS.repairWatcher); });

    test('Repair Watcher can view RMA Dashboard', async ({ page }) => {
      expect(await canAccess(page, ROUTES.rmaDashboard)).toBe(true);
    });

    test('Repair Watcher can view RMA List', async ({ page }) => {
      expect(await canAccess(page, ROUTES.viewRma)).toBe(true);
    });

    test('Repair Watcher cannot see Submit RMA button', async ({ page }) => {
      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('networkidle');
      const submitBtn = page.locator('button:has-text("Submit RMA Request"), a:has-text("Submit RMA Request")');
      await expect(submitBtn).not.toBeVisible();
    });

    test('Repair Watcher cannot access Factory Receive', async ({ page }) => {
      await page.goto(ROUTES.factoryReceive);
      await page.waitForLoadState('networkidle');
      const url = page.url();
      const isBlocked = url.includes('/login') || url.includes('/unauthorized') || url.includes('/403');
      const submitBtn = page.locator('button[type="submit"]').first();
      const btnVisible = await submitBtn.isVisible().catch(() => false);
      expect(isBlocked || !btnVisible).toBe(true);
    });

    test('Repair Watcher has no workflow action buttons in RMA detail', async ({ page }) => {
      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('networkidle');
      const firstRow = page.locator('table tbody tr, [class*="rma-row"]').first();
      if (await firstRow.count() > 0) {
        await firstRow.locator('a, button').last().click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('button:has-text("Accept"), a:has-text("Accept")')).not.toBeVisible();
        await expect(page.locator('button:has-text("Reject"), a:has-text("Reject")')).not.toBeVisible();
      }
    });
  });

  // ── Customer One ───────────────────────────────────────────────────────
  test.describe('TC-RBAC-004 | Customer User — Restricted Access', () => {
    test.beforeEach(async ({ page }) => { await loginAs(page, USERS.customerOne); });

    test('Customer can access RMA Dashboard', async ({ page }) => {
      expect(await canAccess(page, ROUTES.rmaDashboard)).toBe(true);
    });

    test('Customer Dashboard shows only 3 KPI bubbles (not 6)', async ({ page }) => {
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/Awaiting Device/i')).toBeVisible();
      await expect(page.locator('text=/Pending Accept/i')).not.toBeVisible();
      await expect(page.locator('text=/Accepted.*Not Received/i')).not.toBeVisible();
    });

    test('Customer cannot access Factory Receive', async ({ page }) => {
      expect(await canAccess(page, ROUTES.factoryReceive)).toBe(false);
    });

    test('Customer cannot access Factory Insert', async ({ page }) => {
      expect(await canAccess(page, ROUTES.factoryInsert)).toBe(false);
    });

    test('Customer cannot access Manage Address', async ({ page }) => {
      expect(await canAccess(page, ROUTES.manageAddress)).toBe(false);
    });

    test('Customer sidebar does not show Factory links', async ({ page }) => {
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('nav a:has-text("Factory Receive"), .sidebar a:has-text("Factory Receive")')).not.toBeVisible();
      await expect(page.locator('nav a:has-text("Factory Insert"), .sidebar a:has-text("Factory Insert")')).not.toBeVisible();
    });

    test('Customer can only see their own RMAs', async ({ page }) => {
      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('networkidle');
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent();
        expect(rowText).not.toContain('testtransport');
      }
    });
  });

  // ── Customer Data Isolation ────────────────────────────────────────────
  test.describe('TC-RBAC-005 | Customer Data Isolation', () => {
    test('Customer Two cannot see Customer One RMAs', async ({ page }) => {
      await loginAs(page, USERS.customerTwo);
      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('networkidle');
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        expect(await rows.nth(i).textContent()).not.toContain('testaccess');
      }
    });
  });
});
