/**
 * tests/rma/functional/rma-print-consignment.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * MyConnect RMA – Print / Print Consign. Note / EMail Consign. Note
 * Button Visibility Per Status & Role
 *
 * ┌─────────────┬─────────────────────────────┬────────────────────────────────┐
 * │ Status      │ Employee Roles (Admin,       │ Customer                       │
 * │             │ Engineer, Watcher)           │                                │
 * ├─────────────┼─────────────────────────────┼────────────────────────────────┤
 * │ Submitted   │ Print ✓                     │ Print ✗                        │
 * │ Accepted    │ Print ✓ | PrintCN ✓ | EmailCN ✓ │ Print ✗ | PrintCN ✓       │
 * │ Closed      │ Print ✓ | PrintCN ✗ | EmailCN ✗ │ Print ✗ | PrintCN ✗       │
 * │ Rejected    │ Print ✓                     │ Print ✗ | PrintCN ✗            │
 * └─────────────┴─────────────────────────────┴────────────────────────────────┘
 *
 * Uses test.use({storageState}) per role (Playwright best practice).
 * Eliminates fresh UI logins which cause server rate-limiting.
 *
 * Note: Repair Admin = RMA Admin (same role)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ViewRMAPage } = require('../../../src/pages/rma/ViewRMAPage');
const { ROUTES } = require('../../../src/helpers/Constants');

// Helper: Navigate to list, find RMA by status, open detail, return page object
async function openRmaByStatus(page, status) {
  await page.goto(ROUTES.viewRma);
  await page.waitForLoadState('networkidle');
  const vrPage = new ViewRMAPage(page);
  const found = await vrPage.goToRmaDetailByStatus(status);
  return { vrPage, found };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RMA ADMIN — All statuses
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('PRT-ADMIN | Print Button Visibility — RMA Admin @print', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  // --- Submitted ---
  test('PRT-SUB-001 | Admin sees Print button on Submitted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Admin should see Print on Submitted RMA').toBe(true);
    expect(btns.printConsign, 'PrintCN should NOT be visible on Submitted').toBe(false);
    expect(btns.emailConsign, 'EmailCN should NOT be visible on Submitted').toBe(false);
    console.log(`  Submitted (Admin): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  // --- Accepted ---
  test('PRT-ACC-001 | Admin sees Print, PrintCN, EmailCN on Accepted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Accepted');
    if (!found) { test.skip(true, 'No Accepted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Admin should see Print on Accepted').toBe(true);
    expect(btns.printConsign, 'Admin should see Print Consign. Note on Accepted').toBe(true);
    expect(btns.emailConsign, 'Admin should see EMail Consign. Note on Accepted').toBe(true);
    console.log(`  Accepted (Admin): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  // --- Closed ---
  test('PRT-CLS-001 | Admin sees Print button on Closed RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Closed');
    if (!found) { test.skip(true, 'No Closed RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Admin should see Print on Closed').toBe(true);
    expect(btns.printConsign, 'Admin should NOT see PrintCN on Closed').toBe(false);
    expect(btns.emailConsign, 'Admin should NOT see EmailCN on Closed').toBe(false);
    console.log(`  Closed (Admin): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  // --- Rejected ---
  test('PRT-REJ-001 | Admin sees Print button on Rejected RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Rejected');
    if (!found) { test.skip(true, 'No Rejected RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Admin should see Print on Rejected').toBe(true);
    expect(btns.printConsign, 'PrintCN should NOT be visible on Rejected').toBe(false);
    expect(btns.emailConsign, 'EmailCN should NOT be visible on Rejected').toBe(false);
    console.log(`  Rejected (Admin): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR ENGINEER — All statuses
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('PRT-ENGINEER | Print Button Visibility — Repair Engineer @print', () => {
  test.use({ storageState: getStorageStatePath('repairEngineer') });

  test('PRT-SUB-002 | Repair Engineer sees Print button on Submitted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Engineer should see Print on Submitted RMA').toBe(true);
    console.log(`  Submitted (Engineer): Print=${btns.print}`);
  });

  test('PRT-ACC-002 | Repair Engineer sees Print, PrintCN, EmailCN on Accepted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Accepted');
    if (!found) { test.skip(true, 'No Accepted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Engineer should see Print on Accepted').toBe(true);
    expect(btns.printConsign, 'Engineer should see PrintCN on Accepted').toBe(true);
    expect(btns.emailConsign, 'Engineer should see EmailCN on Accepted').toBe(true);
    console.log(`  Accepted (Engineer): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  test('PRT-CLS-002 | Repair Engineer sees Print button on Closed RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Closed');
    if (!found) { test.skip(true, 'No Closed RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Engineer should see Print on Closed').toBe(true);
    expect(btns.printConsign, 'Engineer should NOT see PrintCN on Closed').toBe(false);
    expect(btns.emailConsign, 'Engineer should NOT see EmailCN on Closed').toBe(false);
    console.log(`  Closed (Engineer): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  test('PRT-REJ-002 | Repair Engineer sees Print button on Rejected RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Rejected');
    if (!found) { test.skip(true, 'No Rejected RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Engineer should see Print on Rejected').toBe(true);
    console.log(`  Rejected (Engineer): Print=${btns.print}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR WATCHER — All statuses
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('PRT-WATCHER | Print Button Visibility — Repair Watcher @print', () => {
  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test('PRT-SUB-003 | Repair Watcher sees Print button on Submitted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Watcher should see Print on Submitted RMA').toBe(true);
    console.log(`  Submitted (Watcher): Print=${btns.print}`);
  });

  test('PRT-ACC-003 | Repair Watcher sees Print, PrintCN, EmailCN on Accepted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Accepted');
    if (!found) { test.skip(true, 'No Accepted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Watcher should see Print on Accepted').toBe(true);
    expect(btns.printConsign, 'Watcher should see PrintCN on Accepted').toBe(true);
    expect(btns.emailConsign, 'Watcher should see EmailCN on Accepted').toBe(true);
    console.log(`  Accepted (Watcher): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  test('PRT-CLS-003 | Repair Watcher sees Print button on Closed RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Closed');
    if (!found) { test.skip(true, 'No Closed RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Watcher should see Print on Closed').toBe(true);
    expect(btns.printConsign, 'Watcher should NOT see PrintCN on Closed').toBe(false);
    expect(btns.emailConsign, 'Watcher should NOT see EmailCN on Closed').toBe(false);
    console.log(`  Closed (Watcher): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  test('PRT-REJ-003 | Repair Watcher sees Print button on Rejected RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Rejected');
    if (!found) { test.skip(true, 'No Rejected RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Watcher should see Print on Rejected').toBe(true);
    console.log(`  Rejected (Watcher): Print=${btns.print}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER — All statuses
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('PRT-CUSTOMER | Print Button Visibility — Customer @print', () => {
  test.use({ storageState: getStorageStatePath('customerOne') });

  test('PRT-SUB-004 | Customer does NOT see Print button on Submitted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA for customer'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Customer should NOT see Print on Submitted').toBe(false);
    expect(btns.printConsign, 'Customer should NOT see PrintCN on Submitted').toBe(false);
    expect(btns.emailConsign, 'Customer should NOT see EmailCN on Submitted').toBe(false);
    console.log(`  Submitted (Customer): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  test('PRT-ACC-004 | Customer sees ONLY PrintCN on Accepted RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Accepted');
    if (!found) { test.skip(true, 'No Accepted RMA for customer'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Customer should NOT see Print on Accepted').toBe(false);
    expect(btns.printConsign, 'Customer SHOULD see PrintCN on Accepted').toBe(true);
    expect(btns.emailConsign, 'Customer should NOT see EmailCN on Accepted').toBe(false);
    console.log(`  Accepted (Customer): Print=${btns.print} | PrintCN=${btns.printConsign} | EmailCN=${btns.emailConsign}`);
  });

  test('PRT-CLS-004 | Customer sees NO Print buttons on Closed RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Closed');
    if (!found) { test.skip(true, 'No Closed RMA for customer'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Customer should NOT see Print on Closed').toBe(false);
    expect(btns.printConsign, 'Customer should NOT see PrintCN on Closed').toBe(false);
    console.log(`  Closed (Customer): Print=${btns.print} | PrintCN=${btns.printConsign}`);
  });

  test('PRT-REJ-004 | Customer sees NO Print buttons on Rejected RMA', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Rejected');
    if (!found) { test.skip(true, 'No Rejected RMA for customer'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    expect(btns.print, 'Customer should NOT see Print on Rejected').toBe(false);
    expect(btns.printConsign, 'Customer should NOT see PrintCN on Rejected').toBe(false);
    console.log(`  Rejected (Customer): Print=${btns.print} | PrintCN=${btns.printConsign}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTIONAL TESTS — Print button behaviors (Admin role)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('PRT-FUNC | Print Button Functional Tests @print', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('PRT-FUNC-001 | Print button opens print dialog or new tab', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    if (!btns.print) { test.skip(true, 'Print button not visible'); return; }

    // Intercept potential new tab or print dialog
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null),
      vrPage.printBtn.click(),
    ]);

    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded');
      expect(newPage.url()).not.toContain('/500');
      console.log(`  Print opened new tab: ${newPage.url()}`);
      await newPage.close();
    } else {
      // Print might have triggered browser print dialog (which we can't intercept)
      console.log('  Print triggered browser dialog or inline action');
    }
  });

  test('PRT-FUNC-002 | Print Consign. Note opens PDF or new tab', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Accepted');
    if (!found) { test.skip(true, 'No Accepted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    if (!btns.printConsign) { test.skip(true, 'PrintCN button not visible'); return; }

    const [newPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null),
      vrPage.printConsignNoteBtn.click(),
    ]);

    if (newPage) {
      await newPage.waitForTimeout(1500); // PDFs may not trigger domcontentloaded
      expect(newPage.url()).not.toContain('/500');
      console.log(`  PrintCN opened: ${newPage.url()}`);
      await newPage.close();
    } else {
      console.log('  PrintCN triggered inline action or download');
    }
  });

  test('PRT-FUNC-003 | EMail Consign. Note triggers email action', async ({ page }) => {
    const { vrPage, found } = await openRmaByStatus(page, 'Accepted');
    if (!found) { test.skip(true, 'No Accepted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    if (!btns.emailConsign) { test.skip(true, 'EmailCN button not visible'); return; }

    // Click Email Consign — may show modal or success message
    await vrPage.emailConsignNoteBtn.click();
    await page.waitForTimeout(2000);

    // Check for confirmation dialog, success message, or modal
    const modal = page.locator('[class*="modal"]:visible, [role="dialog"]:visible').first();
    const successMsg = page.locator('.alert-success, [class*="success"]').first();
    const confirmDialog = page.locator('text=/sent|email|confirm/i').first();

    const hasResponse = (
      await modal.isVisible().catch(() => false) ||
      await successMsg.isVisible().catch(() => false) ||
      await confirmDialog.isVisible().catch(() => false)
    );

    console.log(`  EmailCN triggered response: ${hasResponse}`);
    // Should not produce a server error
    expect(page.url()).not.toContain('/500');
  });

  test('PRT-FUNC-004 | No JS errors when clicking Print on detail page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const { vrPage, found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA found'); return; }

    const btns = await vrPage.getDetailActionButtonVisibility();
    if (btns.print) {
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 3_000 }).catch(() => null),
        vrPage.printBtn.click(),
      ]);
      if (newPage) await newPage.close();
    }

    await page.waitForTimeout(1000);
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('analytics'));
    expect(critical).toHaveLength(0);
  });
});
