// @ts-check
/**
 * Dashboard KPI Card Count Verification — All Roles
 *
 * Uses test.use({storageState}) per role (Playwright best practice).
 * Cross-role comparison is done via a shared temp file.
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ROUTES, DASHBOARD } = require('../../../src/helpers/Constants');
const { RMADashboardPage } = require('../../../src/pages/rma/RMADashboardPage');
const fs = require('fs');
const path = require('path');
const { allure } = require('allure-playwright');
const Logger = require('../../../src/helpers/Logger');

const SHARED_FILE = path.resolve(__dirname, '..', '..', '..', '.auth', 'kpi-snapshot.json');

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Use the POM's getCardCount — already validated against the live app */
async function getKPICount(page, cardTitle) {
  const dashboard = new RMADashboardPage(page);
  return dashboard.getCardCount(cardTitle);
}

async function captureEmployeeKPI(page) {
  await page.goto(ROUTES.rmaDashboard);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)
  return {
    pendingAccept:       await getKPICount(page, DASHBOARD.employee.pendingAccept),
    acceptedNotReceived: await getKPICount(page, DASHBOARD.employee.acceptedNotReceived),
    repairInProgress:    await getKPICount(page, DASHBOARD.employee.repairInProgress),
    inProgressOver30:    await getKPICount(page, DASHBOARD.employee.inProgressOver30),
    submittedMore3Times: await getKPICount(page, DASHBOARD.employee.submittedMore3Times),
    repairedNotClosed:   await getKPICount(page, DASHBOARD.employee.repairedNotClosed),
  };
}

async function captureCustomerKPI(page) {
  await page.goto(ROUTES.rmaDashboard);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)
  return {
    awaitingDevice: await getKPICount(page, DASHBOARD.customer.awaitingDevice),
    inProgress:     await getKPICount(page, DASHBOARD.customer.inProgress),
    repaired:       await getKPICount(page, DASHBOARD.customer.repaired),
  };
}

function saveSnapshot(roleKey, data) {
  let all = {};
  if (fs.existsSync(SHARED_FILE)) {
    try { all = JSON.parse(fs.readFileSync(SHARED_FILE, 'utf-8')); } catch { all = {}; }
  }
  all[roleKey] = data;
  fs.writeFileSync(SHARED_FILE, JSON.stringify(all, null, 2));
}

function loadSnapshot(roleKey) {
  if (!fs.existsSync(SHARED_FILE)) {return null;}
  try {
    return JSON.parse(fs.readFileSync(SHARED_FILE, 'utf-8'))[roleKey] || null;
  } catch { return null; }
}

async function _getListRowCount(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)
  const showingText = await page.locator('text=/Showing.*of.*\\d+/i').first().textContent().catch(() => '');
  const totalMatch = showingText.match(/of\s+(\d+)/i);
  if (totalMatch) {return parseInt(totalMatch[1], 10);}
  return page.locator('table tbody tr').count();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN KPI — Capture counts + click-through
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Admin Dashboard @dashboard-kpi', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('Dashboard');
    await allure.story('KPI Workflow Integration');
  });


  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('KPI-ADM-001 | Admin sees all 6 employee KPI cards @dashboard', async ({ page }) => {
    Logger.step('KPI-ADM-001 | Admin sees all 6 employee KPI cards');

    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');

        const cards = [
      DASHBOARD.employee.pendingAccept,
      DASHBOARD.employee.acceptedNotReceived,
      DASHBOARD.employee.repairInProgress,
      DASHBOARD.employee.inProgressOver30,
      DASHBOARD.employee.submittedMore3Times,
      DASHBOARD.employee.repairedNotClosed,
    ];
    for (const card of cards) {
      await expect(page.locator(`text=/${card}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('KPI-ADM-002 | Capture Admin KPI counts (shared for cross-role comparison) @dashboard', async ({ page }) => {
    Logger.step('KPI-ADM-002 | Capture Admin KPI counts (shared for cross-role comparison)');

    const kpi = await captureEmployeeKPI(page);
    saveSnapshot('admin', kpi);
    Logger.info('  Admin KPI:', JSON.stringify(kpi));
    for (const k of Object.keys(kpi)) {
      await expect(kpi[k]).toBeGreaterThanOrEqual(0);
    }
  });

  const empCards = [
    { key: 'pendingAccept',       title: DASHBOARD.employee.pendingAccept,       color: 'blue' },
    { key: 'acceptedNotReceived', title: DASHBOARD.employee.acceptedNotReceived, color: 'red' },
    { key: 'repairInProgress',    title: DASHBOARD.employee.repairInProgress,    color: 'blue' },
    { key: 'inProgressOver30',    title: DASHBOARD.employee.inProgressOver30,    color: 'red' },
    { key: 'submittedMore3Times', title: DASHBOARD.employee.submittedMore3Times, color: 'red' },
    { key: 'repairedNotClosed',   title: DASHBOARD.employee.repairedNotClosed,   color: 'blue' },
  ];

  for (const { key, title, color } of empCards) {
    test(`KPI-ADM-CLICK-${key} | Admin: "${title}" click navigates to filtered list @dashboard`, async ({ page }) => {
    Logger.step('KPI-ADM-CLICK-... | Admin: "..." click navigates to filtered list');

      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('domcontentloaded');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);

      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        const isClickable = await dashboard.expectCardClickable(title);
        Logger.info(`  "${title}": count=0, clickable=${isClickable}, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        // Verify we navigated to the list page
        await expect(page).toHaveURL(/\/rma\/list/);
        // Verify a table with rows is present
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        Logger.info(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEER KPI — Capture + click-through
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Engineer Dashboard @dashboard-kpi', () => {

  test.use({ storageState: getStorageStatePath('repairEngineer') });

  test('KPI-ENG-001 | Engineer sees all 6 employee KPI cards @dashboard', async ({ page }) => {
    Logger.step('KPI-ENG-001 | Engineer sees all 6 employee KPI cards');

    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
    const cards = [
      DASHBOARD.employee.pendingAccept, DASHBOARD.employee.acceptedNotReceived,
      DASHBOARD.employee.repairInProgress, DASHBOARD.employee.inProgressOver30,
      DASHBOARD.employee.submittedMore3Times, DASHBOARD.employee.repairedNotClosed,
    ];
    for (const t of cards) {
      await expect(page.locator(`text=/${t}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('KPI-ENG-002 | Capture Engineer KPI counts @dashboard', async ({ page }) => {
    Logger.step('KPI-ENG-002 | Capture Engineer KPI counts');

    const kpi = await captureEmployeeKPI(page);
    saveSnapshot('engineer', kpi);
    Logger.info('  Engineer KPI:', JSON.stringify(kpi));
  });

    const empCards = [
    { key: 'pendingAccept',       title: DASHBOARD.employee.pendingAccept,       color: 'blue' },
    { key: 'acceptedNotReceived', title: DASHBOARD.employee.acceptedNotReceived, color: 'red' },
    { key: 'repairInProgress',    title: DASHBOARD.employee.repairInProgress,    color: 'blue' },
    { key: 'inProgressOver30',    title: DASHBOARD.employee.inProgressOver30,    color: 'red' },
    { key: 'submittedMore3Times', title: DASHBOARD.employee.submittedMore3Times, color: 'red' },
    { key: 'repairedNotClosed',   title: DASHBOARD.employee.repairedNotClosed,   color: 'blue' },
  ];

  for (const { key, title, color } of empCards) {
    test(`KPI-ENG-CLICK-${key} | Engineer: "${title}" click navigates to filtered list @dashboard`, async ({ page }) => {
    Logger.step('KPI-ENG-CLICK-... | Engineer: "..." click navigates to filtered list');

      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('domcontentloaded');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);
      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        Logger.info(`  "${title}": count=0, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        await expect(page).toHaveURL(/\/rma\/list/);
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        Logger.info(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WATCHER KPI — Capture + click-through + read-only checks
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Watcher Dashboard @dashboard-kpi', () => {

  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test('KPI-WAT-001 | Watcher sees all 6 employee KPI cards @dashboard', async ({ page }) => {
    Logger.step('KPI-WAT-001 | Watcher sees all 6 employee KPI cards');

    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
    // Dashboard sheet: Employee cards = 6 cards (same for Admin, Engineer, Watcher)
    const cards = [
      DASHBOARD.employee.pendingAccept,
      DASHBOARD.employee.acceptedNotReceived,
      DASHBOARD.employee.repairInProgress,
      DASHBOARD.employee.inProgressOver30,
      DASHBOARD.employee.submittedMore3Times,
      DASHBOARD.employee.repairedNotClosed,
    ];
    for (const c of cards) {
      await expect(page.locator(`text=/${c}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('KPI-WAT-002 | Capture Watcher KPI counts @dashboard', async ({ page }) => {
    Logger.step('KPI-WAT-002 | Capture Watcher KPI counts');

    const kpi = await captureEmployeeKPI(page);
    saveSnapshot('watcher', kpi);
    Logger.info('  Watcher KPI:', JSON.stringify(kpi));
  });

  test('KPI-WAT-004 | Watcher card click navigates to list (no write actions) @dashboard', async ({ page }) => {
    Logger.step('KPI-WAT-004 | Watcher card click navigates to list (no write actions)');

    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
    const dashboard = new RMADashboardPage(page);
    const kpiCount = await dashboard.getCardCount(DASHBOARD.employee.repairInProgress);
    if (kpiCount > 0) {
      await dashboard.clickCard(DASHBOARD.employee.repairInProgress);
      await expect(page).toHaveURL(/\/rma/);
      await expect(await page.locator('button:has-text("Accept")').first().isVisible().catch(() => false)).toBe(false);
    }
  });

  const empCards = [
    { key: 'pendingAccept',       title: DASHBOARD.employee.pendingAccept,       color: 'blue' },
    { key: 'acceptedNotReceived', title: DASHBOARD.employee.acceptedNotReceived, color: 'red' },
    { key: 'repairInProgress',    title: DASHBOARD.employee.repairInProgress,    color: 'blue' },
    { key: 'inProgressOver30',    title: DASHBOARD.employee.inProgressOver30,    color: 'red' },
    { key: 'submittedMore3Times', title: DASHBOARD.employee.submittedMore3Times, color: 'red' },
    { key: 'repairedNotClosed',   title: DASHBOARD.employee.repairedNotClosed,   color: 'blue' },
  ];

  for (const { key, title, color } of empCards) {
    test(`KPI-WAT-CLICK-${key} | Watcher: "${title}" click navigates to filtered list @dashboard`, async ({ page }) => {
    Logger.step('KPI-WAT-CLICK-... | Watcher: "..." click navigates to filtered list');

      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('domcontentloaded');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);
      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        Logger.info(`  "${title}": count=0, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        await expect(page).toHaveURL(/\/rma\/list/);
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        Logger.info(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER KPI — 3 customer cards + click-through
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Customer Dashboard @dashboard-kpi', () => {

  test.use({ storageState: getStorageStatePath('customerOne') });

  test('KPI-CUST-001 | Customer sees 3 customer KPI cards @dashboard', async ({ page }) => {
    Logger.step('KPI-CUST-001 | Customer sees 3 customer KPI cards');

    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
    for (const c of ['Awaiting Device', 'In Progress', 'Repaired']) {
      await expect(page.locator(`text=/${c}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('KPI-CUST-002 | Customer does NOT see employee-only cards @dashboard', async ({ page }) => {
    Logger.step('KPI-CUST-002 | Customer does NOT see employee-only cards');

    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('domcontentloaded');
    for (const c of ['Pending Accept', 'Accepted & Not Received', 'Repaired But Not Closed']) {
      await expect(await page.locator(`text=/${c}/i`).first().isVisible().catch(() => false)).toBe(false);
    }
  });

  test('KPI-CUST-003 | Customer KPI counts ≥ 0 @dashboard', async ({ page }) => {
    Logger.step('KPI-CUST-003 | Customer KPI counts ≥ 0');

    const kpi = await captureCustomerKPI(page);
    saveSnapshot('customer', kpi);
    Logger.info('  Customer KPI:', JSON.stringify(kpi));
    expect(kpi.awaitingDevice).toBeGreaterThanOrEqual(0);
    expect(kpi.inProgress).toBeGreaterThanOrEqual(0);
    expect(kpi.repaired).toBeGreaterThanOrEqual(0);
  });

    const custCards = [
    { key: 'awaitingDevice', title: DASHBOARD.customer.awaitingDevice, color: 'blue' },
    { key: 'inProgress',     title: DASHBOARD.customer.inProgress,     color: 'blue' },
    { key: 'repaired',       title: DASHBOARD.customer.repaired,       color: 'green' },
  ];

  for (const { key, title, color } of custCards) {
    test(`KPI-CUST-CLICK-${key} | Customer: "${title}" click navigates to filtered list @dashboard`, async ({ page }) => {
    Logger.step('KPI-CUST-CLICK-... | Customer: "..." click navigates to filtered list');

      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('domcontentloaded');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);
      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        Logger.info(`  "${title}": count=0, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        await expect(page).toHaveURL(/\/rma\/list/);
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        Logger.info(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-ROLE CONSISTENCY — Compare snapshots from all roles above
// Must run AFTER the Admin, Engineer, Watcher describe blocks
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Cross-Role Consistency @dashboard-kpi', () => {

  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('KPI-XROLE-001 | Admin, Engineer, Watcher see identical KPI counts @dashboard', async () => {
    Logger.step('KPI-XROLE-001 | Admin, Engineer, Watcher see identical KPI counts');

    const admin = loadSnapshot('admin');
    const engineer = loadSnapshot('engineer');
    const watcher = loadSnapshot('watcher');

    if (!admin || !engineer || !watcher) {
      test.skip(true, 'Snapshot data missing — run all role tests first');
      return;
    }

    Logger.info('  Admin:    ', JSON.stringify(admin));
    Logger.info('  Engineer: ', JSON.stringify(engineer));
    Logger.info('  Watcher:  ', JSON.stringify(watcher));

    for (const k of Object.keys(admin)) {
      await expect(engineer[k], `Engineer "${k}" should match Admin`).toBe(admin[k]);
      await expect(watcher[k],  `Watcher "${k}" should match Admin`).toBe(admin[k]);
    }
    Logger.info('  ✓ All 3 employee roles show identical KPI counts');
  });

  });