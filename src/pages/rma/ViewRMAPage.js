const BasePage = require('../BasePage');

/**
 * ViewRMAPage - Page Object for View / List RMA Requests.
 * @extends BasePage
 */
class ViewRMAPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    this.pageHeading = page.locator('h2, h1').filter({ hasText: /RMA Requests/i }).first();
    this.filterBanner = page.locator('[class*="filter"], text=/Filters Applied/i').first();
    this.dashboardFilter = page.locator('text=/Dashboard:/i').first();
    this.sortOrder = page.locator('text=/Applied Sort Order/i').first();
    this.submitRmaBtn = page.locator('button:has-text("Submit RMA Request"), a:has-text("Submit RMA Request")');
    this.filterDataBtn = page.locator('button:has-text("Filter Data"), [class*="filter-btn"]');
    this.tableRows = page.locator('table tbody tr, [class*="rma-list"] [class*="row"]');
    this.noResults = page.locator('text=/no records/i, text=/no results/i, text=/no data/i');
    this.paginationInfo = page.locator('text=/Currently Viewing/i');
  }

  async goto() {
    await this.navigate('/rma/requests');
  }

  async getRowCount() {
    return await this.tableRows.count();
  }

  async getRowByRmaId(rmaId) {
    return this.page.locator(`tr:has-text("${rmaId}"), [class*="row"]:has-text("${rmaId}")`).first();
  }

  async getStatusOfRma(rmaId) {
    const row = await this.getRowByRmaId(rmaId);
    const statusCell = row.locator('[class*="status"], td').filter({ hasText: /Submitted|Accepted|Received|On-Hold|Repaired|Rejected|Closed/i }).first();
    return await statusCell.textContent();
  }

  async getStatusBadgeColor(rmaId) {
    const row = await this.getRowByRmaId(rmaId);
    const badge = row.locator('[class*="badge"], [class*="status-badge"], [class*="status"]').first();
    return await badge.evaluate((el) => ({
      bg: window.getComputedStyle(el).backgroundColor,
      text: window.getComputedStyle(el).color,
    }));
  }

  async clickViewRmaAction(rmaId) {
    const row = await this.getRowByRmaId(rmaId);
    const actionBtn = row.locator('[class*="action"], button, a').last();
    await actionBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status) {
    await this.filterDataBtn.click();
    await this.page.locator(`option:has-text("${status}"), label:has-text("${status}")`).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async getDashboardFilterLabel() {
    return await this.dashboardFilter.textContent();
  }

  async expectDashboardFilter(cardName) {
    await this.page.waitForSelector(`text=Dashboard: ${cardName}`, { timeout: 10_000 });
  }
}

module.exports = { ViewRMAPage };
