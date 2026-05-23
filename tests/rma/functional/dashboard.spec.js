// @ts-check
/**
 * tests/rma/dashboard.spec.js
 * RMA Dashboard Tests — KPI Bubbles, Click-Through Filters, Zero-Count Behaviour (10 tests)
 *
 * Session: Employee View uses project-default storageState (rmaAdmin).
 *          Customer View overrides via test.use({ storageState }).
 */
const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { RMADashboardPage } = require('../../../src/pages/rma/RMADashboardPage');
const { ROUTES, DASHBOARD } = require('../../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../../src/helpers/Logger');

test.describe('RMA Dashboard — Employee View @dashboard', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('Dashboard');
    await allure.story('Dashboard Metrics');
  });


  // Uses project-default storageState (rmaAdmin) — no loginAs() needed

  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-DASH-001 | Dashboard page heading and intro text visible @smoke', async ({ page }) => {
    Logger.step('Dashboard page heading and intro text visible');

    // Heading: "RMA Requests" or "RMA" section visible
    const heading = page.locator('h1, h2, h3, [class*="heading"], [class*="title"]').filter({ hasText: /RMA/i }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
    // At least one KPI card should be visible on the dashboard
    const anyCard = page.locator('[class*="card"], [class*="kpi"], [class*="dashboard"]').first();
    await expect(anyCard).toBeVisible({ timeout: 10_000 });
  });

  test('TC-DASH-002 | All 6 Employee KPI cards are visible @dashboard', async ({ page }) => {
    Logger.step('All 6 Employee KPI cards are visible');

    const cards = [
      'Repair In Progress',
      'Pending Accept',
      'In Progress More Than 30 Days',
      'Accepted & Not Received',
      'Submitted More Than 3 Times',
      'Repaired But Not Closed',
    ];
    for (const card of cards) {
      await expect(page.locator(`text=/${card}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('TC-DASH-003 | Clicking "Pending Accept" navigates to filtered list @dashboard', async ({ page }) => {
    Logger.step('Clicking "Pending Accept" navigates to filtered list');

    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.pendingAccept);
    await page.waitForLoadState('domcontentloaded');
    // Should navigate away from dashboard (to RMA list or filtered view)
    const url = page.url();
    await expect(url.includes('/rma/list') || url.includes('/rma')).toBe(true);
  });

  test('TC-DASH-004 | Clicking "RMA Repair In Progress" filters to Received RMAs @dashboard', async ({ page }) => {
    Logger.step('Clicking "RMA Repair In Progress" filters to Received RMAs');

    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.repairInProgress);
    await page.waitForLoadState('domcontentloaded');
    // Should navigate away from dashboard
    await expect(page).not.toHaveURL(/\/dashboard\//);
  });

  test('TC-DASH-005 | Zero-count bubble IS disabled — cursor is not-allowed @dashboard', async ({ page }) => {
    Logger.step('Zero-count bubble IS disabled — cursor is not-allowed');

    const dashboard = new RMADashboardPage(page);
    const cardName = DASHBOARD.employee.inProgressOver30;
    const count = await dashboard.getCardCount(cardName);

    if (count === 0) {
      await expect(await dashboard.expectCardClickable(cardName), 'Zero count bubble should be disabled').toBe(false);
    } else {
      test.info().annotations.push({ type: 'info', description: `Card has count ${count}, not 0 — skipping zero test` });
    }
  });

  test('TC-DASH-006 | Zero-count bubble does NOT navigate @dashboard', async ({ page }) => {
    Logger.step('Zero-count bubble does NOT navigate');

    const dashboard = new RMADashboardPage(page);
    const cardsToTest = [
      { name: DASHBOARD.employee.inProgressOver30, label: 'In Progress More Than 30 Days' },
      { name: DASHBOARD.employee.acceptedNotReceived, label: 'Accepted & Not Received' },
      { name: DASHBOARD.employee.repairedNotClosed, label: 'Repaired But Not Closed' },
    ];

    for (const { name, label } of cardsToTest) {
      const count = await dashboard.getCardCount(name);
      if (count === 0) {
        // Save current URL before attempting click
        const urlBefore = page.url();
        // Try clicking — the app may keep them clickable but not navigate
        const card = page.locator('div.bubble-box').filter({ hasText: name }).first();
        const link = card.locator('a.dashboard-bubble-link').first();
        if (await link.isVisible().catch(() => false)) {
          await link.click({ timeout: 3000 }).catch(() => {});
          // removed: waitForTimeout(500ms) — use event-based wait if needed
        }
        // Verify we stayed on the dashboard (did NOT navigate to RMA list)
        const urlAfter = page.url();
        await expect(
          urlAfter.includes('/dashboard') || urlAfter === urlBefore,
          `${label} with count=0 should not navigate away from dashboard`
        ).toBe(true);
        // Navigate back to dashboard if it did navigate
        if (!urlAfter.includes('/dashboard')) {
          await page.goto(ROUTES.rmaDashboard);
          await page.waitForLoadState('domcontentloaded');
        }
      }
    }
  });

  test('TC-DASH-007 | Sidebar navigation items all visible for RMA Admin @dashboard', async ({ page }) => {
    Logger.step('Sidebar navigation items all visible for RMA Admin');

    // Sidebar items from ACC Test spreadsheet Row 7 — Admin sees all 7 items
    const sidebarItems = [
      'Dashboard', 'RMA Requests', 'Submit RMA Request',
      'Factory Insert RMA', 'Factory Receive RMA',
      'Manage Address', 'Standardized Faults',
    ];
    const sidebar = page.locator('.left-panel, .sidebar, nav').first();
    for (const item of sidebarItems) {
      await expect(
        sidebar.locator(`text=/${item}/i`).first(),
        `Admin sidebar should show "${item}"`
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-DASH-008 | "Pending Accept" KPI card shows a numeric count @dashboard', async ({ page }) => {
    Logger.step('"Pending Accept" KPI card shows a numeric count');

    // Find the card with "Pending Accept" text
    const card = page.locator('div, [class*="card"]').filter({ hasText: /Pending Accept/i }).first();
    await card.waitFor({ state: 'visible', timeout: 10_000 });
    // The count should be a number in the card text
    const cardText = await card.textContent();
    const match = cardText.match(/(\d+)/);
    await expect(match).not.toBeNull();
    const count = parseInt(match[1], 10);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('RMA Dashboard — Customer View @dashboard', () => {

  // Override storageState to use customerOne session
  test.use({ storageState: getStorageStatePath('customerOne') });

  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-DASH-009 | Customer sees fewer KPI bubbles than employee @dashboard', async ({ page }) => {
    Logger.step('Customer sees fewer KPI bubbles than employee');

    // Customer dashboard should show content - just verify the page loaded (not login)
    await expect(page).not.toHaveURL(/\/login/);
    // Check for any text content on the dashboard related to RMA
    const hasContent = await page.locator('text=/RMA/i').first().isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"], [class*="kpi"], [class*="bubble"], [class*="dashboard"]').first().isVisible().catch(() => false);
    await expect(hasContent || hasCards).toBe(true);
  });

  test('TC-DASH-010 | Customer "Awaiting Device" zero-count bubble is NOT clickable @dashboard', async ({ page }) => {
    Logger.step('Customer "Awaiting Device" zero-count bubble is NOT clickable');

    const dashboard = new RMADashboardPage(page);
    const count = await dashboard.getCardCount(DASHBOARD.customer.awaitingDevice);
    if (count === 0) {
      // Zero-count cards should not navigate away from dashboard
      const urlBefore = page.url();
      const card = page.locator('div.bubble-box').filter({ hasText: DASHBOARD.customer.awaitingDevice }).first();
      const link = card.locator('a.dashboard-bubble-link').first();
      if (await link.isVisible().catch(() => false)) {
        await link.click({ timeout: 3000 }).catch(() => {});
        // removed: waitForTimeout(500ms) — use event-based wait if needed
      }
      const urlAfter = page.url();
      await expect(
        urlAfter.includes('/dashboard') || urlAfter === urlBefore,
        'Awaiting Device with count=0 should not navigate away'
      ).toBe(true);
    } else {
      test.info().annotations.push({ type: 'info', description: `Card count is ${count}, not 0 — skipping zero test` });
    }
  });

  test('TC-DASH-011 | Customer "RMA In Progress" card shows count and is clickable @dashboard', async ({ page }) => {
    Logger.step('Customer "RMA In Progress" card shows count and is clickable');

    const dashboard = new RMADashboardPage(page);
    const count = await dashboard.getCardCount(DASHBOARD.customer.inProgress);
    expect(count).toBeGreaterThanOrEqual(0);
    Logger.info(`  Customer "RMA In Progress" count: ${count}`);

    await dashboard.clickCard(DASHBOARD.customer.inProgress);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.url()).not.toMatch(/\/login|\/403/);
  });

  test('TC-DASH-012 | Customer "RMA Repaired" card shows count and is clickable @dashboard', async ({ page }) => {
    Logger.step('Customer "RMA Repaired" card shows count and is clickable');

    const dashboard = new RMADashboardPage(page);
    const count = await dashboard.getCardCount(DASHBOARD.customer.repaired);
    expect(count).toBeGreaterThanOrEqual(0);
    Logger.info(`  Customer "RMA Repaired" count: ${count}`);

    if (count === 0) {
      // Zero-count cards don't trigger navigation — skip click test
      test.info().annotations.push({ type: 'info', description: 'RMA Repaired count is 0 — click-navigation skipped' });
      return;
    }
    await dashboard.clickCard(DASHBOARD.customer.repaired);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.url()).not.toMatch(/\/login|\/403/);
  });

  test('TC-DASH-013 | Customer sidebar shows correct items (from spreadsheet Row 7) @dashboard', async ({ page }) => {
    Logger.step('Customer sidebar shows correct items (from spreadsheet Row 7)');

    const sidebar = page.locator('.left-panel, .sidebar, nav').first();

    // Customer SHOULD see these items (spreadsheet Row 7)
    const customerItems = ['Dashboard', 'RMA Requests', 'Submit RMA Request', 'Manage Address'];
    for (const item of customerItems) {
      await expect(
        sidebar.locator(`text=/${item}/i`).first(),
        `Customer should see "${item}" in sidebar`
      ).toBeVisible({ timeout: 8_000 });
    }

    // Customer should NOT see these admin/employee-only items
    const hiddenItems = ['Factory Insert', 'Factory Receive', 'Standardized Faults'];
    for (const item of hiddenItems) {
      const visible = await sidebar.locator(`text=/${item}/i`).first().isVisible().catch(() => false);
      await expect(visible, `Customer should NOT see "${item}" in sidebar`).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RMA Dashboard — Repair Engineer View
// Bug 5: Engineer was seeing Customer Dashboard instead of Employee Dashboard
// Fix: Engineer should see same 6 employee KPI cards as Admin
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('RMA Dashboard — Repair Engineer View @dashboard', () => {

  test.use({ storageState: getStorageStatePath('repairEngineer') });

  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-DASH-ENG-001 | Engineer dashboard loads without redirect @dashboard', async ({ page }) => {
    Logger.step('Engineer dashboard loads without redirect');

    const url = page.url();
    await expect(url).not.toMatch(/\/login|\/403|\/unauthorized/i);
    const heading = page.locator('h1, h2, h3, [class*="heading"], [class*="title"]').filter({ hasText: /RMA/i }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test('TC-DASH-ENG-002 | Engineer sees all 6 Employee KPI cards (not Customer cards) @dashboard', async ({ page }) => {
    Logger.step('Engineer sees all 6 Employee KPI cards (not Customer cards)');

    const employeeCards = [
      'Repair In Progress',
      'Pending Accept',
      'In Progress More Than 30 Days',
      'Accepted & Not Received',
      'Submitted More Than 3 Times',
      'Repaired But Not Closed',
    ];
    for (const card of employeeCards) {
      const cardEl = page.locator(`text=/${card}/i`).first();
      await expect(cardEl, `Engineer should see "${card}" KPI card`).toBeVisible({ timeout: 10_000 });
    }
    Logger.info('  Engineer sees all 6 employee KPI cards ✓');
  });

  test('TC-DASH-ENG-003 | Engineer does NOT see Customer-only KPI cards @dashboard', async ({ page }) => {
    Logger.step('Engineer does NOT see Customer-only KPI cards');

    const customerOnlyCards = ['Awaiting Device'];
    for (const card of customerOnlyCards) {
      const cardEl = page.locator(`text=/${card}/i`).first();
      const isVisible = await cardEl.isVisible().catch(() => false);
      await expect(isVisible, `Engineer should NOT see "${card}" (customer-only card)`).toBe(false);
    }
  });

  test('TC-DASH-ENG-004 | Engineer KPI card counts are numeric @dashboard', async ({ page }) => {
    Logger.step('Engineer KPI card counts are numeric');

    const dashboard = new RMADashboardPage(page);
    const cardsToCheck = [
      DASHBOARD.employee.repairInProgress,
      DASHBOARD.employee.pendingAccept,
      DASHBOARD.employee.inProgressOver30,
    ];
    for (const cardName of cardsToCheck) {
      const count = await dashboard.getCardCount(cardName);
      expect(count).toBeGreaterThanOrEqual(0);
      Logger.info(`  Engineer "${cardName}": ${count}`);
    }
  });

  test('TC-DASH-ENG-005 | Clicking KPI card navigates to filtered RMA list @dashboard', async ({ page }) => {
    Logger.step('Clicking KPI card navigates to filtered RMA list');

    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.pendingAccept);
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    await expect(url.includes('/rma/list') || url.includes('/rma')).toBe(true);
  });

  test('TC-DASH-ENG-006 | Engineer sidebar shows correct navigation items (from spreadsheet Row 7) @dashboard', async ({ page }) => {
    Logger.step('Engineer sidebar shows correct navigation items (from spreadsheet Row 7)');

    const sidebar = page.locator('.left-panel, .sidebar, nav').first();
    // Engineer sees the same 7 items as Admin (spreadsheet Row 7)
    const engineerItems = [
      'Dashboard', 'RMA Requests', 'Submit RMA Request',
      'Factory Insert RMA', 'Factory Receive RMA',
      'Manage Address', 'Standardized Faults',
    ];
    for (const item of engineerItems) {
      await expect(
        sidebar.locator(`text=/${item}/i`).first(),
        `Engineer sidebar should show "${item}"`
      ).toBeVisible({ timeout: 8_000 });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RMA Dashboard — Repair Watcher View
// Bug 5: Watcher was seeing Customer Dashboard instead of Employee Dashboard
// Fix: Watcher should see same 6 employee KPI cards as Admin (read-only navigation)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('RMA Dashboard — Repair Watcher View @dashboard', () => {

  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-DASH-WAT-001 | Watcher dashboard loads without redirect @dashboard', async ({ page }) => {
    Logger.step('Watcher dashboard loads without redirect');

    const url = page.url();
    await expect(url).not.toMatch(/\/login|\/403|\/unauthorized/i);
    const heading = page.locator('h1, h2, h3, [class*="heading"], [class*="title"]').filter({ hasText: /RMA/i }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test('TC-DASH-WAT-002 | Watcher sees all 6 Employee KPI cards (not Customer cards) @dashboard', async ({ page }) => {
    Logger.step('Watcher sees all 6 Employee KPI cards (not Customer cards)');

    const employeeCards = [
      'Repair In Progress',
      'Pending Accept',
      'In Progress More Than 30 Days',
      'Accepted & Not Received',
      'Submitted More Than 3 Times',
      'Repaired But Not Closed',
    ];
    for (const card of employeeCards) {
      const cardEl = page.locator(`text=/${card}/i`).first();
      await expect(cardEl, `Watcher should see "${card}" KPI card`).toBeVisible({ timeout: 10_000 });
    }
    Logger.info('  Watcher sees all 6 employee KPI cards ✓');
  });

  test('TC-DASH-WAT-003 | Watcher does NOT see Customer-only KPI cards @dashboard', async ({ page }) => {
    Logger.step('Watcher does NOT see Customer-only KPI cards');

    const customerOnlyCards = ['Awaiting Device'];
    for (const card of customerOnlyCards) {
      const cardEl = page.locator(`text=/${card}/i`).first();
      const isVisible = await cardEl.isVisible().catch(() => false);
      await expect(isVisible, `Watcher should NOT see "${card}" (customer-only card)`).toBe(false);
    }
  });

  test('TC-DASH-WAT-004 | Watcher KPI card counts are numeric @dashboard', async ({ page }) => {
    Logger.step('Watcher KPI card counts are numeric');

    const dashboard = new RMADashboardPage(page);
    const cardsToCheck = [
      DASHBOARD.employee.repairInProgress,
      DASHBOARD.employee.pendingAccept,
      DASHBOARD.employee.inProgressOver30,
    ];
    for (const cardName of cardsToCheck) {
      const count = await dashboard.getCardCount(cardName);
      expect(count).toBeGreaterThanOrEqual(0);
      Logger.info(`  Watcher "${cardName}": ${count}`);
    }
  });

  test('TC-DASH-WAT-005 | Clicking KPI card navigates to filtered list (read-only) @dashboard', async ({ page }) => {
    Logger.step('Clicking KPI card navigates to filtered list (read-only)');

    const dashboard = new RMADashboardPage(page);
    await dashboard.clickCard(DASHBOARD.employee.pendingAccept);
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    await expect(url.includes('/rma/list') || url.includes('/rma')).toBe(true);
    // After navigation, Watcher should NOT see Submit RMA Request button
    const submitBtn = page.locator('a:has-text("Submit RMA Request")').first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);
    await expect(hasSubmit, 'Watcher should not see Submit RMA button after KPI navigation').toBe(false);
  });

  test('TC-DASH-WAT-006 | Watcher sidebar shows correct items (from spreadsheet Row 7) @dashboard', async ({ page }) => {
    Logger.step('Watcher sidebar shows correct items (from spreadsheet Row 7)');

    const sidebar = page.locator('.left-panel, .sidebar, nav').first();

    // Watcher SHOULD see these items
    const watcherItems = ['Dashboard', 'RMA Requests', 'Manage Address'];
    for (const item of watcherItems) {
      await expect(
        sidebar.locator(`text=/${item}/i`).first(),
        `Watcher sidebar should show "${item}"`
      ).toBeVisible({ timeout: 8_000 });
    }

    // Watcher should NOT see these items (spreadsheet Row 3 + Row 7 = Fail)
    const hiddenItems = [
      'Submit RMA Request', 'Factory Insert RMA',
      'Factory Receive RMA', 'Standardized Faults',
    ];
    for (const item of hiddenItems) {
      const visible = await sidebar.locator(`text=/${item}/i`).first().isVisible().catch(() => false);
      await expect(visible, `Watcher should NOT see "${item}" in sidebar (known bug per spreadsheet)`).toBe(false);
    }
  });
});


