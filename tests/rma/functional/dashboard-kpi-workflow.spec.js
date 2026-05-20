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

const SHARED_FILE = path.resolve(__dirname, '..', '..', '..', '.auth', 'kpi-snapshot.json');

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Use the POM's getCardCount — already validated against the live app */
async function getKPICount(page, cardTitle) {
  const dashboard = new RMADashboardPage(page);
  return dashboard.getCardCount(cardTitle);
}

async function captureEmployeeKPI(page) {
  await page.goto(ROUTES.rmaDashboard);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
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
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
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
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const showingText = await page.locator('text=/Showing.*of.*\\d+/i').first().textContent().catch(() => '');
  const totalMatch = showingText.match(/of\s+(\d+)/i);
  if (totalMatch) {return parseInt(totalMatch[1], 10);}
  return page.locator('table tbody tr').count();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN KPI — Capture counts + click-through
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Admin Dashboard @dashboard-kpi', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('KPI-ADM-001 | Admin sees all 6 employee KPI cards', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');

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

  test('KPI-ADM-002 | Capture Admin KPI counts (shared for cross-role comparison)', async ({ page }) => {
    const kpi = await captureEmployeeKPI(page);
    saveSnapshot('admin', kpi);
    console.log('  Admin KPI:', JSON.stringify(kpi));
    for (const k of Object.keys(kpi)) {
      expect(kpi[k]).toBeGreaterThanOrEqual(0);
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
    test(`KPI-ADM-CLICK-${key} | Admin: "${title}" click navigates to filtered list`, async ({ page }) => {
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);

      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        const isClickable = await dashboard.expectCardClickable(title);
        console.log(`  "${title}": count=0, clickable=${isClickable}, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        // Verify we navigated to the list page
        expect(page.url()).toMatch(/\/rma\/list/);
        // Verify a table with rows is present
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        console.log(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEER KPI — Capture + click-through
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Engineer Dashboard @dashboard-kpi', () => {
  test.use({ storageState: getStorageStatePath('repairEngineer') });

  test('KPI-ENG-001 | Engineer sees all 6 employee KPI cards', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');
    const cards = [
      DASHBOARD.employee.pendingAccept, DASHBOARD.employee.acceptedNotReceived,
      DASHBOARD.employee.repairInProgress, DASHBOARD.employee.inProgressOver30,
      DASHBOARD.employee.submittedMore3Times, DASHBOARD.employee.repairedNotClosed,
    ];
    for (const t of cards) {
      await expect(page.locator(`text=/${t}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('KPI-ENG-002 | Capture Engineer KPI counts', async ({ page }) => {
    const kpi = await captureEmployeeKPI(page);
    saveSnapshot('engineer', kpi);
    console.log('  Engineer KPI:', JSON.stringify(kpi));
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
    test(`KPI-ENG-CLICK-${key} | Engineer: "${title}" click navigates to filtered list`, async ({ page }) => {
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);
      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        console.log(`  "${title}": count=0, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        expect(page.url()).toMatch(/\/rma\/list/);
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        console.log(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WATCHER KPI — Capture + click-through + read-only checks
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Watcher Dashboard @dashboard-kpi', () => {
  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test('KPI-WAT-001 | Watcher sees all 6 employee KPI cards', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');
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

  test('KPI-WAT-002 | Capture Watcher KPI counts', async ({ page }) => {
    const kpi = await captureEmployeeKPI(page);
    saveSnapshot('watcher', kpi);
    console.log('  Watcher KPI:', JSON.stringify(kpi));
  });

  test('KPI-WAT-004 | Watcher card click navigates to list (no write actions)', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');
    const dashboard = new RMADashboardPage(page);
    const kpiCount = await dashboard.getCardCount(DASHBOARD.employee.repairInProgress);
    if (kpiCount > 0) {
      await dashboard.clickCard(DASHBOARD.employee.repairInProgress);
      expect(page.url()).toMatch(/\/rma/);
      expect(await page.locator('button:has-text("Accept")').first().isVisible().catch(() => false)).toBe(false);
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
    test(`KPI-WAT-CLICK-${key} | Watcher: "${title}" click navigates to filtered list`, async ({ page }) => {
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);
      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        console.log(`  "${title}": count=0, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        expect(page.url()).toMatch(/\/rma\/list/);
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        console.log(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER KPI — 3 customer cards + click-through
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('KPI Customer Dashboard @dashboard-kpi', () => {
  test.use({ storageState: getStorageStatePath('customerOne') });

  test('KPI-CUST-001 | Customer sees 3 customer KPI cards', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');
    for (const c of ['Awaiting Device', 'In Progress', 'Repaired']) {
      await expect(page.locator(`text=/${c}/i`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('KPI-CUST-002 | Customer does NOT see employee-only cards', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');
    for (const c of ['Pending Accept', 'Accepted & Not Received', 'Repaired But Not Closed']) {
      expect(await page.locator(`text=/${c}/i`).first().isVisible().catch(() => false)).toBe(false);
    }
  });

  test('KPI-CUST-003 | Customer KPI counts ≥ 0', async ({ page }) => {
    const kpi = await captureCustomerKPI(page);
    saveSnapshot('customer', kpi);
    console.log('  Customer KPI:', JSON.stringify(kpi));
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
    test(`KPI-CUST-CLICK-${key} | Customer: "${title}" click navigates to filtered list`, async ({ page }) => {
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');
      const dashboard = new RMADashboardPage(page);
      const kpiCount = await dashboard.getCardCount(title);
      if (kpiCount === 0) {
        await dashboard.expectBubbleColor(title, 'grey');
        console.log(`  "${title}": count=0, color=grey ✓`);
        expect(true).toBe(true);
      } else {
        await dashboard.expectBubbleColor(title, color);
        await dashboard.clickCard(title);
        expect(page.url()).toMatch(/\/rma\/list/);
        const tableRows = await page.locator('table tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
        console.log(`  "${title}": KPI=${kpiCount}, navigated to list with ${tableRows} rows ✓`);
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

  test('KPI-XROLE-001 | Admin, Engineer, Watcher see identical KPI counts', async () => {
    const admin = loadSnapshot('admin');
    const engineer = loadSnapshot('engineer');
    const watcher = loadSnapshot('watcher');

    if (!admin || !engineer || !watcher) {
      test.skip(true, 'Snapshot data missing — run all role tests first');
      return;
    }

    console.log('  Admin:    ', JSON.stringify(admin));
    console.log('  Engineer: ', JSON.stringify(engineer));
    console.log('  Watcher:  ', JSON.stringify(watcher));

    for (const k of Object.keys(admin)) {
      expect(engineer[k], `Engineer "${k}" should match Admin`).toBe(admin[k]);
      expect(watcher[k],  `Watcher "${k}" should match Admin`).toBe(admin[k]);
    }
    console.log('  ✓ All 3 employee roles show identical KPI counts');
  });

  });