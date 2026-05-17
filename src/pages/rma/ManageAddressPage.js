/**
 * src/pages/rma/ManageAddressPage.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Page Object Model — Manage Return Address (/rma/manageaddr/)
 *
 * Page heading: "Return Address"
 * Table columns: #, Customer Name, User Name, Contact Name, Return Company,
 *                Return Phone, Action
 * Form fields:   Customer Name* (Select2), User Name* (Select2),
 *                Contact Name*, Company*, Building/Floor, Street*,
 *                Zipcode*, City*, Country* (select), Phone
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { ROUTES } = require('../../helpers/Constants');

class ManageAddressPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ─── List page ────────────────────────────────────────────────────────────
    this.pageHeading        = page.locator('h2, h1').filter({ hasText: /Return Address/i }).first();
    this.addNewBtn          = page.locator('a:has-text("Add New Return Address"), button:has-text("Add New Return Address")').first();
    this.filterDataBtn      = page.locator('button:has-text("Filter Data"), a:has-text("Filter Data")').first();
    this.addressTable        = page.locator('table').first();
    this.tableRows           = page.locator('table tbody tr');
    this.paginationInfo      = page.locator('text=/Currently Viewing Page/i, .pagination-info').first();

    // ─── Filter panel ─────────────────────────────────────────────────────────
    this.filterKeyword       = page.locator('input[placeholder*="Keyword" i], input[name*="keyword"]').first();
    this.filterCustomerSelect = page.locator('.select2-container').first();
    this.filterApplyBtn      = page.locator('button:has-text("Apply"), button:has-text("Search")').first();
    this.filterResetBtn      = page.locator('button:has-text("Reset"), button:has-text("Clear")').first();

    // ─── Add/Edit form fields ─────────────────────────────────────────────────
    this.customerNameSelect2 = page.locator('select[name*="customer"], .select2-container').first();
    this.userNameSelect2     = page.locator('select[name*="user"], .select2-container').nth(1);
    this.contactNameInput    = page.locator('input[name*="contact_name"], input[placeholder*="Contact Name" i]').first();
    this.companyInput        = page.locator('input[name*="company"], input[name*="return_company"], input[placeholder*="Company" i]').first();
    this.buildingInput       = page.locator('input[name*="building"], input[placeholder*="Building" i]').first();
    this.streetInput         = page.locator('input[name*="street"], input[placeholder*="Street" i]').first();
    this.zipcodeInput        = page.locator('input[name*="zip"], input[name*="zipcode"], input[placeholder*="Zip" i]').first();
    this.cityInput           = page.locator('input[name*="city"], input[placeholder*="City" i]').first();
    this.countrySelect       = page.locator('select[name*="country"]').first();
    this.phoneInput          = page.locator('input[name*="phone"], input[placeholder*="Phone" i]').first();
    this.submitBtn           = page.locator('button:has-text("Submit"), button[type="submit"]').first();
    this.backBtn             = page.locator('a:has-text("Back"), button:has-text("Back")').first();

    // ─── View page ────────────────────────────────────────────────────────────
    this.editBtn             = page.locator('a:has-text("Edit"), button:has-text("Edit")').first();
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────
  async goto() {
    await this.page.goto(ROUTES.manageAddress);
    await this.page.waitForLoadState('networkidle');
  }

  // ─── List Actions ─────────────────────────────────────────────────────────────
  async getRowCount() {
    return await this.tableRows.count();
  }

  async getTableHeaders() {
    return await this.addressTable.locator('thead th').allTextContents();
  }

  async clickAddNew() {
    await this.addNewBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickViewOnRow(index = 0) {
    const row = this.tableRows.nth(index);
    const viewBtn = row.locator('a, button, [class*="action"] a').last();
    await viewBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getRowText(index = 0) {
    return await this.tableRows.nth(index).textContent();
  }

  // ─── Filter Actions ───────────────────────────────────────────────────────────
  async openFilter() {
    await this.filterDataBtn.click();
    await this.page.waitForTimeout(400);
  }

  async filterByKeyword(keyword) {
    await this.filterKeyword.fill(keyword);
    await this.filterApplyBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectFilterCustomer(customerName) {
    const nativeSelect = this.page.locator('select[name*="customer"]').first();
    const isVisible = await nativeSelect.isVisible().catch(() => false);
    
    if (isVisible) {
      // Native select
      await nativeSelect.selectOption({ label: customerName }).catch(() => 
        nativeSelect.selectOption({ value: customerName }).catch(() => {})
      );
    } else {
      // Select2 interaction - find the container for the customer select specifically
      const container = nativeSelect.locator('xpath=following-sibling::*[contains(@class, "select2-container")]').first();
      await container.click().catch(() => this.filterCustomerSelect.click());
      await this.page.waitForTimeout(300);
      const searchInput = this.page.locator('.select2-search__field, .select2-search input').last();
      if (await searchInput.isVisible()) {
        await searchInput.fill(customerName);
        await this.page.waitForTimeout(500);
        const option = this.page.locator('.select2-results__option').filter({ hasText: customerName }).first();
        await option.click().catch(() => {});
      }
    }
    await this.page.waitForTimeout(300);
  }

  // ─── Form Actions ─────────────────────────────────────────────────────────────
  async selectCustomer(customerName) {
    const container = this.page.locator('.select2-container').first();
    await container.click();
    await this.page.waitForTimeout(300);
    const searchInput = this.page.locator('.select2-search__field').first();
    await searchInput.fill(customerName);
    await this.page.waitForTimeout(600);
    const option = this.page.locator('.select2-results__option').filter({ hasText: customerName }).first();
    await option.click();
    await this.page.waitForTimeout(300);
  }

  async selectUser(userName) {
    const containers = this.page.locator('.select2-container');
    const userContainer = containers.nth(1);
    await userContainer.click();
    await this.page.waitForTimeout(300);
    const searchInput = this.page.locator('.select2-search__field').first();
    await searchInput.fill(userName);
    await this.page.waitForTimeout(600);
    const option = this.page.locator('.select2-results__option').filter({ hasText: userName }).first();
    await option.click();
    await this.page.waitForTimeout(300);
  }

  async fillAddressForm({ contactName, company, building, street, zipcode, city, country, phone }) {
    if (contactName) await this.contactNameInput.fill(contactName);
    if (company)     await this.companyInput.fill(company);
    if (building)    await this.buildingInput.fill(building).catch(() => {});
    if (street)      await this.streetInput.fill(street);
    if (zipcode)     await this.zipcodeInput.fill(zipcode);
    if (city)        await this.cityInput.fill(city);
    if (country) {
      await this.countrySelect.evaluate((node, c) => {
        const option = Array.from(node.options).find(o => o.text.includes(c) || o.value === c);
        if (option) {
          node.value = option.value;
          node.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, country).catch(() => {});
    }
    if (phone)       await this.phoneInput.fill(phone);
  }

  async submitForm() {
    await this.submitBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickBack() {
    await this.backBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Validation ───────────────────────────────────────────────────────────────
  async getValidationErrors() {
    const errors = this.page.locator('.invalid-feedback, [class*="error"], .text-danger, .help-block');
    return await errors.allTextContents();
  }

  async hasValidationError() {
    const errors = this.page.locator('.invalid-feedback:visible, .text-danger:visible, .alert-danger:visible');
    return (await errors.count()) > 0;
  }

  async getSuccessMessage() {
    const msg = this.page.locator('.alert-success, [class*="success"]').first();
    return await msg.textContent().catch(() => '');
  }
}

module.exports = { ManageAddressPage };
