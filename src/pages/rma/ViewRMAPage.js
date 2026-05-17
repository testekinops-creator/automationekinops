const BasePage = require('../BasePage');

/**
 * ViewRMAPage - Page Object for View / List RMA Requests.
 * Selectors based on actual DOM at https://myconnect-acc.ekinops.com/rma/list
 * @extends BasePage
 */
class ViewRMAPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    // Page heading — "RMA Requests" with "View RMA Requests" subtitle
    this.pageHeading = page.locator('h2, h1').filter({ hasText: /RMA Requests/i }).first();
    this.pageSubtitle = page.locator('text=/View RMA Requests/i').first();

    // Filter & Sort banners
    this.filterBanner = page.locator('text=/Filters Applied/i').first();
    this.dashboardFilter = page.locator('text=/Dashboard:/i').first();
    this.sortOrder = page.locator('text=/Applied Sort Order/i').first();

    // Action buttons at top — actual text from the live application
    this.submitRmaBtn = page.locator('button:has-text("Submit RMA Request"), a:has-text("Submit RMA Request")');
    this.filterDataBtn = page.locator('button:has-text("Filter Data"), a:has-text("Filter Data")');

    // RMA table
    this.tableRows = page.locator('table tbody tr');
    this.tableHeaders = page.locator('table thead th');
    this.noResults = page.locator('text=/no records/i, text=/no results/i, text=/no data/i');

    // Pagination — "Currently Viewing Page X of Y"
    this.paginationInfo = page.locator('text=/Currently Viewing Page/i');
  }

  async goto() {
    await this.navigate('/rma/list');
  }

  async getRowCount() {
    return await this.tableRows.count();
  }

  async getRowByRmaId(rmaId) {
    return this.page.locator(`tr:has-text("${rmaId}")`).first();
  }

  async getStatusOfRma(rmaId) {
    const row = await this.getRowByRmaId(rmaId);
    const statusCell = row.locator('[class*="badge"], [class*="status"], span').filter({
      hasText: /Submitted|Accepted|Received|On Hold|Repaired|Rejected|Closed/i,
    }).first();
    return (await statusCell.textContent())?.trim();
  }

  async getStatusBadgeColor(rmaId) {
    const row = await this.getRowByRmaId(rmaId);
    const badge = row.locator('[class*="badge"], [class*="status-badge"], [class*="status"], span').filter({
      hasText: /Submitted|Accepted|Received|On Hold|Repaired|Rejected|Closed/i,
    }).first();
    return await badge.evaluate((el) => ({
      bg: window.getComputedStyle(el).backgroundColor,
      text: window.getComputedStyle(el).color,
    }));
  }

  async clickViewRmaAction(rmaId) {
    const row = await this.getRowByRmaId(rmaId);
    // Action column has an icon/button at the end of each row
    const actionBtn = row.locator('td:last-child a, td:last-child button, td:last-child i').first();
    await actionBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickRmaIdLink(rmaId) {
    // RMA IDs are clickable buttons like "RMA-23"
    const rmaLink = this.page.locator(`button:has-text("${rmaId}"), a:has-text("${rmaId}")`).first();
    await rmaLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status) {
    await this.filterDataBtn.click();
    await this.page.waitForTimeout(500);
    await this.page.locator(`option:has-text("${status}"), label:has-text("${status}")`).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async getDashboardFilterLabel() {
    return await this.dashboardFilter.textContent();
  }

  async expectDashboardFilter(cardName) {
    await this.page.waitForSelector(`text=Dashboard: ${cardName}`, { timeout: 10_000 });
  }

  // ─── Detail Page: Action Buttons (Print / Consignment / Email) ────────────

  /** Print button on the RMA detail page */
  get printBtn() {
    return this.page.locator('a, button').filter({ hasText: /Print/i }).filter({ hasNotText: /Consign/i }).first();
  }

  /** Print Consign. Note button on the RMA detail page */
  get printConsignNoteBtn() {
    return this.page.locator('a, button').filter({ hasText: /Print Consign/i }).first();
  }

  /** EMail Consign. Note button on the RMA detail page */
  get emailConsignNoteBtn() {
    return this.page.locator('a, button').filter({ hasText: /EMail Consign|Email Consign/i }).first();
  }

  /**
   * Check visibility of all three action buttons on the detail page.
   * @returns {Promise<{print: boolean, printConsign: boolean, emailConsign: boolean}>}
   */
  async getDetailActionButtonVisibility() {
    return {
      print: await this.printBtn.isVisible().catch(() => false),
      printConsign: await this.printConsignNoteBtn.isVisible().catch(() => false),
      emailConsign: await this.emailConsignNoteBtn.isVisible().catch(() => false),
    };
  }

  // ─── Detail Page: Workflow Action Buttons ─────────────────────────────────

  /** Edit button on the RMA detail page */
  get editBtn() {
    return this.page.locator('a, button').filter({ hasText: /^Edit$/i }).first();
  }

  /** Comment / Add Comment button */
  get commentBtn() {
    return this.page.locator('a, button').filter({ hasText: /Comment/i }).first();
  }

  /** Accept action button */
  get acceptBtn() {
    return this.page.locator('a, button').filter({ hasText: /^Accept$/i }).first();
  }

  /** Reject action button */
  get rejectBtn() {
    return this.page.locator('a, button').filter({ hasText: /^Reject$/i }).first();
  }

  /** Receive action button */
  get receiveBtn() {
    return this.page.locator('a, button').filter({ hasText: /^Receive$/i }).first();
  }

  /** Repair action button */
  get repairBtn() {
    return this.page.locator('a, button').filter({ hasText: /^Repair$/i }).first();
  }

  /** On Hold action button */
  get onHoldBtn() {
    return this.page.locator('a, button').filter({ hasText: /On Hold/i }).first();
  }

  /** Close action button (excludes modal close icons) */
  get closeActionBtn() {
    return this.page.locator('a.btn, button.btn, a[class*="action"], button[class*="action"]').filter({ hasText: /^Close$/i }).first();
  }

  /** Back button */
  get backBtn() {
    return this.page.locator('a, button').filter({ hasText: /^Back$/i }).first();
  }

  /**
   * Check visibility of ALL action buttons on the RMA detail page.
   * Returns an object map of button-name → boolean visibility.
   * Matches the View Screen matrix from the ACC Test spreadsheet.
   * @returns {Promise<Object<string, boolean>>}
   */
  async getDetailAllActionButtons() {
    return {
      edit:         await this.editBtn.isVisible().catch(() => false),
      comment:      await this.commentBtn.isVisible().catch(() => false),
      accept:       await this.acceptBtn.isVisible().catch(() => false),
      reject:       await this.rejectBtn.isVisible().catch(() => false),
      receive:      await this.receiveBtn.isVisible().catch(() => false),
      repair:       await this.repairBtn.isVisible().catch(() => false),
      onHold:       await this.onHoldBtn.isVisible().catch(() => false),
      close:        await this.closeActionBtn.isVisible().catch(() => false),
      printConsign: await this.printConsignNoteBtn.isVisible().catch(() => false),
      emailConsign: await this.emailConsignNoteBtn.isVisible().catch(() => false),
      print:        await this.printBtn.isVisible().catch(() => false),
      back:         await this.backBtn.isVisible().catch(() => false),
    };
  }

  /**
   * Get the Email Consignment Note success message text after clicking Email CN.
   * @returns {Promise<string>} The success message text, or empty string.
   */
  async getEmailConsignmentSuccessMessage() {
    const msg = this.page.locator('.alert-success, [class*="success"]').first();
    return (await msg.textContent().catch(() => ''))?.trim() ?? '';
  }

  /**
   * Navigate to the detail page of an RMA with a specific status.
   * @param {string} status - e.g. 'Submitted', 'Accepted', 'Closed', 'Rejected'
   * @returns {Promise<boolean>} true if navigation succeeded
   */
  async goToRmaDetailByStatus(status) {
    const row = this.page.locator('tr').filter({ hasText: new RegExp(status, 'i') }).first();
    if (await row.count() === 0) return false;
    const viewLink = row.locator('a[aria-label="View RMA Request"], td:last-child a').first();
    if (await viewLink.count() === 0) return false;
    await viewLink.click();
    await this.page.waitForLoadState('networkidle');
    return true;
  }

  // ─── Detail Page: Comments & History Tabs ─────────────────────────────────


  /** Comments tab link */
  get commentsTab() {
    return this.page.locator('a[href="#tabs-comments"], a:has-text("Comments")').first();
  }

  /** History tab link */
  get historyTab() {
    return this.page.locator('a[href="#tabs-history"], a:has-text("History")').first();
  }

  /** History tab content container */
  get historyContainer() {
    return this.page.locator('#tabs-history, [id*="history"]').first();
  }

  /** Comments tab content container */
  get commentsContainer() {
    return this.page.locator('#tabs-comments, [id*="comments"]').first();
  }

  /** All history entries (each is a fieldset with legend + table) */
  get historyEntries() {
    return this.page.locator('#tabs-history fieldset, [id*="history"] fieldset');
  }

  /** Click the History tab */
  async clickHistoryTab() {
    await this.historyTab.click();
    await this.page.waitForTimeout(500);
  }

  /** Click the Comments tab */
  async clickCommentsTab() {
    await this.commentsTab.click();
    await this.page.waitForTimeout(500);
  }

  /** Get count of history entries */
  async getHistoryEntryCount() {
    return await this.historyEntries.count();
  }

  /**
   * Get the header text of a history entry (e.g. "Admin User made changes - 2026-05-08 12:14:09 EAT")
   * @param {number} index - 0-based index of the entry
   */
  async getHistoryEntryHeader(index = 0) {
    const entry = this.historyEntries.nth(index);
    const legend = entry.locator('legend').first();
    return (await legend.textContent())?.trim() ?? '';
  }

  /**
   * Get all field changes from a history entry table
   * @param {number} index - 0-based index of the entry
   * @returns {Promise<Array<{field: string, originalValue: string, newValue: string}>>}
   */
  async getHistoryEntryChanges(index = 0) {
    const entry = this.historyEntries.nth(index);
    const rows = entry.locator('table tbody tr, table tr:not(:first-child)');
    const count = await rows.count();
    const changes = [];
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      const cellCount = await cells.count();
      if (cellCount >= 3) {
        changes.push({
          field: (await cells.nth(0).textContent())?.trim() ?? '',
          originalValue: (await cells.nth(1).textContent())?.trim() ?? '',
          newValue: (await cells.nth(2).textContent())?.trim() ?? '',
        });
      }
    }
    return changes;
  }

  /**
   * Get the table headers of the first history entry
   * @returns {Promise<string[]>}
   */
  async getHistoryTableHeaders() {
    const entry = this.historyEntries.first();
    return await entry.locator('table thead th, table th').allTextContents();
  }

  /** Navigate to first RMA detail and return success flag */
  async goToFirstRmaDetail() {
    const viewLink = this.page.locator('a[aria-label="View RMA Request"], td:last-child a').first();
    if (await viewLink.count() === 0) return false;
    await viewLink.click();
    await this.page.waitForLoadState('networkidle');
    return true;
  }
}

module.exports = { ViewRMAPage };
