const BasePage = require('../BasePage');

/**
 * FactoryInsertPage - Page Object for Factory Insert RMA.
 * @extends BasePage
 */
class FactoryInsertPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    this.pageHeading = page.locator('h2, h1').filter({ hasText: /Factory Insert/i }).first();
    this.customerDropdown = page.locator('select[name*="customer"]').first();
    this.userDropdown = page.locator('select[name*="user"]').first();
    this.serialInput = page.locator('input[name*="serial"]').first();
    this.charCounter = page.locator('text=/characters left/i').first();
    this.productCodeInput = page.locator('input[name*="product_code"]').first();
    this.productNameInput = page.locator('input[name*="product_name"]').first();
    this.returnLocation = page.locator('select[name*="return"]').first();
    this.rmaTypeDropdown = page.locator('select[name*="rma_type"]').first();
    this.noteForRepair = page.locator('textarea').first();
    this.submitBtn = page.locator('button:has-text("Submit")').first();
    this.cancelBtn = page.locator('button:has-text("Cancel")').first();
    this.mandatoryNote = page.locator('text=/fields marked with/i');
    this.validationErrors = page.locator('[class*="error"], .invalid-feedback');
  }

  async goto() {
    await this.navigate('/rma/factory-insert');
  }

  async fillSerial(sn) {
    await this.serialInput.fill(sn);
    await this.serialInput.press('Tab');
    await this.page.waitForTimeout(1000);
  }

  async selectCustomer(name) {
    await this.customerDropdown.selectOption({ label: name });
  }

  async selectRmaType(type) {
    await this.rmaTypeDropdown.selectOption({ label: type });
  }

  async clickSubmit() {
    await this.submitBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancel() {
    await this.cancelBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getCharCount() {
    const text = await this.charCounter.textContent();
    const match = text?.match(/(\d+)\s+characters?\s+left/i);
    return match ? parseInt(match[1], 10) : null;
  }
}

module.exports = { FactoryInsertPage };
