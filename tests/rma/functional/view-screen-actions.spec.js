// @ts-check
/**
 * tests/rma/functional/view-screen-actions.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * View Screen — Action Button Visibility Per Status × Per Role
 *
 * Source: "RMA ACC Test 11-May-2026-2346 IST" spreadsheet, Rows 14–21
 *
 * ┌──────────────────┬───────────────────────────────────────────────────┬────────────────────────┬──────────────────────────────┐
 * │ Status           │ Repair Admin / Engineer                         │ Repair Watcher         │ Customer                     │
 * ├──────────────────┼───────────────────────────────────────────────────┼────────────────────────┼──────────────────────────────┤
 * │ Submitted        │ Edit, Comment, Accept, Reject, Print, Back      │ Print, Back            │ Edit, Comment, Back          │
 * │ Accepted         │ Edit, Comment, Receive, Close, PrintCN,         │ PrintCN, Print, Back   │ Comment, PrintCN, Back       │
 * │                  │ EmailCN, Print, Back                            │                        │                              │
 * │ Received         │ Edit, Comment, Repair, OnHold, Reject,          │ PrintCN, Print, Back   │ Comment, PrintCN, Back       │
 * │                  │ PrintCN, EmailCN, Print, Back                   │                        │                              │
 * │ On Hold          │ Edit, Comment, Repair, Reject, PrintCN,         │ PrintCN, Print, Back   │ Comment, PrintCN, Back       │
 * │                  │ EmailCN, Print, Back                            │                        │                              │
 * │ Repaired         │ Edit, Comment, Close, PrintCN, EmailCN,         │ PrintCN, Print, Back   │ Comment, PrintCN, Back       │
 * │                  │ Print, Back                                     │                        │                              │
 * │ Rejected         │ Close, Print, Back                              │ Print, Back            │ Back                         │
 * │ Closed           │ Print, Back                                     │ Print, Back            │ Back                         │
 * └──────────────────┴───────────────────────────────────────────────────┴────────────────────────┴──────────────────────────────┘
 *
 * Uses test.use({storageState}) per role (Playwright best practice).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ViewRMAPage } = require('../../../src/pages/rma/ViewRMAPage');
const { ROUTES } = require('../../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../../src/helpers/Logger');
const TestData = require('../../../src/helpers/TestData');

// ─── Helper: Navigate to RMA detail by status ─────────────────────────────────
async function openRmaByStatus(page, status) {
  // Always reset filters to avoid leftover filters from previous tests
  await page.goto(ROUTES.viewRma + '?reset=1');
  await page.waitForLoadState('domcontentloaded');
  // Wait for AJAX DataTable to populate
  await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const vrPage = new ViewRMAPage(page);
  const found = await vrPage.goToRmaDetailByStatus(status);
  return { vrPage, found };
}

// ─── Expected button visibility matrices (from spreadsheet) ───────────────────
//   true  = button MUST be visible
//   false = button MUST NOT be visible

const EXPECTED = {
  Submitted: {
    // Per spreadsheet Row 14: Edit, Comment, Accept, Reject, Print, Back
    adminEngineer: { edit: true,  comment: true,  accept: true,  reject: true,  receive: false, repair: false, onHold: false, close: false, printConsign: false, emailConsign: false, print: true,  back: true },
    watcher:       { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: false, emailConsign: false, print: true,  back: true },
    customer:      { edit: true,  comment: true,  accept: false, reject: false, receive: false, repair: false, onHold: false, close: true, printConsign: false, emailConsign: false, print: false, back: true },
  },
  Accepted: {
    adminEngineer: { edit: true, comment: true, accept: false, reject: false, receive: true, repair: false, onHold: false, close: true, printConsign: true, emailConsign: true, print: true, back: true },
    watcher:       { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: true, back: true },
    customer:      { edit: false, comment: true,  accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: false, back: true },
  },
  Received: {
    adminEngineer: { edit: true, comment: true, accept: false, reject: true, receive: false, repair: true, onHold: true, close: false, printConsign: true, emailConsign: true, print: true, back: true },
    watcher:       { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: true, back: true },
    customer:      { edit: false, comment: true,  accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: false, back: true },
  },
  Rejected: {
    adminEngineer: { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: true, printConsign: false, emailConsign: false, print: true, back: true },
    watcher:       { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: false, emailConsign: false, print: true, back: true },
    customer:      { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: false, emailConsign: false, print: false, back: true },
  },
  Closed: {
    adminEngineer: { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: false, emailConsign: false, print: true, back: true },
    watcher:       { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: false, emailConsign: false, print: true, back: true },
    customer:      { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: false, emailConsign: false, print: false, back: true },
  },
  Repaired: {
    adminEngineer: { edit: true, comment: true, accept: false, reject: false, receive: false, repair: false, onHold: false, close: true, printConsign: true, emailConsign: true, print: true, back: true },
    watcher:       { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: true, back: true },
    customer:      { edit: false, comment: true,  accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: false, back: true },
  },
  'On Hold': {
    adminEngineer: { edit: true, comment: true, accept: false, reject: true, receive: false, repair: true, onHold: false, close: false, printConsign: true, emailConsign: true, print: true, back: true },
    watcher:       { edit: false, comment: false, accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: true, back: true },
    customer:      { edit: false, comment: true,  accept: false, reject: false, receive: false, repair: false, onHold: false, close: false, printConsign: true, emailConsign: false, print: false, back: true },
  },
};

// Button labels for human-readable output
const BTN_LABELS = {
  edit: 'Edit', comment: 'Comment', accept: 'Accept', reject: 'Reject',
  receive: 'Receive', repair: 'Repair', onHold: 'On Hold', close: 'Close',
  printConsign: 'Print Consign. Note', emailConsign: 'Email Consign. Note',
  print: 'Print', back: 'Back',
};

// ─── Generic test generator ───────────────────────────────────────────────────
function generateViewScreenTests(roleName, storageKey, matrixKey) {

  test.describe(`View Screen — ${roleName} @view-screen`, () => {
    // ── Allure labels ──
    test.beforeEach(async () => {
      await allure.feature('View Screen Actions');
      await allure.story('Action Buttons & Popups');
    });

    test.use({ storageState: getStorageStatePath(storageKey) });

    for (const [status, roleMap] of Object.entries(EXPECTED)) {
      const expected = roleMap[matrixKey];

      test(`VS-${status.replace(/\s/g, '')}-${roleName.replace(/\s/g, '')} | ${roleName}: View Screen in "${status}" status @view`, async ({ page }) => {
        Logger.step(`VS-${status.replace(/\s/g, '')}-${roleName.replace(/\s/g, '')} | ${roleName}: View Screen in "${status}" status`);
        const { vrPage, found } = await openRmaByStatus(page, status === 'On Hold' ? 'On-Hold' : status);
        if (!found) { test.skip(true, 'No RMA in target status'); return; }

        const actual = await vrPage.getDetailAllActionButtons();

        // Log the full button map for debugging (resolve visibility for summary)
        const visibilityMap = {};
        for (const [k, locator] of Object.entries(actual)) {
          visibilityMap[k] = await locator.isVisible().catch(() => false);
        }
        const summary = Object.entries(visibilityMap)
          .filter(([, v]) => v)
          .map(([k]) => BTN_LABELS[k] || k)
          .join(', ');
        Logger.info(`  ${roleName} on ${status}: [${summary}]`);

        // Assert each button using auto-retrying toBeVisible / not.toBeVisible
        for (const [btnKey, shouldBeVisible] of Object.entries(expected)) {
          if (shouldBeVisible) {
            await expect(
              actual[btnKey],
              `${roleName} on "${status}": "${BTN_LABELS[btnKey]}" should be VISIBLE`
            ).toBeVisible();
          } else {
            await expect(
              actual[btnKey],
              `${roleName} on "${status}": "${BTN_LABELS[btnKey]}" should be HIDDEN`
            ).not.toBeVisible();
          }
        }
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
generateViewScreenTests('Repair Admin', 'rmaAdmin', 'adminEngineer');

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR ENGINEER
// ═══════════════════════════════════════════════════════════════════════════════
generateViewScreenTests('Repair Engineer', 'repairEngineer', 'adminEngineer');

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR WATCHER
// ═══════════════════════════════════════════════════════════════════════════════
generateViewScreenTests('Repair Watcher', 'repairWatcher', 'watcher');

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER
// ═══════════════════════════════════════════════════════════════════════════════
generateViewScreenTests('Customer', 'customerOne', 'customer');

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL CONSIGNMENT NOTE — Functional Action Test (Row 21)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('View Screen — Email Consign. Note Action @view-screen', () => {

  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('VS-EMAIL-CN | Email Consign. Note shows success message @view', async ({ page }) => {
    Logger.step('VS-EMAIL-CN | Email Consign. Note shows success message');

    // Find an RMA in a status that has Email CN (Accepted, Received, Repaired, On Hold)
    const statusesWithEmailCN = ['Accepted', 'Received', 'Repaired', 'On-Hold'];
    let vrPage;
    let found = false;

    for (const status of statusesWithEmailCN) {
      const result = await openRmaByStatus(page, status);
      vrPage = result.vrPage;
      if (result.found) {
        const btns = await vrPage.getDetailAllActionButtons();
        if (await btns.emailConsign.isVisible().catch(() => false)) { found = true; break; }
      }
    }

    if (!found) { test.skip(true, 'No RMA in target status'); return; }

    // Click Email Consign. Note
    await vrPage.emailConsignNoteBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify success message from spreadsheet Row 21
    const successMsg = await vrPage.getEmailConsignmentSuccessMessage();
    const expectedMsg = 'The Consignment Note has been sent as Email to the RMA user';
    const hasSuccessMsg = successMsg.includes(expectedMsg);

    // Also check for toast/notification messages
    const toastMsg = page.locator('.toast, .notification, [class*="alert"]').filter({ hasText: /Consignment Note.*sent/i }).first();
    const hasToast = await toastMsg.isVisible().catch(() => false);

    await expect(
      hasSuccessMsg || hasToast,
      `Expected success message containing "${expectedMsg}". Got: "${successMsg}"`
    ).toBe(true);
    Logger.info(`  Email Consign. Note success: "${successMsg}" ✓`);
  });
});
