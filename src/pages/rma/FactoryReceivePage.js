const BasePage = require('../BasePage');

/**
 * FactoryReceivePage - Page Object for Factory Receive RMA.
 * @extends BasePage
 */
class FactoryReceivePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    this.pageHeading = page.locator('h2, h1').filter({ hasText: /Factory Receive/i }).first();
    this.introMessage = page.locator('text=/Factory Receive RMA page is used/i').first();
    this.serialInput = page.locator('input[name*="serial"], input[placeholder*="serial" i], input[placeholder*="S/N" i]').first();
    this.notifyCheckbox = page.locator('input[type="checkbox"]').first();
    this.notifyLabel = page.locator('label:has-text("Notify"), text=/Notify Customers/i').first();
    this.addBtn = page.locator('button:has-text("Add"), button:has-text("Receive"), button[type="submit"]').first();
    this.submitBtn = page.locator('button:has-text("Submit"), button:has-text("Confirm")').first();
    this.errorMessage = page.locator('[class*="error"], .alert-danger, [class*="alert-error"]').first();
    this.successMessage = page.locator('[class*="success"], .alert-success').first();
    this.deviceInfoBlock = page.locator('[class*="device-info"], [class*="rma-info"], [class*="product"]');
    this.addedItemsList = page.locator('[class*="serial-list"], [class*="added-items"], table tbody');
  }

  async goto() {
    await this.navigate('/rma/factory-receive');
  }

  async enterSerial(sn) {
    await this.serialInput.clear();
    await this.serialInput.fill(sn);
  }

  async clickAdd() {
    await this.addBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async submitReceive() {
    await this.submitBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async receiveSerial(sn) {
    await this.enterSerial(sn);
    await this.clickAdd();
  }

  async isNotifyCheckedByDefault() {
    return await this.notifyCheckbox.isChecked();
  }

  async uncheckNotify() {
    if (await this.notifyCheckbox.isChecked()) {
      await this.notifyCheckbox.uncheck();
    }
  }

  async getErrorMessage() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 8_000 });
    return (await this.errorMessage.textContent())?.trim();
  }

  async getAddedSerialsCount() {
    return await this.addedItemsList.locator('tr, [class*="item"]').count();
  }

  async getDeviceInfo() {
    return await this.deviceInfoBlock.textContent();
  }
}

module.exports = { FactoryReceivePage };
