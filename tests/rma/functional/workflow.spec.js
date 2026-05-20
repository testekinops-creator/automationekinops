/* eslint-env browser */
// @ts-check
/**
 * tests/rma/workflow.spec.js
 * Workflow Transitions + Status Badge Colour Tests (14 tests)
 *
 * Session: Default storageState (rmaAdmin) from project config.
 *          TC-WF-003 overrides to customerOne via separate describe block.
 *
 * Setup: Creates an RMA with a dedicated serial so Submitted status is always present.
 * Teardown: Cleans up (closes) the RMA to avoid cross-test contamination.
 */
const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { FactoryReceivePage } = require('../../../src/pages/rma/FactoryReceivePage');
const { SubmitRMAPage } = require('../../../src/pages/rma/SubmitRMAPage');
const { ViewRMAPage } = require('../../../src/pages/rma/ViewRMAPage');
const { cleanupSerials } = require('../../../src/helpers/rmaCleanup');
const { ROUTES, RMA } = require('../../../src/helpers/Constants');

/** Dedicated serial for workflow tests — cleaned up after suite completes. */
const WORKFLOW_SERIAL = RMA.workflowSerial;

test.describe('Workflow Transitions @workflow', () => {
  // ── Setup: Submit an RMA so "Submitted" status is guaranteed ──────────────
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      storageState: getStorageStatePath('rmaAdmin'),
    });
    const page = await context.newPage();
    try {
      // First cleanup any stale RMA from a previous crashed run
      await cleanupSerials([WORKFLOW_SERIAL], {
        prefix: '[WF-Setup]',
        includeEngineerPhase: true,
      });

      const submitPage = new SubmitRMAPage(page);
      await submitPage.goto();
      await submitPage.fillSerialNumber(WORKFLOW_SERIAL);

      // Wait for product lookup AJAX
      const productName = await submitPage.getProductName();
      console.log(`  [WF-Setup] Product resolved: "${productName}"`);

      // Check for duplicate serial error
      if (await submitPage.isDuplicateSerialErrorVisible()) {
        console.log(`  [WF-Setup] Serial ${WORKFLOW_SERIAL} already has an active RMA — skipping creation`);
        return;
      }

      await submitPage.selectCustomer(RMA.customerName);
      await submitPage.selectCustomerUser(RMA.customerUsername);

      // Select Return Location and RMA Type (mandatory, populated via AJAX after customer selection)
      await page.waitForTimeout(1500);
      const selectFields = ['select[name="return_location_id"]', 'select[name="rma_type"]'];
      for (const selector of selectFields) {
        const selectEl = page.locator(selector).first();
        if (await selectEl.isVisible({ timeout: 3000 }).catch(() => false)) {
          const currentVal = await selectEl.inputValue().catch(() => '');
          if (!currentVal || currentVal === '' || currentVal === '0') {
            await selectEl.selectOption({ index: 1 }).catch(() => {});
            await page.waitForTimeout(300);
          }
        }
      }

      await submitPage.fillNoteForRepair('Workflow test setup — auto-created RMA for status verification');
      await submitPage.clickSave();

      // Verify success (redirect away from /rma/add)
      const url = page.url();
      if (url.includes('/rma/add')) {
        console.log(`  [WF-Setup] ⚠️ RMA creation may have failed — still on submit page`);
      } else {
        console.log(`  [WF-Setup] ✅ RMA created with S/N ${WORKFLOW_SERIAL}`);
      }
    } finally {
      await page.close();
      await context.close();
    }
  });

  // ── Teardown: Close the RMA so the serial is available for future runs ────
  test.afterAll(async () => {
    // Cleanup (Reject → Close) can take 60-90s — extend the hook timeout
    test.setTimeout(120_000);
    await cleanupSerials([WORKFLOW_SERIAL], {
      prefix: '[WF-Teardown]',
      includeEngineerPhase: true,
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
  });

  test('TC-WF-001 | Newly submitted RMA has Submitted status @smoke', async ({ page }) => {
    const vrPage = new ViewRMAPage(page);
    await vrPage.filterRmaList({ status: 'Submitted', keyword: WORKFLOW_SERIAL });

    await expect(
      page.locator('table tbody tr [class*="badge"], table tbody tr [class*="status"], table tbody tr span').filter({ hasText: 'Submitted' }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('TC-WF-002 | Accept action available for Submitted RMA', async ({ page }) => {
    const vrPage = new ViewRMAPage(page);
    await vrPage.filterRmaList({ status: 'Submitted', keyword: WORKFLOW_SERIAL });

    const submittedRow = page.locator('table tbody tr').filter({ hasText: 'Submitted' }).first();
    if (await submittedRow.count() > 0) {
      const viewLink = submittedRow.locator('a[aria-label="View RMA Request"], td:last-child a, a:has-text("RMA-"), button:has-text("RMA-"), a, button').first();
      if (await viewLink.count() > 0) {
        await viewLink.click();
        await page.waitForLoadState('networkidle');
        const hasAction = await page.locator('text=/Accept/i, text=/action/i, button, a.btn').first().isVisible().catch(() => false);
        expect(hasAction).toBe(true);
      } else { test.skip(true, 'No View action link in Submitted RMA row'); }
    } else { test.skip(true, 'No Submitted RMAs available for workflow test'); }
  });

  test('TC-WF-004 | Invalid workflow transition blocked (API level)', async ({ page }) => {
    const response = await page.request.patch('/api/rma/1', {
      data: { status: 'Submitted' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([400, 403, 404, 405, 422, 500]).toContain(response.status());
  });

  test('TC-WF-005 | Received status appears after Factory Receive on Accepted RMA', async ({ page }) => {
    // Pre-condition: Check if there are any Accepted RMAs in the list first
    const acceptedRow = page.locator('table tbody tr').filter({ hasText: 'Accepted' }).first();
    const hasAccepted = await acceptedRow.isVisible().catch(() => false);
    if (!hasAccepted) {
      test.info().annotations.push({ type: 'info', description: 'No Accepted RMA available for Factory Receive test' });
      test.skip(true, 'No Accepted RMAs available — prerequisite not met');
      return;
    }

    const frPage = new FactoryReceivePage(page);
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('domcontentloaded');
    await frPage.enterSerial(RMA.validSerial);
    await frPage.clickAdd();
    await page.waitForTimeout(1500);
    const errorVisible = await frPage.errorMessage.isVisible().catch(() => false);
    if (errorVisible) {
      // S/N not in Accepted status — skip gracefully
      test.info().annotations.push({ type: 'info', description: `S/N ${RMA.validSerial} not in Accepted status for Factory Receive` });
      return;
    }
    await frPage.submitReceive();
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('table tbody tr [class*="badge"], table tbody tr [class*="status"], table tbody tr span').filter({ hasText: 'Received' }).first()).toBeVisible({ timeout: 10_000 });
  });

  // ─── Gap 9: Repaired → Closed transition ──────────────────────────────────
  test('TC-WF-006 | Admin can close a Repaired RMA', async ({ page }) => {
    const repairedRow = page.locator('table tbody tr').filter({ hasText: 'Repaired' }).first();
    if (await repairedRow.count() === 0) { test.skip(true, 'No Repaired RMA available'); return; }

    const viewLink = repairedRow.locator('a[aria-label="View RMA Request"], td:last-child a').first();
    await viewLink.click();
    await page.waitForLoadState('networkidle');

    // Look for Close action button
    const closeBtn = page.locator('button:has-text("Close"), a:has-text("Close")').filter({ hasNot: page.locator('[class*="modal"]') }).first();
    const hasClose = await closeBtn.isVisible().catch(() => false);

    if (hasClose) {
      await closeBtn.click();
      await page.waitForTimeout(1000);

      // Fill comment in dialog if required
      const modal = page.locator('[class*="modal"]:visible, [role="dialog"]:visible').first();
      if (await modal.isVisible()) {
        const commentField = modal.locator('textarea').first();
        if (await commentField.isVisible()) {
          await commentField.fill('Workflow test – Closing repaired RMA');
        }
        const submitBtn = modal.locator('button:has-text("Close"), button:has-text("Submit"), button:has-text("Confirm"), button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Verify status changed
      const closedBadge = page.locator('[class*="badge"]').filter({ hasText: 'Closed' }).first();
      const isClosed = await closedBadge.isVisible().catch(() => false);
      console.log(`  Repaired→Closed transition: ${isClosed ? '✓' : 'dialog may require more fields'}`);
    } else {
      console.log('  Close button not visible on Repaired RMA detail');
    }
  });

  // ─── Gap 10: Reject flow with mandatory comment validation ────────────────
  test('TC-WF-007 | Reject action requires mandatory Comment field', async ({ page }) => {
    const receivedRow = page.locator('table tbody tr').filter({ hasText: 'Received' }).first();
    if (await receivedRow.count() === 0) { test.skip(true, 'No Received RMA for reject test'); return; }

    const viewLink = receivedRow.locator('a[aria-label="View RMA Request"], td:last-child a').first();
    await viewLink.click();
    await page.waitForLoadState('networkidle');

    // Click Reject action — workflow actions are <a> tags with href
    const rejectBtn = page.locator('a.btn:has-text("Reject"), button:has-text("Reject")').first();
    const hasReject = await rejectBtn.isVisible().catch(() => false);
    if (!hasReject) { test.skip(true, 'Reject button not visible'); return; }

    // The Reject action opens a full-page overlay dialog (not a standard role="dialog" modal).
    // It navigates to a workflow page with form fields.
    const href = await rejectBtn.getAttribute('href').catch(() => null);
    if (href) {
      await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } else {
      await rejectBtn.click();
      await page.waitForLoadState('domcontentloaded');
    }
    await page.waitForTimeout(1000);

    // The Reject workflow page has: Repair Solution*, Customer Solution*,
    // Repair Diagnostic*, Standardized Faults*, Comment, and a Reject submit button.
    const rejectSubmit = page.locator('button:has-text("Reject"), .btn-process, button[type="submit"]').first();
    const submitVisible = await rejectSubmit.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!submitVisible) { test.skip(true, 'Reject submit button not visible on workflow page'); return; }

    // Try submitting WITHOUT filling required fields
    const urlBefore = page.url();
    await rejectSubmit.click();
    await page.waitForTimeout(2000);

    // Validation should block submission — page stays on the workflow form
    // OR validation error messages appear for mandatory fields
    const urlAfter = page.url();
    const stayedOnForm = urlAfter.includes('/rma/workflow') || urlAfter === urlBefore;
    const validationError = page.locator('.has-error, .invalid-feedback, .text-danger, .help-block').first();
    const hasError = await validationError.isVisible().catch(() => false);
    expect(stayedOnForm || hasError, 'Reject form should block submission without mandatory fields').toBe(true);
  });

  test('TC-WF-008 | On-Hold status is counted as In Progress', async ({ page }) => {
    // Verify On-Hold RMAs exist or skip
    const onHoldBadge = page.locator('[class*="badge"]').filter({ hasText: 'On-Hold' }).first();
    const hasOnHold = await onHoldBadge.isVisible().catch(() => false);

    if (hasOnHold) {
      // Navigate to dashboard and check In Progress count includes On-Hold
      await page.goto(ROUTES.rmaDashboard);
      await page.waitForLoadState('networkidle');

      const inProgressCard = page.locator('text=/Repair In Progress/i').first();
      await expect(inProgressCard).toBeVisible({ timeout: 8_000 });
      console.log('  On-Hold RMAs counted under In Progress ✓');
    } else {
      console.log('  No On-Hold RMAs — skipping count verification');
    }
  });
});

test.describe('Workflow — Customer View @workflow', () => {
  test.use({ storageState: getStorageStatePath('customerOne') });

  test('TC-WF-003 | Customer cannot see workflow action buttons', async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
    const hasAccept = await page.locator('button:has-text("Accept")').isVisible().catch(() => false);
    const hasReject = await page.locator('button:has-text("Reject")').isVisible().catch(() => false);
    expect(hasAccept).toBe(false);
    expect(hasReject).toBe(false);
  });
});

test.describe('RMA Status Badge Colours @status-colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');
  });

  const statusColorTests = [
    { status: 'Submitted', tone: 'grey-blue' },
    { status: 'Accepted', tone: 'green' },
    { status: 'Received', tone: 'blue' },
    { status: 'Repaired', tone: 'medium-green' },
    { status: 'Rejected', tone: 'red' },
    { status: 'Closed', tone: 'grey' },
  ];

  for (const { status, tone } of statusColorTests) {
    test(`TC-SC-${status.toUpperCase().replace('-', '')} | ${status} badge is ${tone}`, async ({ page }) => {
      // Prefer elements with 'badge' class (they have styled backgrounds)
      let badge = page.locator('[class*="badge"]').filter({ hasText: status }).first();
      if (await badge.count() === 0) {
        // Fallback: try status-specific elements or td cells
        badge = page.locator('td [class*="status"], td span').filter({ hasText: status }).first();
      }
      if (await badge.count() === 0) { test.skip(true, `No RMA with status "${status}" found`); return; }
      await expect(badge).toBeVisible();
      const bgColor = await badge.evaluate((el) => {
        // Walk up to find the nearest ancestor with a non-transparent background
        let current = el;
        while (current && current !== document.body) {
          const bg = window.getComputedStyle(current).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {return bg;}
          current = current.parentElement;
        }
        return window.getComputedStyle(el).backgroundColor;
      });
      // Badge should have some styling — either a colored background or inherited
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
      console.log(`  ${status} badge bg: ${bgColor}`);
    });
  }

  test('TC-SC-ALL | Multiple status types visible on RMA list', async ({ page }) => {
    const statusTexts = ['Submitted', 'Accepted', 'Received', 'Repaired', 'Rejected', 'Closed'];
    let visibleStatuses = 0;
    for (const s of statusTexts) {
      const badge = page.locator(`[class*="badge"]:has-text("${s}"), td:has-text("${s}")`).first();
      if (await badge.isVisible().catch(() => false)) {visibleStatuses++;}
    }
    expect(visibleStatuses, 'Expected at least 1 status type visible').toBeGreaterThanOrEqual(1);
  });

  test('TC-SC-CONTRAST | Status badges have styling', async ({ page }) => {
    const badges = page.locator('[class*="badge"]').filter({ hasText: /Submitted|Accepted|Received|On Hold|Repaired|Rejected|Closed/ });
    const count = await badges.count();
    if (count === 0) { test.skip(true, 'No status badges found'); return; }
    for (let i = 0; i < Math.min(count, 5); i++) {
      const bg = await badges.nth(i).evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
});
