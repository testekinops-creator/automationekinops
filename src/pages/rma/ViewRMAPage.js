/* eslint-env browser */
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
    return this.tableRows.count();
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
    return badge.evaluate((el) => ({
      bg: window.getComputedStyle(el).backgroundColor,
      text: window.getComputedStyle(el).color,
    }));
  }

  async clickViewRmaAction(rmaId) {
    const row = await this.getRowByRmaId(rmaId);
    // Action column has an icon/button at the end of each row
    const actionBtn = row.locator('td:last-child a, td:last-child button, td:last-child i').first();
    await actionBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickRmaIdLink(rmaId) {
    // RMA IDs are clickable buttons like "RMA-23"
    const rmaLink = this.page.locator(`button:has-text("${rmaId}"), a:has-text("${rmaId}")`).first();
    await rmaLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async filterRmaList({ status, keyword } = {}) {
    console.log(`    [filterRmaList] Starting filter with status="${status || ''}", keyword="${keyword || ''}"`);
    // 1. Click Filter Data to open the panel
    await this.filterDataBtn.click();
    await this.page.waitForTimeout(500);

    // 2. Check if the Reset button is visible, click it to clear stale filter states
    const resetBtn = this.page.locator('input[value="Reset"], input[name="reset"]').first();
    const resetVisible = await resetBtn.isVisible().catch(() => false);
    if (resetVisible) {
      console.log(`    [filterRmaList] Reset button visible. Clicking to clear filters.`);
      await resetBtn.click();
      await this.page.waitForLoadState('domcontentloaded');
      // After Reset, the filter panel closes, so we must click Filter Data again to re-open it
      await this.filterDataBtn.click();
      await this.page.waitForTimeout(500);
    }

    // 3. Select Status from the Select2 dropdown if provided
    if (status) {
      console.log(`    [filterRmaList] Selecting status: "${status}"`);
      // Find the select2 input field with placeholder "Select Status"
      const statusSearchField = this.page.locator('.select2-search__field[placeholder="Select Status"]').first();
      await statusSearchField.waitFor({ state: 'visible', timeout: 5000 });
      await statusSearchField.click();
      await this.page.waitForTimeout(300);

      // Now click the option inside the body dropdown
      const option = this.page.locator('.select2-results__option').filter({ hasText: new RegExp(`^${status}$`, 'i') }).first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click();
      await this.page.waitForTimeout(300);
    }

    // 4. Fill Keyword with serial number if provided
    if (keyword) {
      console.log(`    [filterRmaList] Filling keyword: "${keyword}"`);
      const keywordInput = this.page.locator('input[name="keyword"]').first();
      await keywordInput.waitFor({ state: 'visible', timeout: 5000 });
      await keywordInput.fill(keyword);
    }

    // 5. Click the Apply button (ID filterSubmit)
    const applyBtn = this.page.locator('#filterSubmit').first();
    await applyBtn.waitFor({ state: 'visible', timeout: 3000 });
    await applyBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    console.log(`    [filterRmaList] Applied filters. URL: ${this.page.url()}`);
  }

  async filterByStatus(status) {
    await this.filterRmaList({ status });
  }

  async getDashboardFilterLabel() {
    return this.dashboardFilter.textContent();
  }

  async expectDashboardFilter(cardName) {
    await this.page.waitForSelector(`text=Dashboard: ${cardName}`, { timeout: 10_000 });
  }

  // ─── Detail Page: Action Buttons (Print / Consignment / Email) ────────────

  /** Print button on the RMA detail page */
  get printBtn() {
    return this.page.locator('a[href*="printpdf"]').first();
  }

  /** Print Consign. Note button on the RMA detail page */
  // Differentiated by href, not title (both share same title text)
  get printConsignNoteBtn() {
    return this.page.locator('a[href*="printConsignmentPdf"]').first();
  }

  /** EMail Consign. Note button on the RMA detail page */
  get emailConsignNoteBtn() {
    return this.page.locator('a[href*="emailConsignmentPdf"]').first();
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
    return this.page.locator('a[data-bs-original-title="Edit"]').first();
  }

  /** Comment / Add Comment button */
  get commentBtn() {
    return this.page.locator('a[data-bs-original-title="Comment"]').first();
  }

  /** Accept action button */
  get acceptBtn() {
    return this.page.locator('a[data-bs-original-title="Accept"]').first();
  }

  /** Reject action button */
  get rejectBtn() {
    return this.page.locator('a[data-bs-original-title="Reject"]').first();
  }

  /** Receive action button */
  get receiveBtn() {
    return this.page.locator('a[data-bs-original-title="Receive"]').first();
  }

  /** Repair action button */
  get repairBtn() {
    return this.page.locator('a[data-bs-original-title="Repair"]').first();
  }

  /** On Hold action button */
  get onHoldBtn() {
    return this.page.locator('a[data-bs-original-title="On Hold"]').first();
  }

  /** Close action button (excludes modal close icons) */
  get closeActionBtn() {
    return this.page.locator('a[data-bs-original-title="Close"]').first();
  }

  /** Back button */
  // Differentiated by href, not text (more stable)
  get backBtn() {
    return this.page.locator('a[href*="closeview"]').first();
  }

  /**
   * Check visibility of ALL action buttons on the RMA detail page.
   * Returns an object map of button-name → boolean visibility.
   * Matches the View Screen matrix from the ACC Test spreadsheet.
   * @returns {Promise<Object<string, boolean>>}
   */
  async getDetailAllActionButtons() {
    return {
      edit:         this.editBtn,
      comment:      this.commentBtn,
      accept:       this.acceptBtn,
      reject:       this.rejectBtn,
      receive:      this.receiveBtn,
      repair:       this.repairBtn,
      onHold:       this.onHoldBtn,
      close:        this.closeActionBtn,
      printConsign: this.printConsignNoteBtn,
      emailConsign: this.emailConsignNoteBtn,
      print:        this.printBtn,
      back:         this.backBtn,
    };
  }

  /**
   * Click a workflow action button and return the iframe FrameLocator.
   * Workflow buttons use popup-window-link which opens an iframe overlay.
   * @param {string} buttonTitle - The data-bs-original-title value (e.g. 'Accept', 'Reject', 'Repair')
   * @returns {Promise<import('@playwright/test').FrameLocator>} The iframe FrameLocator
   */
  async openWorkflowPopup(buttonTitle) {
    const btn = this.page.locator(
      `a[data-bs-original-title="${buttonTitle}"]`
    ).first();
    await btn.click();
    // Wait for iframe overlay to appear (popup-window-link opens an iframe)
    const iframeLocator = this.page.locator('iframe#iframeWindow, iframe[src*="/rma/workflow"]').first();
    await iframeLocator.waitFor({ state: 'visible', timeout: 15000 });
    const iframe = this.page.frameLocator('iframe#iframeWindow, iframe[src*="/rma/workflow"]');
    // Wait for iframe body to load
    await iframe.locator('body').waitFor({ state: 'visible', timeout: 15000 });
    return iframe;
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
   * Reset any applied filters by navigating to ?reset=1.
   * Checks if filters are applied beyond the default "Show Only: Show All".
   */
  async resetFilters() {
    const filtersApplied = this.page.locator('.applied-filter-title, text=/Filters Applied/i').first();
    const hasFilters = await filtersApplied.isVisible().catch(() => false);
    if (hasFilters) {
      const filterText = await this.page.locator('.applied-info-list').textContent().catch(() => '');
      // If there are filters beyond "Show Only: Show All", reset
      if (filterText && !/^\s*Show Only\s*:?\s*Show All\s*$/i.test(filterText.trim())) {
        const baseUrl = this.page.url().split('?')[0];
        await this.page.goto(baseUrl + '?reset=1');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.locator('table tbody tr').first()
          .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      }
    }
  }

  async goToRmaDetailByStatus(status) {
    console.log(`    [goToRmaDetailByStatus] Target status: "${status}"`);
    // Reset any leftover filters from previous tests
    await this.resetFilters();

    // Wait for the AJAX DataTable to populate (domcontentloaded fires before table loads)
    try {
      await this.page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      console.log(`    [goToRmaDetailByStatus] Table did not populate within 15s`);
      return false;
    }

    // Use DataTable search filter to narrow results to the target status
    try {
      const searchInput = this.page.locator('.dataTables_filter input[type="search"]').first();
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill(status, { timeout: 5000 });
        // Wait for AJAX filter to reload table
        await this.page.waitForTimeout(2000);
        // Re-wait for filtered table rows
        await this.page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      }
    } catch (err) {
      console.log(`    [goToRmaDetailByStatus] Search filter failed: ${err.message}`);
    }

    const rows = this.page.locator('table tbody tr');
    const count = await rows.count().catch(() => 0);
    console.log(`    [goToRmaDetailByStatus] Total table tbody tr count: ${count}`);

    const row = this.tableRows.filter({ hasText: new RegExp(`^${status}$|\\b${status}\\b`, 'i') }).first();
    const rowCount = await row.count().catch(() => 0);
    console.log(`    [goToRmaDetailByStatus] Matching row count: ${rowCount}`);
    if (rowCount === 0) {
      // Fallback to simpler regex if word boundary fails
      const fallbackRow = this.tableRows.filter({ hasText: new RegExp(status, 'i') }).first();
      const fallbackCount = await fallbackRow.count().catch(() => 0);
      console.log(`    [goToRmaDetailByStatus] Fallback matching row count: ${fallbackCount}`);
      if (fallbackCount === 0) return false;
      return await this._clickRowLink(fallbackRow);
    }
    return await this._clickRowLink(row);
  }

  async _clickRowLink(row) {
    // Log all interactive elements inside row
    const elements = row.locator('a, button');
    const elemCount = await elements.count().catch(() => 0);
    console.log(`    [_clickRowLink] Total interactive elements (a, button) in row: ${elemCount}`);
    for (let j = 0; j < elemCount; j++) {
      const tag = await elements.nth(j).evaluate(el => el.tagName).catch(() => '');
      const text = await elements.nth(j).innerText().catch(() => '');
      const href = await elements.nth(j).getAttribute('href').catch(() => '');
      const aria = await elements.nth(j).getAttribute('aria-label').catch(() => '');
      console.log(`      Element ${j}: tag=${tag}, text="${text.trim()}", href="${href}", aria-label="${aria}"`);
    }

    const viewLink = row.locator('a[aria-label="View RMA Request"], td:last-child a, a:has-text("RMA-"), button:has-text("RMA-"), a, button').first();
    const viewLinkCount = await viewLink.count().catch(() => 0);
    console.log(`    [_clickRowLink] View link count: ${viewLinkCount}`);
    if (viewLinkCount === 0) {return false;}

    await viewLink.click();
    await this.page.waitForLoadState('domcontentloaded');
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
    return this.historyEntries.count();
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
    return entry.locator('table thead th, table th').allTextContents();
  }

  /** Navigate to first RMA detail and return success flag */
  async goToFirstRmaDetail() {
    // Wait for AJAX table to populate
    try {
      await this.page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      return false;
    }
    const viewLink = this.page.locator('a[aria-label="View RMA Request"], td:last-child a').first();
    if (await viewLink.count() === 0) {return false;}
    await viewLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    return true;
  }
}

module.exports = { ViewRMAPage };
