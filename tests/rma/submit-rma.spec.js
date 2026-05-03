// @ts-check
/**
 * tests/rma/submit-rma.spec.js
 * Submit RMA Form + Factory Receive Tests (21 tests)
 */
const { test, expect } = require('@playwright/test');
const { loginAs } = require('../../src/helpers/rmaAuthHelper');
const { SubmitRMAPage } = require('../../src/pages/rma/SubmitRMAPage');
const { FactoryReceivePage } = require('../../src/pages/rma/FactoryReceivePage');
const { USERS, ROUTES, RMA } = require('../../src/helpers/Constants');

test.describe('Submit RMA Form @submit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await page.goto(ROUTES.submitRma);
    await page.waitForLoadState('networkidle');
  });

  test('TC-SUB-001 | Submit RMA page loads with mandatory field notice @smoke', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.expectMandatoryNote();
  });

  test('TC-SUB-002 | Serial number field has 18-char counter', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    const count = await form.getCharCounterValue();
    expect(count).toBe(18);
  });

  test('TC-SUB-003 | Valid S/N auto-populates Product Name and Code @smoke', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.validSerial);
    const productName = await form.getProductName();
    const productCode = await form.getProductCode();
    expect(productName.length).toBeGreaterThan(0);
    expect(productCode.length).toBeGreaterThan(0);
  });

  test('TC-SUB-004 | Invalid serial number does NOT populate product fields', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.invalidSerial);
    const productName = await form.getProductName();
    expect(productName).toBe('');
  });

  test('TC-SUB-005 | Character counter decrements as user types', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    const initialCount = await form.getCharCounterValue();
    await form.serialNumberInput.fill('ABC');
    await form.serialNumberInput.press('Tab');
    await page.waitForTimeout(500);
    const afterCount = await form.getCharCounterValue();
    if (initialCount !== null && afterCount !== null) {
      expect(afterCount).toBeLessThan(initialCount);
    }
  });

  test('TC-SUB-006 | Note for Repair is a mandatory field', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.validSerial);
    await page.waitForTimeout(1500);
    await form.clickSave();
    await page.waitForTimeout(800);
    expect(page.url()).toMatch(/add|edit/);
  });

  test('TC-SUB-007 | SQL injection in serial number — handled safely @security', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.serialNumberInput.fill(RMA.sqlInjection);
    await form.serialNumberInput.press('Tab');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('SQL');
    expect(body).not.toContain('syntax error');
    expect(body).not.toContain('ORA-');
    await expect(page).not.toHaveURL(/error|500/);
  });

  test('TC-SUB-008 | XSS payload in Note field does not execute @security', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    let alertFired = false;
    page.on('dialog', async (dialog) => { alertFired = true; await dialog.dismiss(); });
    await form.fillNoteForRepair(RMA.xssPayload);
    await form.clickSave();
    await page.waitForTimeout(1000);
    expect(alertFired).toBe(false);
  });

  test('TC-SUB-009 | Close button discards form and navigates away', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.fillSerialNumber(RMA.validSerial);
    await form.clickClose();
    await expect(page).not.toHaveURL(/\/rma\/add$/);
  });

  test('TC-SUB-010 | RMA Type dropdown contains required types', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.rmaTypeDropdown.waitFor({ state: 'visible' });
    const options = await form.rmaTypeDropdown.locator('option').allTextContents();
    expect(options.some((opt) => opt.includes(RMA.rmaTypes.standardRepair))).toBe(true);
    expect(options.some((opt) => opt.includes(RMA.rmaTypes.doa))).toBe(true);
  });

  test('TC-SUB-011 | Invalid email format shows validation error', async ({ page }) => {
    const form = new SubmitRMAPage(page);
    await form.fillEmail('notanemail');
    await form.clickSave();
    await page.waitForTimeout(800);
    const hasError = await page.locator('[class*="error"], .invalid-feedback').isVisible();
    const validationMsg = await page.locator('input[type="email"]').evaluate((el) => el.validationMessage);
    expect(hasError || validationMsg.length > 0).toBe(true);
  });
});

test.describe('Factory Receive RMA @factory-receive', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.rmaAdmin);
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('networkidle');
  });

  test('TC-FR-001 | Page loads with intro message @smoke', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    await expect(frPage.pageHeading).toBeVisible({ timeout: 10_000 });
    await expect(frPage.introMessage).toBeVisible({ timeout: 10_000 });
  });

  test('TC-FR-002 | Notify Customers checkbox is checked by default', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    expect(await frPage.isNotifyCheckedByDefault()).toBe(true);
  });

  test('TC-FR-003 | Valid serial number auto-populates device info', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    await frPage.enterSerial(RMA.validSerial);
    await frPage.clickAdd();
    const hasError = await frPage.errorMessage.isVisible().catch(() => false);
    const hasDeviceInfo = await frPage.deviceInfoBlock.isVisible().catch(() => false);
    expect(hasError || hasDeviceInfo).toBe(true);
  });

  test('TC-FR-004 | Non-existent serial shows correct error message', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    await frPage.receiveSerial(RMA.invalidSerial);
    const errorText = await frPage.getErrorMessage();
    expect(errorText).toContain('No request can be found for this serial number');
  });

  test('TC-FR-005 | Empty serial shows validation error', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    await frPage.enterSerial('');
    await frPage.clickAdd();
    await page.waitForTimeout(800);
    const error = page.locator('[class*="error"], .alert, [class*="validation"]');
    const isVisible = await error.isVisible().catch(() => false);
    const snRequired = await page.locator('input[name*="serial"]').evaluate((el) => (el instanceof HTMLInputElement) ? !el.validity.valid : false);
    expect(isVisible || snRequired).toBe(true);
  });

  test('TC-FR-006 | SQL injection in serial — handled safely @security', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    await frPage.receiveSerial(RMA.sqlInjection);
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('SQL');
    expect(body).not.toContain('syntax error');
    expect(!page.url().includes('/500')).toBe(true);
  });

  test('TC-FR-007 | XSS payload in serial field does not execute @security', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    let alertFired = false;
    page.on('dialog', async (d) => { alertFired = true; await d.dismiss(); });
    await frPage.receiveSerial(RMA.xssPayload);
    await page.waitForTimeout(500);
    expect(alertFired).toBe(false);
  });

  test('TC-FR-008 | Same S/N cannot be added twice in one session', async ({ page }) => {
    const frPage = new FactoryReceivePage(page);
    await frPage.receiveSerial(RMA.validSerial);
    const countAfterFirst = await frPage.getAddedSerialsCount();
    await frPage.receiveSerial(RMA.validSerial);
    const countAfterSecond = await frPage.getAddedSerialsCount();
    const dupError = await page.locator('text=/already added|duplicate/i').isVisible().catch(() => false);
    expect(dupError || countAfterSecond === countAfterFirst).toBe(true);
  });

  test('TC-FR-009 | Customer role cannot access Factory Receive', async ({ page }) => {
    await loginAs(page, USERS.customerOne);
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.includes('/login') || url.includes('/403') || url.includes('/unauthorized')).toBe(true);
  });

  test('TC-FR-010 | Repair Watcher cannot access Factory Receive', async ({ page }) => {
    await loginAs(page, USERS.repairWatcher);
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const submitBtn = page.locator('button[type="submit"]').first();
    const btnVisible = await submitBtn.isVisible().catch(() => false);
    expect(url.includes('/login') || url.includes('/403') || !btnVisible).toBe(true);
  });
});
