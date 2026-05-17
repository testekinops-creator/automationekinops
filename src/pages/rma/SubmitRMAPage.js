const BasePage = require('../BasePage');

/**
 * SubmitRMAPage - Page Object for Submit RMA Request form.
 * Selectors based on actual DOM at https://myconnect-acc.ekinops.com/rma/add
 * @extends BasePage
 */
class SubmitRMAPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    // --- Product Information fieldset ---
    this.serialNumberInput = page.locator('#serial_number').first();
    this.charCounter = page.locator('text=/characters left/i').first();
    this.productNameInput = page.locator('#product_name').first();
    this.productCodeInput = page.locator('#product_code').first();

    // --- Customer section ---
    this.customerNameDropdown = page.locator('#customer_id, select[name="customer_id"]').first();
    this.customerUserDropdown = page.locator('#user_id, select[name="user_id"]').first();
    this.phoneInput = page.locator('#phone_no, input[name="phone_no"]').first();
    this.emailInput = page.locator('#contact_email, input[name="contact_email"]').first();

    // --- RMA Information ---
    this.returnLocationDropdown = page.locator('#return_location_id, select[name="return_location_id"]').first();
    this.rmaTypeDropdown = page.locator('#rma_type, select[name="rma_type"]').first();
    this.customerInternalRef = page.locator('#customer_internal_reference, input[name="customer_internal_reference"]').first();
    this.noteForRepair = page.locator('textarea[name="comment"]').first();

    // --- "Click here" link below Return Location ---
    // This link opens the "Enter a New Return Location" popup.
    // It should only work when Customer Name and Customer's Username are selected.
    this.clickHereLink = page.locator('a:has-text("Click here"), a:has-text("click here")').first();

    // --- "Enter a New Return Location" popup/modal ---
    this.newReturnLocationModal = page.locator('[class*="modal"]:visible, [role="dialog"]:visible').filter({ hasText: /New Return Location|Enter a New Return Location/i }).first();
    this.newReturnLocationModalTitle = page.locator('[class*="modal-title"], [class*="modal-header"]').filter({ hasText: /New Return Location|Enter a New Return Location/i }).first();

    // --- Mandatory fields notice --- actual: "The fields marked with ( * ) are mandatory."
    this.mandatoryNote = page.locator('text=/fields marked with.*mandatory/i').first();

    // --- OA Warning ---
    this.oaWarning = page.locator('text=/warranty calculation is disabled/i, text=/warranty/i').first();

    // --- Buttons ---
    this.saveBtn = page.locator('#submitBtn, button:has-text("Save")').first();
    this.closeBtn = page.locator('button:has-text("Close"), a:has-text("Close")').first();

    // --- Validation & Messages ---
    this.validationErrors = page.locator('.error, .invalid-feedback, [class*="error"], [class*="validation"], .text-danger');
    this.successMessage = page.locator('.success, .alert-success, [class*="success"]');
    this.warningBanner = page.locator('.alert-warning, [class*="warning"]');

    // --- Loading / Spinner ---
    this.loadingSpinner = page.locator(
      '[class*="loading"], [class*="spinner"], .fa-spinner, [class*="loader"]:visible'
    ).first();

    // --- Duplicate Serial Number validation banner ---
    this.duplicateSerialError = page.locator(
      'text=/A RMA request for the provided serial number is in progress/i'
    ).first();
  }

  async goto() {
    await this.navigate('/rma/add');
  }

  async fillSerialNumber(sn) {
    await this.serialNumberInput.click();
    // Select all existing text and delete it
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    // Type character-by-character to trigger onkeyup (uppercase handler) and jQuery listeners
    await this.page.keyboard.type(sn, { delay: 30 });
    // Tab out to trigger blur/focusout event which fires the AJAX product lookup
    await this.page.keyboard.press('Tab');
    // Also dispatch focusout explicitly as a safety net for jQuery listeners
    await this.serialNumberInput.dispatchEvent('focusout');
    await this.page.waitForTimeout(2000);
  }

  async getCharCounterValue() {
    const text = await this.charCounter.textContent();
    const match = text?.match(/(\d+)\s+characters?\s+left/i);
    return match ? parseInt(match[1], 10) : null;
  }

  async selectCustomer(customerName) {
    // Click the visible Select2 container next to the hidden #customer_id select
    const customerSelect2 = this.page.locator('#customer_id').locator('xpath=..').locator('.select2-selection');
    await customerSelect2.click();
    await this.page.waitForTimeout(500);
    const searchField = this.page.locator('.select2-search__field');
    await searchField.fill(customerName);
    await this.page.waitForTimeout(1500);
    await this.page.locator('.select2-results__option').filter({ hasText: new RegExp(customerName, 'i') }).first().click();
    await this.page.waitForTimeout(1000);
  }

  async selectCustomerUser(username) {
    // Wait for the AJAX call from customer selection to populate the user dropdown
    await this.page.waitForTimeout(3000);
    // Click the visible Select2 container next to the hidden #customer_user_id select
    const userSelect2 = this.page.locator('#user_id').locator('xpath=..').locator('.select2-selection');
    await userSelect2.click();
    await this.page.waitForTimeout(500);
    const searchField = this.page.locator('.select2-search__field');
    await searchField.fill(username);
    await this.page.waitForTimeout(1500);
    await this.page.locator('.select2-results__option').filter({ hasText: new RegExp(username, 'i') }).first().click();
  }

  async fillPhone(phone) { 
    if (await this.phoneInput.isEditable().catch(() => false)) {
      await this.phoneInput.fill(phone); 
    }
  }
  async fillEmail(email) { 
    if (await this.emailInput.isEditable().catch(() => false)) {
      await this.emailInput.fill(email); 
    }
  }
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

  /**
   * Click the "Click here" link below Return Location.
   * Used to either trigger an error (when customer is not selected) or open the popup.
   */
  async clickClickHereLink() {
    await this.clickHereLink.waitFor({ state: 'visible', timeout: 10_000 });
    await this.clickHereLink.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if the "Click here" link below Return Location is visible.
   * @returns {Promise<boolean>}
   */
  async isClickHereLinkVisible() {
    return await this.clickHereLink.isVisible().catch(() => false);
  }

  /**
   * Get all options from the Return Location dropdown.
   * Useful to verify addresses are scoped to the selected customer.
   * @returns {Promise<string[]>}
   */
  async getReturnLocationOptions() {
    await this.returnLocationDropdown.waitFor({ state: 'visible', timeout: 10_000 });
    return await this.returnLocationDropdown.locator('option').allTextContents();
  }

  /**
   * Check if the "Enter a New Return Location" popup/modal is visible.
   * @returns {Promise<boolean>}
   */
  async isNewReturnLocationModalVisible() {
    return await this.newReturnLocationModal.isVisible().catch(() => false);
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
  async expectMandatoryNote() { await this.mandatoryNote.waitFor({ state: 'visible', timeout: 10_000 }); }

  /**
   * Check if page is in a loading/spinner state.
   * @returns {Promise<boolean>}
   */
  async isLoading() {
    return await this.loadingSpinner.isVisible().catch(() => false);
  }

  /**
   * Check if Save button is enabled (not permanently disabled after click).
   * @returns {Promise<boolean>}
   */
  async isSaveBtnEnabled() {
    return !(await this.saveBtn.isDisabled().catch(() => false));
  }

  /**
   * Check if the duplicate serial number error banner is visible.
   * @returns {Promise<boolean>}
   */
  async isDuplicateSerialErrorVisible() {
    return await this.duplicateSerialError.isVisible().catch(() => false);
  }

  /**
   * Get the full text of the duplicate serial error message.
   * @returns {Promise<string>}
   */
  async getDuplicateSerialErrorText() {
    if (!await this.isDuplicateSerialErrorVisible()) return '';
    return (await this.duplicateSerialError.textContent())?.trim() ?? '';
  }
}

module.exports = { SubmitRMAPage };

