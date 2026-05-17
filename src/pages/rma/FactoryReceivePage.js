const BasePage = require('../BasePage');

/**
 * FactoryReceivePage - Page Object for Factory Receive RMA.
 * Selectors based on actual DOM at https://myconnect-acc.ekinops.com/rma/factory/receive/
 * @extends BasePage
 */
class FactoryReceivePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    // Page heading — "Factory Receive" with "RMA Factory Receive Form" subtitle
    this.pageHeading = page.locator('text=/Factory Receive/i').first();
    this.introMessage = page.locator('text=/Factory Receive RMA page is used to record/i').first();

    // Table-based form — the serial number inputs are inside a table
    // First row serial number input
    this.serialInput = page.locator('input[name="serial_number[]"]').first();

    // "Send E-Mail To Customer" checkbox
    this.notifyCheckbox = page.locator('#send_email_to_customer, input[name="send_email_to_customer"]').first();
    this.notifyLabel = page.locator('text=/Send E-Mail To Customer/i, text=/Notify Customers/i').first();

    // Buttons
    this.addRowBtn = page.locator('#factory-receive-add-row').first();
    this.submitBtn = page.locator('button[name="submitForm"]').first();
    this.cancelBtn = page.locator('button:has-text("Cancel"), a:has-text("Cancel")').first();

    // Messages
    this.errorMessage = page.locator('.alert-danger, [class*="error"], [class*="alert-error"], .text-danger').first();
    this.successMessage = page.locator('.alert-success, [class*="success"]').first();

    // Product info columns in the table (read-only fields)
    this.deviceInfoBlock = page.locator('table tbody').first();
    this.addedItemsList = page.locator('table tbody');

    // RMA ID/Status dropdown — each row has a <select> for choosing which Accepted RMA to receive
    // The first populated row's dropdown (skip the empty "new" row at the bottom)
    this.rmaIdDropdown = page.locator('table tbody tr select').first();

    // Table column headers
    this.tableHeaders = page.locator('table thead th');
  }

  async goto() {
    await this.navigate('/rma/factory/receive/');
  }

  async enterSerial(sn) {
    await this.serialInput.clear();
    await this.serialInput.fill(sn);
  }

  async clickAdd() {
    await this.addRowBtn.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Select the first available Accepted RMA from the RMA ID/Status dropdown.
   * The dropdown has options like "RMA-12345 / Accepted" — select index 1 (first real option).
   * @returns {boolean} true if an option was selected
   */
  async selectFirstRma() {
    const dropdown = this.rmaIdDropdown;
    if (!await dropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  [FactoryReceive] RMA ID dropdown not visible');
      return false;
    }
    const optionCount = await dropdown.locator('option').count();
    if (optionCount <= 1) {
      console.log(`  [FactoryReceive] RMA ID dropdown has ${optionCount} option(s) — nothing to select`);
      return false;
    }
    // Select the first non-default option (index 1)
    await dropdown.selectOption({ index: 1 });
    await this.page.waitForTimeout(500);
    const selectedValue = await dropdown.inputValue().catch(() => '');
    console.log(`  [FactoryReceive] Selected RMA ID: ${selectedValue}`);
    return true;
  }

  async submitReceive() {
    await this.submitBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async receiveSerial(sn) {
    await this.enterSerial(sn);
    await this.clickAdd();
    await this.selectFirstRma();
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
    return await this.addedItemsList.locator('tr').count();
  }

  async getDeviceInfo() {
    return await this.deviceInfoBlock.textContent();
  }
}

module.exports = { FactoryReceivePage };
