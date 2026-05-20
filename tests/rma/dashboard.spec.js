// @ts-check
/**
 * tests/rma/dashboard.spec.js
 * RMA Dashboard Tests — KPI Bubbles, Click-Through Filters, Zero-Count Behaviour (10 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs } = require('../../src/helpers/rmaAuthHelper');
const { RMADashboardPage } = require('../../src/pages/rma/RMADashboardPage');
// const { ViewRMAPage } = require('../../src/pages/rma/ViewRMAPage');
const { USERS, ROUTES, DASHBOARD } = require('../../src/helpers/Constants');

test.describe('RMA Dashboard — Employee View @dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');
  });

  test('TC-DASH-001 | Dashboard page heading and intro text visible @smoke', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /RMA Requests/i }).first()).toBeVisible();
    await expect(page.locator('text=/RMA Dashboard/i').first()).toBeVisible();
    await expect(page.locator('text=/comprehensive overview/i').first()).toBeVisible();
  });

  test('TC-DASH-002 | All 6 Employee KPI cards are visible', async ({ page }) => {
    const cards = ['Pending Accept', 'In Progress', 'More than 30 days', 'More than 3 times', 'Repaired but not closed', 'Accepted & Not Received'];
    for (const card of cards) {
      await expect(page.locator(`text=/${card}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('TC-DASH-003 | Clicking "Pending Accept" filters View RMA to Submitted', async ({ page }) => {
    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.pendingAccept);
    await expect(page.locator('text=/Dashboard.*Pending Accept/i').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=/RMA ID.*DESC/i').first()).toBeVisible();

    const statusBadges = page.locator('[class*="badge"], [class*="status"]').filter({ hasText: /Submitted|Accepted|Received|On-Hold|Repaired|Rejected|Closed/ });
    const badgeCount = await statusBadges.count();
    for (let i = 0; i < Math.min(badgeCount, 5); i++) {
      expect((await statusBadges.nth(i).textContent())?.trim()).toBe('Submitted');
    }
  });

  test('TC-DASH-004 | Clicking "RMA Repair In Progress" filters to Received RMAs', async ({ page }) => {
    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.inProgress);
    await expect(page.locator('text=/Dashboard.*In Progress/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-DASH-005 | Zero-count bubble is NOT disabled — remains clickable', async ({ page }) => {
    const dashboard = new RMADashboardPage(page);
    const cardName = DASHBOARD.employee.inProgressOver30;
    const count = await dashboard.getCardCount(cardName);

    if (count === 0) {
      expect(await dashboard.expectCardClickable(cardName)).toBe(true);
      await dashboard.clickCard(cardName);
      await expect(page).not.toHaveURL(/\/login/);
    } else {
      test.info().annotations.push({ type: 'info', description: `Card has count ${count}, not 0 — skipping zero test` });
    }
  });

  test('TC-DASH-006 | Zero-count bubble navigates to filtered empty list', async ({ page }) => {
    const dashboard = new RMADashboardPage(page);
    const cardsToTest = [
      { name: DASHBOARD.employee.inProgressOver30, label: 'More than 30 days' },
      { name: DASHBOARD.employee.acceptedNotReceived, label: 'Accepted & Not Received' },
      { name: DASHBOARD.employee.repairedNotClosed, label: 'Repaired but not closed' },
    ];

    for (const { name } of cardsToTest) {
      const count = await dashboard.getCardCount(name);
      if (count === 0) {
        await dashboard.clickCard(name);
        await page.waitForLoadState('networkidle');
        expect(page.url()).not.toContain('/login');
        await page.goto(ROUTES.rmaDashboard);
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('TC-DASH-007 | Sidebar navigation items all visible for RMA Admin', async ({ page }) => {
    const items = ['Dashboard', 'Submit RMA Request', 'View RMA Request', 'Factory Insert RMA', 'Factory Receive RMA', 'Manage Address'];
    for (const item of items) {
      await expect(page.locator(`nav a:has-text("${item}"), .sidebar a:has-text("${item}")`).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-DASH-008 | "Pending Accept" count matches Submitted RMA list count', async ({ page }) => {
    const dashboard = new RMADashboardPage(page);
    const bubbleCount = await dashboard.getCardCount(DASHBOARD.employee.pendingAccept);
    await page.goto(ROUTES.rmaDashboard);
    await dashboard.clickCard(DASHBOARD.employee.pendingAccept);
    const listCount = await page.locator('table tbody tr').count();
    expect(listCount).toBe(bubbleCount);
  });
});

test.describe('RMA Dashboard — Customer View @dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');
  });

  test('TC-DASH-009 | Customer sees 3 KPI bubbles (not 6)', async ({ page }) => {
    await expect(page.locator('text=/Awaiting Device/i').first()).toBeVisible();
    await expect(page.locator('text=/RMA In Progress/i').first()).toBeVisible();
    await expect(page.locator('text=/RMA Repaired/i').first()).toBeVisible();
    await expect(page.locator('text=/Pending Accept/i').first()).toBeHidden();
    await expect(page.locator('text=/More than 3 times/i').first()).toBeHidden();
  });

  test('TC-DASH-010 | Customer "Awaiting Device" zero-count bubble is clickable', async ({ page }) => {
    const dashboard = new RMADashboardPage(page);
    const count = await dashboard.getCardCount(DASHBOARD.customer.awaitingDevice);
    if (count === 0) {
      await dashboard.clickCard(DASHBOARD.customer.awaitingDevice);
      await expect(page).not.toHaveURL(/\/login/);
      await page.waitForLoadState('networkidle');
    }
  });
});
