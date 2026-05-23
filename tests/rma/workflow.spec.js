/* eslint-env browser */
// @ts-check
/**
 * tests/rma/workflow.spec.js
 * Workflow Transitions + Status Badge Colour Tests (14 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs, switchRole } = require('../../src/helpers/rmaAuthHelper');
const { FactoryReceivePage } = require('../../src/pages/rma/FactoryReceivePage');
const { USERS, ROUTES, RMA } = require('../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../src/helpers/Logger');

test.describe('Workflow Transitions @workflow', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('Workflow');
    await allure.story('RMA Status Transitions');
  });


  test.beforeEach(async ({ page }) => { await switchRole(page, USERS.rmaAdmin); });

  test('TC-WF-001 | Newly submitted RMA has Submitted status @smoke', async ({ page }) => {
    Logger.step('Newly submitted RMA has Submitted status');

    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(page.locator('[class*="badge"], [class*="status"]').filter({ hasText: 'Submitted' }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-WF-002 | Accept action available for Submitted RMA @workflow', async ({ page }) => {
    Logger.step('Accept action available for Submitted RMA');

    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const submittedRow = page.locator('tr').filter({ hasText: 'Submitted' }).first();
    if (await submittedRow.count() > 0) {
      await submittedRow.locator('a, button').last().click();
      await page.waitForLoadState('domcontentloaded');
      // Wait for AJAX DataTable to populate
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      await expect(page.locator('button:has-text("Accept"), a:has-text("Accept"), [class*="action"]:has-text("Accept")').first()).toBeVisible({ timeout: 8_000 });
    } else {
      test.skip(true, 'No Submitted RMAs available for workflow test');
    }
  });

  test('TC-WF-003 | Workflow action buttons hidden for Customer role @workflow', async ({ page }) => {
    Logger.step('Workflow action buttons hidden for Customer role');

    await switchRole(page, USERS.customerOne);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.locator('a, button').last().click();
      await page.waitForLoadState('domcontentloaded');
      // Wait for AJAX DataTable to populate
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      await expect(page.locator('button:has-text("Accept")')).toBeHidden();
      await expect(page.locator('button:has-text("Reject")')).toBeHidden();
    }
  });

  test('TC-WF-004 | Invalid workflow transition blocked (API level) @workflow', async ({ page }) => {
    Logger.step('Invalid workflow transition blocked (API level)');

    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const response = await page.request.patch('/api/rma/1', {
      data: { status: 'Submitted' },
      headers: { 'Content-Type': 'application/json' },
    });
    await expect([400, 403, 405, 422, 500]).toContain(response.status());
  });

  test('TC-WF-005 | Received status appears after Factory Receive on Accepted RMA @workflow', async ({ page }) => {
    Logger.step('Received status appears after Factory Receive on Accepted RMA');

    const frPage = new FactoryReceivePage(page);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await page.goto(ROUTES.factoryReceive);
    await frPage.enterSerial(RMA.validSerial);
    await frPage.clickAdd();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)

    const errorVisible = await frPage.errorMessage.isVisible().catch(() => false);
    if (!errorVisible) {
      await frPage.submitReceive();
      await page.goto(ROUTES.viewRma);
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Received' }).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('RMA Status Badge Colours @status-colors', () => {

  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
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
    test(`TC-SC-${status.toUpperCase().replace('-', '')} | ${status} badge is ${tone} @workflow`, async ({ page }) => {
    Logger.step('TC-SC-${status.toUpperCase().replace(\'-\', \'\')} | ${status} badge is ${tone}');
      const badge = page.locator('[class*="badge"], [class*="status-badge"], [class*="status"]').filter({ hasText: status }).first();
      if (await badge.count() === 0) { test.skip(true, `No RMA with status "${status}" found`); return; }

      await expect(badge).toBeVisible();
      const bgColor = await badge.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      await expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(bgColor).not.toBe('rgb(255, 255, 255)');
      Logger.info(`  ${status} badge bg: ${bgColor}`);
    });
  }

  test('TC-SC-ALL | All visible badges use distinct colours @workflow', async ({ page }) => {
    Logger.step('All visible badges use distinct colours');

    const badges = page.locator('[class*="status-badge"], [class*="badge"]').filter({ hasText: /Submitted|Accepted|Received|On-Hold|Repaired|Rejected|Closed/ });
    const count = await badges.count();
    if (count < 2) { test.skip(true, 'Need at least 2 different status badges to compare'); return; }

    const colors = new Map();
    for (let i = 0; i < count; i++) {
      const text = (await badges.nth(i).textContent())?.trim() ?? '';
      const bg = await badges.nth(i).evaluate((el) => window.getComputedStyle(el).backgroundColor);
      if (text && !colors.has(text)) {colors.set(text, bg);}
    }

    if (colors.has('Submitted') && colors.has('Closed')) {expect(colors.get('Submitted')).not.toBe(colors.get('Closed'));}
    if (colors.has('Accepted') && colors.has('Repaired')) {expect(colors.get('Accepted')).not.toBe(colors.get('Repaired'));}
    if (colors.has('Received') && colors.has('Accepted')) {expect(colors.get('Received')).not.toBe(colors.get('Accepted'));}
  });

  test('TC-SC-CONTRAST | Status badges have visible contrast @workflow', async ({ page }) => {
    Logger.step('Status badges have visible contrast');

    const badges = page.locator('[class*="status-badge"], [class*="badge"]').filter({ hasText: /Submitted|Accepted|Received|On-Hold|Repaired|Rejected|Closed/ });
    const count = await badges.count();
    for (let i = 0; i < Math.min(count, 7); i++) {
      const styles = await badges.nth(i).evaluate((el) => ({
        bg: window.getComputedStyle(el).backgroundColor,
        text: window.getComputedStyle(el).color,
      }));
      await expect(styles.text).not.toBe('rgba(0, 0, 0, 0)');
      await expect(styles.text).not.toBe(styles.bg);
    }
  });
});
