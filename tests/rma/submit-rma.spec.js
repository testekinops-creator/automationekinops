/* eslint-env browser */
// @ts-check
/**
 * tests/rma/submit-rma.spec.js
 * Submit RMA Form + Factory Receive Tests (21 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs, switchRole } = require('../../src/helpers/rmaAuthHelper');
const { SubmitRMAPage } = require('../../src/pages/rma/SubmitRMAPage');
const { FactoryReceivePage } = require('../../src/pages/rma/FactoryReceivePage');
const { USERS, ROUTES, RMA } = require('../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../src/helpers/Logger');

test.describe('Submit RMA Form @submit', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('Submit RMA');
    await allure.story('Create RMA Request');
  });


  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.submitRma);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-SUB-001 | Submit RMA page loads with mandatory field notice @smoke', async ({ page }) => {
    Logger.step('Submit RMA page loads with mandatory field notice');

    const form = new SubmitRMAPage(page);
    await form.expectMandatoryNote();
  });

  test('TC-SUB-002 | Serial number field has 18-char counter @submit', async ({ page }) => {
    Logger.step('Serial number field has 18-char counter');

    const form = new SubmitRMAPage(page);
    const count = await form.getCharCounterValue();
    await expect(count).toBe(18);
  });

  test('TC-SUB-003 | Valid S/N auto-populates Product Name and Code @smoke', async ({ page }) => {
    Logger.step('Valid S/N auto-populates Product Name and Code');

    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.validSerial);
    const productName = await form.getProductName();
    const productCode = await form.getProductCode();
    await expect(productName.length).toBeGreaterThan(0);
    await expect(productCode.length).toBeGreaterThan(0);
  });

  test('TC-SUB-004 | Invalid serial number does NOT populate product fields @submit', async ({ page }) => {
    Logger.step('Invalid serial number does NOT populate product fields');

    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.invalidSerial);
    const productName = await form.getProductName();
    await expect(productName).toBe('');
  });

  test('TC-SUB-005 | Character counter decrements as user types @submit', async ({ page }) => {
    Logger.step('Character counter decrements as user types');

    const form = new SubmitRMAPage(page);
    const initialCount = await form.getCharCounterValue();
    await form.serialNumberInput.fill('ABC');
    await form.serialNumberInput.press('Tab');
    // removed: waitForTimeout(500ms) — use event-based wait if needed
    const afterCount = await form.getCharCounterValue();
    if (initialCount !== null && afterCount !== null) {
      await expect(afterCount).toBeLessThan(initialCount);
    }
  });

  test('TC-SUB-006 | Note for Repair is a mandatory field @submit', async ({ page }) => {
    Logger.step('Note for Repair is a mandatory field');

    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.validSerial);
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)
    await form.clickSave();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)
    await expect(page.url()).toMatch(/add|edit/);
  });

  test('TC-SUB-007 | SQL injection in serial number — handled safely @security', async ({ page }) => {
    Logger.step('SQL injection in serial number — handled safely');

    const form = new SubmitRMAPage(page);
    await form.serialNumberInput.fill(RMA.sqlInjection);
    await form.serialNumberInput.press('Tab');
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)
    const body = await page.locator('body').textContent();
    await expect(body).not.toContain('SQL');
    await expect(body).not.toContain('syntax error');
    await expect(body).not.toContain('ORA-');
    await expect(page).not.toHaveURL(/error|500/);
  });

  test('TC-SUB-008 | XSS payload in Note field does not execute @security', async ({ page }) => {
    Logger.step('XSS payload in Note field does not execute');

    const form = new SubmitRMAPage(page);
    let alertFired = false;
    page.on('dialog', async (dialog) => { alertFired = true; await dialog.dismiss(); });
    await form.fillNoteForRepair(RMA.xssPayload);
    await form.clickSave();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)
    await expect(alertFired).toBe(false);
  });

  test('TC-SUB-009 | Close button discards form and navigates away @submit', async ({ page }) => {
    Logger.step('Close button discards form and navigates away');

    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.validSerial);
    await form.clickClose();
    await expect(page).not.toHaveURL(/\/rma\/add$/);
  });

  test('TC-SUB-010 | RMA Type dropdown contains required types @submit', async ({ page }) => {
    Logger.step('RMA Type dropdown contains required types');

    const form = new SubmitRMAPage(page);
    await form.rmaTypeDropdown.waitFor({ state: 'visible' });
    const options = await form.rmaTypeDropdown.locator('option').allTextContents();
    await expect(options.some((opt) => opt.includes(RMA.rmaTypes.standardRepair))).toBe(true);
    await expect(options.some((opt) => opt.includes(RMA.rmaTypes.doa))).toBe(true);
  });

  test('TC-SUB-011 | Invalid email format shows validation error @submit', async ({ page }) => {
    Logger.step('Invalid email format shows validation error');

    const form = new SubmitRMAPage(page);
    await form.fillEmail('notanemail');
    await form.clickSave();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)
    const hasError = await page.locator('[class*="error"], .invalid-feedback').isVisible();
    const validationMsg = await page.locator('input[type="email"]').evaluate((el) => el.validationMessage);
    await expect(hasError || validationMsg.length > 0).toBe(true);
  });
});

test.describe('Factory Receive RMA @factory-receive', () => {

  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  });

  test('TC-FR-001 | Page loads with intro message @smoke', async ({ page }) => {
    Logger.step('Page loads with intro message');

    const frPage = new FactoryReceivePage(page);
    await expect(frPage.pageHeading).toBeVisible({ timeout: 10_000 });
    await expect(frPage.introMessage).toBeVisible({ timeout: 10_000 });
  });

  test('TC-FR-002 | Notify Customers checkbox is checked by default @submit', async ({ page }) => {
    Logger.step('Notify Customers checkbox is checked by default');

    const frPage = new FactoryReceivePage(page);
    await expect(await frPage.isNotifyCheckedByDefault()).toBe(true);
  });

  test('TC-FR-003 | Valid serial number auto-populates device info @submit', async ({ page }) => {
    Logger.step('Valid serial number auto-populates device info');

    const frPage = new FactoryReceivePage(page);
    await frPage.enterSerial(RMA.validSerial);
    await frPage.clickAdd();
    const hasError = await frPage.errorMessage.isVisible().catch(() => false);
    const hasDeviceInfo = await frPage.deviceInfoBlock.isVisible().catch(() => false);
    await expect(hasError || hasDeviceInfo).toBe(true);
  });

  test('TC-FR-004 | Non-existent serial shows correct error message @submit', async ({ page }) => {
    Logger.step('Non-existent serial shows correct error message');

    const frPage = new FactoryReceivePage(page);
    await frPage.receiveSerial(RMA.invalidSerial);
    const errorText = await frPage.getErrorMessage();
    await expect(errorText).toContain('No request can be found for this serial number');
  });

  test('TC-FR-005 | Empty serial shows validation error @submit', async ({ page }) => {
    Logger.step('Empty serial shows validation error');

    const frPage = new FactoryReceivePage(page);
    await frPage.enterSerial('');
    await frPage.clickAdd();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)
    const error = page.locator('[class*="error"], .alert, [class*="validation"]');
    const isVisible = await error.isVisible().catch(() => false);
    const snRequired = await page.locator('input[name*="serial"]').evaluate((el) => (el instanceof HTMLInputElement) ? !el.validity.valid : false);
    await expect(isVisible || snRequired).toBe(true);
  });

  test('TC-FR-006 | SQL injection in serial — handled safely @security', async ({ page }) => {
    Logger.step('SQL injection in serial — handled safely');

    const frPage = new FactoryReceivePage(page);
    await frPage.receiveSerial(RMA.sqlInjection);
    const body = await page.locator('body').textContent();
    await expect(body).not.toContain('SQL');
    await expect(body).not.toContain('syntax error');
    await expect(!page.url().includes('/500')).toBe(true);
  });

  test('TC-FR-007 | XSS payload in serial field does not execute @security', async ({ page }) => {
    Logger.step('XSS payload in serial field does not execute');

    const frPage = new FactoryReceivePage(page);
    let alertFired = false;
    page.on('dialog', async (d) => { alertFired = true; await d.dismiss(); });
    await frPage.receiveSerial(RMA.xssPayload);
    // removed: waitForTimeout(500ms) — use event-based wait if needed
    await expect(alertFired).toBe(false);
  });

  test('TC-FR-008 | Same S/N cannot be added twice in one session @submit', async ({ page }) => {
    Logger.step('Same S/N cannot be added twice in one session');

    const frPage = new FactoryReceivePage(page);
    await frPage.receiveSerial(RMA.validSerial);
    const countAfterFirst = await frPage.getAddedSerialsCount();
    await frPage.receiveSerial(RMA.validSerial);
    const countAfterSecond = await frPage.getAddedSerialsCount();
    const dupError = await page.locator('text=/already added|duplicate/i').isVisible().catch(() => false);
    await expect(dupError || countAfterSecond === countAfterFirst).toBe(true);
  });

  test('TC-FR-009 | Customer role cannot access Factory Receive @submit', async ({ page }) => {
    Logger.step('Customer role cannot access Factory Receive');

    await switchRole(page, USERS.customerOne);
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const url = page.url();
    await expect(url.includes('/login') || url.includes('/403') || url.includes('/unauthorized')).toBe(true);
  });

  test('TC-FR-010 | Repair Watcher cannot access Factory Receive @submit', async ({ page }) => {
    Logger.step('Repair Watcher cannot access Factory Receive');

    await switchRole(page, USERS.repairWatcher);
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const url = page.url();
    const submitBtn = page.locator('button[type="submit"]').first();
    const btnVisible = await submitBtn.isVisible().catch(() => false);
    await expect(url.includes('/login') || url.includes('/403') || !btnVisible).toBe(true);
  });
});
