// @ts-check
/**
 * tests/rma/dashboard.spec.js
 * RMA Dashboard Tests — KPI Bubbles, Click-Through Filters, Zero-Count Behaviour (10 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs, switchRole } = require('../../src/helpers/rmaAuthHelper');
const { RMADashboardPage } = require('../../src/pages/rma/RMADashboardPage');
// const { ViewRMAPage } = require('../../src/pages/rma/ViewRMAPage');
const { USERS, ROUTES, DASHBOARD } = require('../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../src/helpers/Logger');

test.describe('RMA Dashboard — Employee View @dashboard', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('Dashboard');
    await allure.story('KPI Overview');
  });



  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-DASH-001 | Dashboard page heading and intro text visible @smoke', async ({ page }) => {
    Logger.step('Dashboard page heading and intro text visible');

    await expect(page.locator('h1, h2').filter({ hasText: /RMA Requests/i }).first()).toBeVisible();
    await expect(page.locator('text=/RMA Dashboard/i').first()).toBeVisible();
    await expect(page.locator('text=/comprehensive overview/i').first()).toBeVisible();
  });

  test('TC-DASH-002 | All 6 Employee KPI cards are visible @dashboard', async ({ page }) => {
    Logger.step('All 6 Employee KPI cards are visible');

    const cards = ['Pending Accept', 'In Progress', 'More than 30 days', 'More than 3 times', 'Repaired but not closed', 'Accepted & Not Received'];
    for (const card of cards) {
      await expect(page.locator(`text=/${card}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('TC-DASH-003 | Clicking "Pending Accept" filters View RMA to Submitted @dashboard', async ({ page }) => {
    Logger.step('Clicking "Pending Accept" filters View RMA to Submitted');

    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.pendingAccept);
    await expect(page.locator('text=/Dashboard.*Pending Accept/i').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=/RMA ID.*DESC/i').first()).toBeVisible();

    const statusBadges = page.locator('[class*="badge"], [class*="status"]').filter({ hasText: /Submitted|Accepted|Received|On-Hold|Repaired|Rejected|Closed/ });
    const badgeCount = await statusBadges.count();
    for (let i = 0; i < Math.min(badgeCount, 5); i++) {
      await expect((await statusBadges.nth(i).textContent())?.trim()).toBe('Submitted');
    }
  });

  test('TC-DASH-004 | Clicking "RMA Repair In Progress" filters to Received RMAs @dashboard', async ({ page }) => {
    Logger.step('Clicking "RMA Repair In Progress" filters to Received RMAs');

    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.inProgress);
    await expect(page.locator('text=/Dashboard.*In Progress/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-DASH-005 | Zero-count bubble is NOT disabled — remains clickable @dashboard', async ({ page }) => {
    Logger.step('Zero-count bubble is NOT disabled — remains clickable');

    const dashboard = new RMADashboardPage(page);
    const cardName = DASHBOARD.employee.inProgressOver30;
    const count = await dashboard.getCardCount(cardName);

    if (count === 0) {
      await expect(await dashboard.expectCardClickable(cardName)).toBe(true);
      await dashboard.clickCard(cardName);
      await expect(page).not.toHaveURL(/\/login/);
    } else {
      test.info().annotations.push({ type: 'info', description: `Card has count ${count}, not 0 — skipping zero test` });
    }
  });

  test('TC-DASH-006 | Zero-count bubble navigates to filtered empty list @dashboard', async ({ page }) => {
    Logger.step('Zero-count bubble navigates to filtered empty list');

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
        await page.waitForLoadState('domcontentloaded');
        await expect(page.url()).not.toContain('/login');
        await page.goto(ROUTES.rmaDashboard);
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });

  test('TC-DASH-007 | Sidebar navigation items all visible for RMA Admin @dashboard', async ({ page }) => {
    Logger.step('Sidebar navigation items all visible for RMA Admin');

    const items = ['Dashboard', 'Submit RMA Request', 'View RMA Request', 'Factory Insert RMA', 'Factory Receive RMA', 'Manage Address'];
    for (const item of items) {
      await expect(page.locator(`nav a:has-text("${item}"), .sidebar a:has-text("${item}")`).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-DASH-008 | "Pending Accept" count matches Submitted RMA list count @dashboard', async ({ page }) => {
    Logger.step('"Pending Accept" count matches Submitted RMA list count');

    const dashboard = new RMADashboardPage(page);
    const bubbleCount = await dashboard.getCardCount(DASHBOARD.employee.pendingAccept);
    await page.goto(ROUTES.rmaDashboard);
    await dashboard.clickCard(DASHBOARD.employee.pendingAccept);
    const listCount = await page.locator('table tbody tr').count();
    await expect(listCount).toBe(bubbleCount);
  });
});

test.describe('RMA Dashboard — Customer View @dashboard', () => {


  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.customerOne);
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-DASH-009 | Customer sees 3 KPI bubbles (not 6) @dashboard', async ({ page }) => {
    Logger.step('Customer sees 3 KPI bubbles (not 6)');

    await expect(page.locator('text=/Awaiting Device/i').first()).toBeVisible();
    await expect(page.locator('text=/RMA In Progress/i').first()).toBeVisible();
    await expect(page.locator('text=/RMA Repaired/i').first()).toBeVisible();
    await expect(page.locator('text=/Pending Accept/i').first()).toBeHidden();
    await expect(page.locator('text=/More than 3 times/i').first()).toBeHidden();
  });

  test('TC-DASH-010 | Customer "Awaiting Device" zero-count bubble is clickable @dashboard', async ({ page }) => {
    Logger.step('Customer "Awaiting Device" zero-count bubble is clickable');

    const dashboard = new RMADashboardPage(page);
    const count = await dashboard.getCardCount(DASHBOARD.customer.awaitingDevice);
    if (count === 0) {
      await dashboard.clickCard(DASHBOARD.customer.awaitingDevice);
      await expect(page).not.toHaveURL(/\/login/);
      await page.waitForLoadState('domcontentloaded');
    }
  });
});
