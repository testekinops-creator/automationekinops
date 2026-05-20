const BasePage = require('../BasePage');

/**
 * FactoryInsertPage - Page Object for Factory Insert RMA.
 * Selectors based on actual DOM at https://myconnect-acc.ekinops.com/rma/factory/add
 * @extends BasePage
 */
class FactoryInsertPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    // Page heading — "Factory Insert" with "RMA Factory Insert Form" subtitle
    this.pageHeading = page.locator('h2, h1').filter({ hasText: /Factory Insert/i }).first();

    // Customer section
    this.customerDropdown = page.locator('#customer_id, select[name="customer_id"]').first();
    this.userDropdown = page.locator('#user_id, select[name="user_id"]').first();

    // Product Information fieldset
    this.serialInput = page.locator('#serial_number').first();
    this.charCounter = page.locator('text=/characters left/i').first();
    this.productCodeInput = page.locator('#product_code').first();
    this.productNameInput = page.locator('#product_name').first();

    // RMA Information
    this.returnLocation = page.locator('#return_location_id, select[name="return_location_id"]').first();
    this.rmaTypeDropdown = page.locator('#rma_type, select[name="rma_type"]').first();
    this.noteForRepair = page.locator('textarea[name="repair_note"]').first();

    // --- "Click here" link below Return Location ---
    this.clickHereLink = page.locator('a:has-text("Click here"), a:has-text("click here")').first();

    // --- "Enter a New Return Location" popup/modal ---
    this.newReturnLocationModal = page.locator('[class*="modal"]:visible, [role="dialog"]:visible').filter({ hasText: /New Return Location|Enter a New Return Location/i }).first();
    this.newReturnLocationModalTitle = page.locator('[class*="modal-title"], [class*="modal-header"]').filter({ hasText: /New Return Location|Enter a New Return Location/i }).first();

    // Intro message — actual: "The Factory Insert section allows repair engineers..."
    this.mandatoryNote = page.locator('text=/Factory Insert section allows/i').first();

    // Comments (optional)
    this.commentsTextarea = page.locator('textarea[name="comments"], textarea#comments, textarea').first();

    // Buttons
    this.submitBtn = page.locator('#submitBtnFactory, button:has-text("Submit")').first();
    this.cancelBtn = page.locator('.btn-gray, a:has-text("Cancel")').first();

    // Validation
    this.validationErrors = page.locator('[class*="error"], .invalid-feedback, .text-danger');

    // Serial number not found error message
    this.serialNotFoundError = page.locator(
      'text=/Sorry.*serial number.*not found/i'
    ).first();

    // Duplicate Serial Number validation banner (in-progress RMA)
    this.duplicateSerialError = page.locator(
      'text=/A RMA request for the provided serial number is in progress/i'
    ).first();

    // Validation error banner after form submission (e.g. "The Following Error(s) Occurred:")
    this.validationErrorBanner = page.locator('text=/The Following Error/i').first();
    this.returnLocationRequiredError = page.locator('text=/Return Location.*required/i').first();

    this.successMessage = page.locator('.alert-success, [class*="success"]').first();

    // --- Aliases for backward compatibility ---
    this.customerNameDropdown = this.customerDropdown;
    this.returnLocationDropdown = this.returnLocation;
  }

  async goto() {
    await this.navigate('/rma/factory/add');
  }

  async fillSerial(sn) {
    await this.serialInput.fill(sn);
    await this.serialInput.press('Tab');
    await this.page.waitForTimeout(1500);
  }

  async selectCustomer(name) {
    await this.customerDropdown.selectOption({ label: name });
  }

  async unselectCustomer() {
    // Select the default empty option
    await this.customerDropdown.selectOption({ value: '' });
  }

  /**
   * Select customer using Select2 (AJAX-driven dropdown).
   * Matches the Submit RMA POM pattern for consistent 2degrees selection.
   */
  async selectCustomerBySearch(customerName) {
    const customerSelect2 = this.page.locator('#customer_id').locator('xpath=..').locator('.select2-selection');
    const isSelect2 = await customerSelect2.isVisible().catch(() => false);
    if (isSelect2) {
      await customerSelect2.click();
      await this.page.waitForTimeout(500);
      const searchField = this.page.locator('.select2-search__field:visible').last();
      if (await searchField.isVisible()) {
        await searchField.fill(customerName);
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
      }
    } else {
      // Fallback to native select
      const options = await this.customerDropdown.locator('option').allTextContents();
      const match = options.find(o => new RegExp(customerName, 'i').test(o));
      if (match) {await this.customerDropdown.selectOption({ label: match });}
    }
  }

  /**
   * Select customer username using Select2 or native select.
   */
  async selectCustomerUserBySearch(username) {
    await this.page.waitForTimeout(3000); // wait for AJAX population
    const userSelect2 = this.page.locator('#user_id').locator('xpath=..').locator('.select2-selection');
    const isSelect2 = await userSelect2.isVisible().catch(() => false);
    if (isSelect2) {
      await userSelect2.click();
      await this.page.waitForTimeout(500);
      const searchField = this.page.locator('.select2-search__field:visible').last();
      if (await searchField.isVisible()) {
        await searchField.fill(username);
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
      }
    } else {
      const options = await this.userDropdown.locator('option').allTextContents();
      const match = options.find(o => new RegExp(username, 'i').test(o));
      if (match) {await this.userDropdown.selectOption({ label: match });}
    }
  }

  async selectRmaType(type) {
    await this.rmaTypeDropdown.evaluate((el, val) => {
      const option = Array.from(el.options).find(o => o.text.includes(val) || o.value === val);
      if (option) {
        el.value = option.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, type);
  }

  async clickSubmit() {
    await this.submitBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancel() {
    await this.cancelBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillComments(text) {
    await this.commentsTextarea.fill(text);
  }

  async getRmaTypeOptions() {
    return this.rmaTypeDropdown.locator('option').allTextContents();
  }

  /**
   * Check if the Submit button is currently visible on the page.
   * The app hides the submit button (d-none) when serial/product validation fails.
   */
  async isSubmitVisible() {
    return this.submitBtn.isVisible().catch(() => false);
  }

  /**
   * Scroll the submit button into view (for long forms).
   */
  async scrollToSubmit() {
    await this.submitBtn.scrollIntoViewIfNeeded().catch(() => {});
  }

  async getCharCount() {
    const text = await this.charCounter.textContent();
    const match = text?.match(/(\d+)\s+characters?\s+left/i);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Click the "Click here" link below Return Location.
   */
  async clickClickHereLink() {
    await this.clickHereLink.waitFor({ state: 'visible', timeout: 10_000 });
    await this.clickHereLink.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if the "Click here" link is visible.
   * @returns {Promise<boolean>}
   */
  async isClickHereLinkVisible() {
    return this.clickHereLink.isVisible().catch(() => false);
  }

  /**
   * Check if the "Enter a New Return Location" popup/modal is visible.
   * @returns {Promise<boolean>}
   */
  async isNewReturnLocationModalVisible() {
    return this.newReturnLocationModal.isVisible().catch(() => false);
  }

  /**
   * Get all options from the Return Location dropdown.
   * @returns {Promise<string[]>}
   */
  async getReturnLocationOptions() {
    await this.returnLocation.waitFor({ state: 'visible', timeout: 10_000 });
    return this.returnLocation.locator('option').allTextContents();
  }

  /**
   * Check if the duplicate serial number error banner is visible.
   * This error appears when entering a serial number that has an active/in-progress RMA
   * (any status EXCEPT Rejected and Closed).
   * @returns {Promise<boolean>}
   */
  async isDuplicateSerialErrorVisible() {
    return this.duplicateSerialError.isVisible().catch(() => false);
  }

  /**
   * Get the full text of the duplicate serial error message.
   * @returns {Promise<string>}
   */
  async getDuplicateSerialErrorText() {
    if (!await this.isDuplicateSerialErrorVisible()) {return '';}
    return (await this.duplicateSerialError.textContent())?.trim() ?? '';
  }
}

module.exports = { FactoryInsertPage };

