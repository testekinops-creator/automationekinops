const BasePage = require('../BasePage');

/**
 * SubmitRMAPage - Page Object for Submit RMA Request form.
 * @extends BasePage
 */
class SubmitRMAPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    // Form fields
    this.serialNumberInput = page.locator('input[name*="serial"], input[placeholder*="serial" i], input[placeholder*="S/N" i]').first();
    this.charCounter = page.locator('text=/characters left/i').first();
    this.productNameInput = page.locator('input[name*="product_name"], input[placeholder*="Product Name" i]').first();
    this.productCodeInput = page.locator('input[name*="product_code"], input[placeholder*="Product Code" i]').first();

    // Customer section
    this.customerNameDropdown = page.locator('select[name*="customer"], [class*="customer-name"] select, [placeholder*="Select Customer"]').first();
    this.customerUserDropdown = page.locator('select[name*="user"], [class*="customer-user"] select').first();
    this.phoneInput = page.locator('input[name*="phone"], input[placeholder*="phone" i]').first();
    this.emailInput = page.locator('input[name*="email"], input[type="email"]').first();

    // RMA Information
    this.returnLocationDropdown = page.locator('select[name*="return"], [placeholder*="location" i]').first();
    this.rmaTypeDropdown = page.locator('select[name*="rma_type"], select[name*="type"]').first();
    this.customerInternalRef = page.locator('input[name*="internal_ref"], input[name*="reference"]').first();
    this.noteForRepair = page.locator('textarea[name*="note"], textarea[placeholder*="note" i]').first();

    // Buttons
    this.saveBtn = page.locator('button:has-text("Save"), button[type="submit"]:has-text("Save")').first();
    this.closeBtn = page.locator('button:has-text("Close"), button:has-text("Cancel")').first();

    // Validation
    this.validationErrors = page.locator('.error, .invalid-feedback, [class*="error"], [class*="validation"]');
    this.successMessage = page.locator('.success, .alert-success, [class*="success"]');
    this.warningBanner = page.locator('.alert-warning, [class*="warning"], text=/warning/i');
    this.oaWarning = page.locator('text=/warranty calculation is disabled/i');
    this.mandatoryNote = page.locator('text=/fields marked with/i');
  }

  async goto() {
    await this.navigate('/rma/add');
  }

  async fillSerialNumber(sn) {
    await this.serialNumberInput.clear();
    await this.serialNumberInput.fill(sn);
    await this.serialNumberInput.press('Tab');
    await this.page.waitForTimeout(1500);
  }

  async getCharCounterValue() {
    const text = await this.charCounter.textContent();
    const match = text?.match(/(\d+)\s+characters?\s+left/i);
    return match ? parseInt(match[1], 10) : null;
  }

  async selectCustomer(customerName) {
    await this.customerNameDropdown.selectOption({ label: customerName });
    await this.page.waitForTimeout(500);
  }

  async selectCustomerUser(username) {
    await this.customerUserDropdown.selectOption({ label: username });
  }

  async fillPhone(phone) { await this.phoneInput.fill(phone); }
  async fillEmail(email) { await this.emailInput.fill(email); }
  async selectReturnLocation(location) { await this.returnLocationDropdown.selectOption({ label: location }); }
  async selectRmaType(type) { await this.rmaTypeDropdown.selectOption({ label: type }); }
  async fillNoteForRepair(note) { await this.noteForRepair.fill(note); }

  async clickSave() {
    await this.saveBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickClose() {
    await this.closeBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillCompleteForm({ serialNumber, customer, username, phone, email, returnLocation, rmaType, note }) {
    await this.fillSerialNumber(serialNumber);
    if (customer) await this.selectCustomer(customer);
    if (username) await this.selectCustomerUser(username);
    if (phone) await this.fillPhone(phone);
    if (email) await this.fillEmail(email);
    if (returnLocation) await this.selectReturnLocation(returnLocation);
    if (rmaType) await this.selectRmaType(rmaType);
    if (note) await this.fillNoteForRepair(note);
  }

  async getProductName() { return await this.productNameInput.inputValue(); }
  async getProductCode() { return await this.productCodeInput.inputValue(); }
  async hasValidationError(fieldText) { return await this.page.locator(`text=/${fieldText}/i`).isVisible(); }
  async isOaWarningVisible() { return await this.oaWarning.isVisible(); }
  async expectMandatoryNote() { await this.mandatoryNote.waitFor({ state: 'visible' }); }
}

module.exports = { SubmitRMAPage };
