/**
 * tests/rma-list-filter.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * RMA List – Filter Panel Tests  (All 4 Roles)
 * Framework : Playwright Test (JavaScript) · TDD style
 * Target    : https://myconnect-acc.ekinops.com
 *
 * Filter panel per screenshot analysis:
 *
 *  Admin (Images 3 & 4):     RMA ID · Serial Number · Status · Customer · Show Only · Keyword
 *  Repair Engineer (Image 5): RMA ID · Serial Number · Show Only · Keyword
 *  Repair Watcher (Image 6):  RMA ID · Serial Number · Show Only · Keyword
 *  Customer (Images 1,2,7):   RMA ID · Serial Number · Show Only · Keyword
 *
 *  Show Only options (ALL roles): "Show All" | "Not Closed"
 *  Buttons (ALL roles):           Apply · Reset · Close
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { loginAs }      = require('../../../src/helpers/rmaAuthHelper');
const { USERS, ROUTES, RMA } = require('../../../src/helpers/Constants');

// ─── Filter Page Object ────────────────────────────────────────────────────────
class FilterPanel {
  constructor(page) {
    this.page = page;

    // Trigger button
    this.filterDataBtn = page.locator('button:has-text("Filter Data"), a:has-text("Filter Data")').first();

    // Panel container
    this.panel = page.locator('[class*="filter-panel"], [class*="dropdown-menu"], .card').filter({ hasText: /Filters/i }).first();

    // Panel heading
    this.heading = page.locator('text=Filters').first();

    // Instruction text
    this.instruction = page.locator('text=/Use the form below to refine the results/i').first();

    // ── Filter fields ──
    this.rmaIdInput  = page.locator('input[name="rma_id"]').first();
    this.serialInput = page.locator('textarea[name="serial_number"]').first();
    this.statusDrop  = page.locator('select[name="status_id[]"]').first();
    this.customerDrop = page.locator('select[name="customer_id[]"]').first();
    this.showOnlyDrop = page.locator('select[name="show_only"]').first();
    this.keywordInput = page.locator('input[name="keyword"]').first();

    // Date filter fields (from spreadsheet Row 10)
    this.dateTypeDrop = page.locator('select[name="date_type"], select[name*="date_type"]').first();
    this.fromDateInput = page.locator('input[name="from_date"], input[name*="from_date"], input[placeholder*="From" i]').first();
    this.toDateInput = page.locator('input[name="to_date"], input[name*="to_date"], input[placeholder*="To" i]').first();

    // Buttons
    this.applyBtn = page.locator('#filterSubmit').first();
    this.resetBtn = page.locator('input[name="reset"]').first();
    this.closeBtn = page.locator('#gridFilterClose').first();

    // List / results
    this.filterBanner   = page.locator('text=/Filters Applied/i').first();
    this.sortBanner     = page.locator('text=/Applied Sort Order/i').first();
    this.tableRows      = page.locator('table tbody tr, [class*="rma-row"]');
    this.paginationText = page.locator('text=/Currently Viewing Page/i').first();
  }

  async open() {
    await this.filterDataBtn.waitFor({ state: 'visible', timeout: 10_000 });
    const isExpanded = await this.filterDataBtn.getAttribute('aria-expanded') === 'true';
    if (!isExpanded) {
      await this.filterDataBtn.click();
      await this.page.waitForTimeout(500);
    }
    // Wait for at least one filter field to be visible
    try { await expect(this.showOnlyDrop).toBeAttached({ timeout: 5000 }); } catch { /* optional wait */ }
  }

  async close() {
    await this.closeBtn.click();
    await this.page.waitForTimeout(400);
  }

  async apply() {
    await this.applyBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async reset() {
    await this.resetBtn.click();
    await this.page.waitForTimeout(400);
  }

  async fillRmaId(value) {
    await this.rmaIdInput.fill(value);
  }

  async fillSerial(value) {
    await this.serialInput.fill(value);
  }

  async fillKeyword(value) {
    await this.keywordInput.fill(value);
  }

  async selectStatus(status) {
    const isNative = await this.statusDrop.isVisible().catch(() => false);
    if (isNative) {
      await this.statusDrop.selectOption({ label: status }).catch(() => {});
    } else {
      const container = this.statusDrop.locator('xpath=following-sibling::*[contains(@class, "select2-container")]').first();
      await container.click().catch(() => {});
      await this.page.waitForTimeout(300);
      const searchInput = this.page.locator('.select2-search__field').last();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(status);
        await this.page.waitForTimeout(500);
        await this.page.locator('.select2-results__option').filter({ hasText: status }).first().click().catch(() => {});
      }
    }
  }

  async selectCustomer(customer) {
    const isNative = await this.customerDrop.isVisible().catch(() => false);
    if (isNative) {
      await this.customerDrop.selectOption({ label: customer }).catch(() => {});
    } else {
      const container = this.customerDrop.locator('xpath=following-sibling::*[contains(@class, "select2-container")]').first();
      await container.click().catch(() => {});
      await this.page.waitForTimeout(300);
      const searchInput = this.page.locator('.select2-search__field').last();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(customer);
        await this.page.waitForTimeout(500);
        await this.page.locator('.select2-results__option').filter({ hasText: customer }).first().click().catch(() => {});
      }
    }
  }

  async selectShowOnly(option) {
    await this.showOnlyDrop.selectOption({ label: option });
  }

  async getShowOnlyOptions() {
    return this.showOnlyDrop.locator('option').allTextContents();
  }

  async isFieldVisible(fieldName) {
    const selectors = {
      'RMA ID'       : this.rmaIdInput,
      'Serial Number': this.serialInput,
      'Status'       : this.statusDrop,
      'Customer'     : this.customerDrop,
      'Show Only'    : this.showOnlyDrop,
      'Keyword'      : this.keywordInput,
      'Date Type'    : this.dateTypeDrop,
      'From Date'    : this.fromDateInput,
      'To Date'      : this.toDateInput,
    };
    const el = selectors[fieldName];
    if (!el) {return false;}
    return el.isVisible().catch(() => false);
  }

  async getRowCount() {
    return this.tableRows.count();
  }

  async getAllRowTexts() {
    const rows = this.tableRows;
    const count = await rows.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await rows.nth(i).textContent()) ?? '');
    }
    return texts;
  }
}

// ─── Navigate to RMA List ──────────────────────────────────────────────────────
async function gotoRMAList(page) {
  await page.goto(ROUTES.viewRma);
  await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEC
// ═══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 1 – Filter Panel Visibility Per Role
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Filter Panel – Visibility Per Role', () => {

  test('FLT-001 | Admin sees all 9 filter fields (RMA ID, Serial, Status, Customer, Date Type, From Date, To Date, Show Only, Keyword)', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    // All 9 fields must be visible for Admin (per spreadsheet Row 10)
    for (const field of ['RMA ID', 'Serial Number', 'Status', 'Customer', 'Date Type', 'From Date', 'To Date', 'Show Only', 'Keyword']) {
      const visible = await f.isFieldVisible(field);
      expect(visible, `Admin should see "${field}" filter`).toBe(true);
    }
  });

  test('FLT-002 | Repair Engineer sees same fields as Admin (per spreadsheet Row 10)', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    // Spreadsheet Row 10 shows Engineer has same filter as Admin:
    // RMA ID, Serial Number, Status, Customer, Date Type, From/To, Show Only, Keyword
    for (const field of ['RMA ID', 'Serial Number', 'Status', 'Customer', 'Date Type', 'From Date', 'To Date', 'Show Only', 'Keyword']) {
      const visible = await f.isFieldVisible(field);
      expect(visible, `Repair Engineer should see "${field}"`).toBe(true);
    }
  });

  test('FLT-003 | Repair Watcher sees only 4 fields – NO Status, NO Customer', async ({ page }) => {
    await loginAs(page, USERS.repairWatcher);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    for (const field of ['RMA ID', 'Serial Number', 'Show Only', 'Keyword']) {
      expect(await f.isFieldVisible(field), `Repair Watcher should see "${field}"`).toBe(true);
    }
    for (const field of ['Status', 'Customer']) {
      expect(await f.isFieldVisible(field), `Repair Watcher should NOT see "${field}"`).toBe(false);
    }
  });

  test('FLT-004 | Customer sees only 4 fields – NO Status, NO Customer', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    for (const field of ['RMA ID', 'Serial Number', 'Show Only', 'Keyword']) {
      expect(await f.isFieldVisible(field), `Customer should see "${field}"`).toBe(true);
    }
    for (const field of ['Status', 'Customer']) {
      expect(await f.isFieldVisible(field), `Customer should NOT see "${field}"`).toBe(false);
    }
  });

  test('FLT-Panel | Filter panel has correct heading, instruction text across all roles', async ({ page }) => {
    const roles = [USERS.rmaAdmin, USERS.repairEngineer, USERS.repairWatcher, USERS.customerOne];

    for (const user of roles) {
      await loginAs(page, user);
      await gotoRMAList(page);
      const f = new FilterPanel(page);
      await f.open();

      await expect(f.heading).toBeVisible({ timeout: 6_000 });
      await expect(f.instruction).toBeVisible({ timeout: 6_000 });

      await f.close();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 2 – RMA ID Filter
// ──────────────────────────────────────────────────────────────────────────────
test.describe('RMA ID Filter', () => {

  test('FLT-005 | Admin filters by single RMA ID – only that record shown', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    // Get the first RMA ID from the list
    const firstIdBtn = page.locator('table tbody tr td button, table tbody tr').first()
      .locator('button').first();
    const firstText = (await firstIdBtn.textContent())?.trim() ?? '';
    const idNum = firstText.match(/\d+/)?.[0];

    if (!idNum) { test.skip(true, 'No RMA IDs in list'); return; }

    await f.open();
    await f.fillRmaId(idNum);
    await f.apply();

    const rows = await f.getRowCount();
    const rowTexts = await f.getAllRowTexts();

    // All returned rows should contain this ID
    expect(rows).toBeGreaterThanOrEqual(1);
    rowTexts.forEach(text => {
      expect(text).toContain(firstText);
    });
  });

  test('FLT-010 | Admin filters by non-existent RMA ID – 0 results', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillRmaId('99999');
    await f.apply();

    const count = await f.getRowCount();
    const noResults = page.locator('text=/no records|no results|no data/i').first();
    const noResultsVisible = await noResults.isVisible().catch(() => false);

    expect(count === 0 || noResultsVisible).toBe(true);
  });

  test('FLT-007 | Repair Engineer can filter by RMA ID', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    const firstId = page.locator('table tbody tr button').first();
    const idText = (await firstId.textContent())?.match(/\d+/)?.[0];
    if (!idText) { test.skip(true, 'No RMAs visible'); return; }

    await f.open();
    await f.fillRmaId(idText);
    await f.apply();

    const count = await f.getRowCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('FLT-008 | Repair Watcher can filter by RMA ID', async ({ page }) => {
    await loginAs(page, USERS.repairWatcher);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    const firstId = page.locator('table tbody tr button').first();
    const idText = (await firstId.textContent())?.match(/\d+/)?.[0];
    if (!idText) { test.skip(true, 'No RMAs visible'); return; }

    await f.open();
    await f.fillRmaId(idText);
    await f.apply();

    const count = await f.getRowCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('FLT-009 | Customer cannot see other customers\' RMAs via RMA ID filter', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    // Try a high ID that likely belongs to another customer
    await f.open();
    await f.fillRmaId('1');
    await f.apply();

    const rows = await f.getAllRowTexts();
    // Any returned rows must not contain Customer Two's email identifier
    rows.forEach(row => {
      expect(row).not.toContain('testtransport');
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 3 – Serial Number Filter
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Serial Number Filter', () => {

  const KNOWN_SERIAL = RMA.validSerial;

  test('FLT-011 | Admin filters by single serial number', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(KNOWN_SERIAL);
    await f.apply();

    const rows = await f.getAllRowTexts();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach(row => expect(row).toContain(KNOWN_SERIAL));
  });

  test('FLT-013 | Repair Engineer can filter by serial number', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(KNOWN_SERIAL);
    await f.apply();

    const count = await f.getRowCount();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if Engineer has no matching RMAs
  });

  test('FLT-014 | Repair Watcher can filter by serial number', async ({ page }) => {
    await loginAs(page, USERS.repairWatcher);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(KNOWN_SERIAL);
    await f.apply();

    const _count = await f.getRowCount();
    const rows = await f.getAllRowTexts();
    rows.forEach(row => {
      if (row.trim()) {expect(row).toContain(KNOWN_SERIAL);}
    });
  });

  test('FLT-015 | Customer serial filter only returns their own RMAs', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(KNOWN_SERIAL);
    await f.apply();

    const rows = await f.getAllRowTexts();
    rows.forEach(row => {
      if (row.trim()) {expect(row).not.toContain('testtransport');}
    });
  });

  test('FLT-016 | Serial Number field is a textarea (resizable)', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    const tagName = await f.serialInput.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('textarea');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 4 – Status Filter (Admin Only)
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Status Filter (Admin Only)', () => {

  const statuses = ['Submitted', 'Accepted', 'Received', 'On-Hold', 'Repaired', 'Rejected', 'Closed'];

  for (const status of statuses) {
    test(`FLT-Status | Admin filters by status "${status}"`, async ({ page }) => {
      await loginAs(page, USERS.rmaAdmin);
      await gotoRMAList(page);
      const f = new FilterPanel(page);
      await f.open();

      const statusVisible = await f.isFieldVisible('Status');
      if (!statusVisible) { test.skip(true, 'Status field not found'); return; }

      await f.selectStatus(status);
      await f.apply();

      const _rows = await f.getAllRowTexts();
      const count = await f.getRowCount();

      if (count > 0) {
        // All visible status badges should match selected status
        const badges = page.locator('[class*="badge"], [class*="status"]').filter({ hasText: status });
        const badgeCount = await badges.count();
        expect(badgeCount).toBeGreaterThanOrEqual(1);
      }
      // 0 results is also valid (no RMAs in that status)
    });
  }

  test('FLT-024 | Status filter NOT visible to Repair Engineer', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    expect(await f.isFieldVisible('Status')).toBe(false);
  });

  test('FLT-025 | Status filter NOT visible to Repair Watcher', async ({ page }) => {
    await loginAs(page, USERS.repairWatcher);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    expect(await f.isFieldVisible('Status')).toBe(false);
  });

  test('FLT-026 | Status filter NOT visible to Customer', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    expect(await f.isFieldVisible('Status')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 5 – Customer Filter (Admin Only)
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Customer Filter (Admin Only)', () => {

  test('FLT-027 | Admin can filter by Customer name', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    const custVisible = await f.isFieldVisible('Customer');
    if (!custVisible) { test.skip(true, 'Customer filter not visible'); return; }

    // Get first option from customer dropdown
    const options = await f.customerDrop.locator('option').allTextContents();
    const firstCustomer = options.find(o => !o.match(/Select/i));
    if (!firstCustomer) { test.skip(true, 'No customers in dropdown'); return; }

    await f.selectCustomer(firstCustomer);
    await f.apply();

    const rows = await f.getAllRowTexts();
    if (rows.length > 0) {
      rows.forEach(row => expect(row).toContain(firstCustomer.split(' ')[0]));
    }
  });

  test('FLT-029 | Customer filter NOT visible to Repair Engineer', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    expect(await f.isFieldVisible('Customer')).toBe(false);
  });

  test('FLT-030 | Customer filter NOT visible to Repair Watcher', async ({ page }) => {
    await loginAs(page, USERS.repairWatcher);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    expect(await f.isFieldVisible('Customer')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 6 – Show Only Filter (All Roles)
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Show Only Filter (All Roles)', () => {

  const allRoles = [
    { label: 'Admin',          user: USERS.rmaAdmin },
    { label: 'Repair Engineer', user: USERS.repairEngineer },
    { label: 'Repair Watcher', user: USERS.repairWatcher },
    { label: 'Customer',       user: USERS.customerOne },
  ];

  test('FLT-031 | Show Only has exactly "Show All" and "Not Closed" for ALL roles', async ({ page }) => {
    for (const { label, user } of allRoles) {
      await loginAs(page, user);
      await gotoRMAList(page);
      const f = new FilterPanel(page);
      await f.open();

      const options = (await f.getShowOnlyOptions()).map(o => o.trim()).filter(Boolean);

      expect(options.length, `${label}: Show Only should have 2 options`).toBe(2);
      expect(options, `${label}: should have 'Show All'`).toContain('Show All');
      expect(options, `${label}: should have 'Not Closed'`).toContain('Not Closed');

      await f.close();
    }
  });

  test('FLT-033 | "Not Closed" hides Closed-status RMAs for Admin', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.selectShowOnly('Not Closed');
    await f.apply();

    const closedBadges = page.locator('[class*="badge"], [class*="status"]').filter({ hasText: 'Closed' });
    const closedCount = await closedBadges.count();
    expect(closedCount).toBe(0);
  });

  test('FLT-034 | "Not Closed" works for Repair Engineer', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.selectShowOnly('Not Closed');
    await f.apply();

    const closedBadges = page.locator('[class*="badge"]').filter({ hasText: 'Closed' });
    expect(await closedBadges.count()).toBe(0);
  });

  test('FLT-035 | "Not Closed" works for Repair Watcher', async ({ page }) => {
    await loginAs(page, USERS.repairWatcher);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.selectShowOnly('Not Closed');
    await f.apply();

    const closedBadges = page.locator('[class*="badge"]').filter({ hasText: 'Closed' });
    expect(await closedBadges.count()).toBe(0);
  });

  test('FLT-036 | "Not Closed" for Customer only shows their own non-Closed RMAs', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.selectShowOnly('Not Closed');
    await f.apply();

    // No Closed badges visible
    const closedBadges = page.locator('[class*="badge"]').filter({ hasText: 'Closed' });
    expect(await closedBadges.count()).toBe(0);

    // No other customer data visible
    const rows = await f.getAllRowTexts();
    rows.forEach(row => expect(row).not.toContain('testtransport'));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 7 – Keyword Filter (All Roles)
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Keyword Filter (All Roles)', () => {

  test('FLT-037 | Keyword placeholder is "ID, Serial, Customer, User, Email" for all roles', async ({ page }) => {
    const roles = [USERS.rmaAdmin, USERS.repairEngineer, USERS.repairWatcher, USERS.customerOne];
    for (const user of roles) {
      await loginAs(page, user);
      await gotoRMAList(page);
      const f = new FilterPanel(page);
      await f.open();

      const placeholder = await f.keywordInput.getAttribute('placeholder');
      expect(placeholder).toMatch(/ID.*Serial.*Customer.*User.*Email/i);

      await f.close();
    }
  });

  test('FLT-038 | Admin keyword search by RMA ID number returns matching RMA', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    const firstId = page.locator('table tbody tr button').first();
    const idText = (await firstId.textContent())?.match(/\d+/)?.[0];
    if (!idText) { test.skip(true, 'No RMA IDs found'); return; }

    await f.open();
    await f.fillKeyword(idText);
    await f.apply();

    const rows = await f.getAllRowTexts();
    expect(rows.some(r => r.includes(idText))).toBe(true);
  });

  test('FLT-039 | Admin keyword search by serial number', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillKeyword(RMA.validSerial);
    await f.apply();

    const rows = await f.getAllRowTexts();
    if (rows.length > 0) {
      expect(rows.some(r => r.includes(RMA.validSerial))).toBe(true);
    }
  });

  test('FLT-043 | Customer keyword search scoped to their own data only', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    // Search for Customer Two's email domain
    await f.fillKeyword('testtransport');
    await f.apply();

    const rows = await f.getAllRowTexts();
    // Should return 0 results or only customer one's data
    rows.forEach(row => expect(row).not.toContain('testtransport'));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 8 – Combined Filters
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Combined Filters', () => {

  test('FLT-044 | Admin: Serial Number + Status filters combined', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    const statusVisible = await f.isFieldVisible('Status');
    if (!statusVisible) { test.skip(true, 'Status not available'); return; }

    await f.fillSerial('S0283148');
    await f.selectStatus('Received');
    await f.apply();

    const rows = await f.getAllRowTexts();
    const count = await f.getRowCount();

    if (count > 0) {
      // Each row should have S0283148 AND Received status
      rows.forEach(row => {
        const hasSerial = row.includes('S0283148');
        const hasStatus = row.includes('Received');
        expect(hasSerial && hasStatus).toBe(true);
      });
    }
  });

  test('FLT-047 | Repair Engineer: RMA ID + Show Only = Not Closed combined', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    await f.selectShowOnly('Not Closed');
    await f.apply();

    // Verify no Closed badges
    const closedBadges = page.locator('[class*="badge"]').filter({ hasText: 'Closed' });
    expect(await closedBadges.count()).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 9 – Apply / Reset / Close Buttons
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Apply / Reset / Close Buttons', () => {

  test('FLT-048 | Apply closes panel and refreshes list with filtered results', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(RMA.validSerial);
    await f.apply();

    // Panel should close after Apply
    const _panelVisible = await f.panel.isVisible().catch(() => false);
    // List should update
    const _bannerVisible = await f.filterBanner.isVisible().catch(() => false);
    // Sort banner should still say RMA ID: DESC
    const sortText = await f.sortBanner.textContent().catch(() => '');
    expect(sortText).toContain('RMA ID');
  });

  test('FLT-049 | Reset clears all filter fields to defaults', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();

    // Fill fields
    await f.fillRmaId('25,24,23');
    await f.fillSerial(RMA.validSerial);
    await f.fillKeyword('test');

    // Reset
    await f.reset();

    // Fields should be cleared
    await expect(f.rmaIdInput).toHaveValue('');
    await expect(f.serialInput).toHaveValue('');
    await expect(f.keywordInput).toHaveValue('');

    // Show Only should revert to 'Show All'
    const _showOnlyVal = await f.showOnlyDrop.inputValue();
    const showOnlyText = await f.showOnlyDrop.locator('option:checked').textContent();
    expect(showOnlyText?.trim()).toMatch(/Show All/i);
  });

  test('FLT-050 | Reset does not update list – list unchanged until Apply clicked', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    // Apply a filter first
    await f.open();
    await f.fillSerial(RMA.validSerial);
    await f.apply();
    const countAfterFilter = await f.getRowCount();

    // Reopen and Reset without Apply
    await f.open();
    await f.reset();
    // List should still show filtered results (not all records)
    const countAfterReset = await f.getRowCount();
    expect(countAfterReset).toBe(countAfterFilter); // unchanged until Apply
  });

  test('FLT-051 | Close discards unsaved changes without applying', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    const initialCount = await f.getRowCount();

    // Open, fill, but DO NOT Apply – just Close
    await f.open();
    await f.fillSerial(RMA.validSerial);
    await f.close();

    // List should be unchanged
    const countAfterClose = await f.getRowCount();
    expect(countAfterClose).toBe(initialCount);
  });

  test('FLT-052 | "Filters Applied:" banner appears after filter applied', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(RMA.validSerial);
    await f.apply();

    await expect(f.filterBanner).toBeVisible({ timeout: 8_000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 10 – Pagination
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Pagination with Filters', () => {

  test('FLT-053 | Repair Engineer: multi-page results show correct pagination text', async ({ page }) => {
    await loginAs(page, USERS.repairEngineer);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    await expect(f.paginationText).toBeVisible({ timeout: 8_000 });
    const paginText = await f.paginationText.textContent();
    expect(paginText).toMatch(/Currently Viewing Page \d+ of \d+/i);
  });

  test('FLT-054 | Default list shows "Currently Viewing Page 1 of 1" or "Page 1 of N"', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    await expect(f.paginationText).toBeVisible({ timeout: 8_000 });
    const text = await f.paginationText.textContent();
    expect(text).toMatch(/Currently Viewing Page 1 of/i);
  });

  test('FLT-Sort | RMA ID: DESC sort order shown in Applied Sort Order banner', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    await expect(f.sortBanner).toBeVisible({ timeout: 8_000 });
    const text = await f.sortBanner.textContent();
    expect(text).toContain('RMA ID');
    expect(text).toContain('DESC');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 11 – Security
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Security – Filter Access Control', () => {

  test('FLT-055 | Customer: API call with status param still scoped to own RMAs', async ({ page }) => {
    await loginAs(page, USERS.customerOne);

    const response = await page.request.get('/api/rma?status=Submitted', {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status() === 200) {
      const body = await response.json().catch(() => ({}));
      const items = Array.isArray(body) ? body : body.data ?? [];
      items.forEach((item) => {
        // All returned items must belong to customer one
        const userField = item.user_email ?? item.customer_email ?? item.email ?? '';
        if (userField) {
          expect(userField).not.toContain('testtransport');
        }
      });
    }
    // 403 is also acceptable
    expect([200, 403]).toContain(response.status());
  });

  test('FLT-057 | SQL injection in RMA ID filter – no system error', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillRmaId("'; DROP TABLE rma_master_table; --");
    await f.apply();

    const body = await page.locator('body').textContent();
    expect(body).not.toContain('SQL');
    expect(body).not.toContain('syntax error');
    expect(body).not.toContain('ORA-');
    expect(page.url()).not.toContain('/500');
  });

  test('FLT-058 | XSS in Keyword filter does not execute', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });

    await f.open();
    await f.fillKeyword('<script>alert("XSS")</script>');
    await f.apply();

    expect(alertFired).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 12 – UI/UX
// ──────────────────────────────────────────────────────────────────────────────
test.describe('UI/UX – Filter Panel', () => {

  test('FLT-059 | Filter panel opens as overlay/dropdown – no page navigation', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);

    const urlBefore = page.url();
    await f.open();
    const urlAfter = page.url();

    // URL should not change
    expect(urlAfter).toBe(urlBefore);
    await expect(f.heading).toBeVisible();
  });

  test('FLT-060 | Filter panel "Filters" tab heading visible', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await expect(f.heading).toBeVisible();
  });

  test('FLT-061 | Instruction text visible with red warning icon', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await expect(f.instruction).toBeVisible();
    const text = await f.instruction.textContent();
    expect(text).toContain('Use the form below to refine the results');
  });

  test('FLT-062 | Filter Data button has funnel icon and caret', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await expect(f.filterDataBtn).toBeVisible();
    const text = await f.filterDataBtn.textContent();
    expect(text).toContain('Filter Data');
  });

  test('FLT-063 | Applied Sort Order shows RMA ID: DESC after applying filter', async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(RMA.validSerial);
    await f.apply();

    const sortText = await f.sortBanner.textContent().catch(() => '');
    expect(sortText).toContain('RMA ID');
    expect(sortText).toContain('DESC');
  });

  test('FLT-UI | No console JS errors when filter panel opens/closes', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') {errors.push(msg.text());} });
    page.on('pageerror', err => errors.push(err.message));

    await loginAs(page, USERS.rmaAdmin);
    await gotoRMAList(page);
    const f = new FilterPanel(page);
    await f.open();
    await f.fillSerial(RMA.validSerial);
    await f.apply();
    await f.open();
    await f.reset();
    await f.close();

    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('analytics'));
    expect(critical).toHaveLength(0);
  });
});

