const BasePage = require('../BasePage');

/**
 * RMADashboardPage - Page Object for RMA Dashboard.
 * @extends BasePage
 */
class RMADashboardPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    this.pageHeading = page.locator('h2, h1').filter({ hasText: /RMA Requests/i }).first();
    this.pageSubtitle = page.locator('text=RMA Dashboard').first();
    this.introText = page.locator('text=comprehensive overview').first();

    this._cardRoot = (title) =>
      page.locator('[class*="card"], [class*="kpi"], .dashboard-item, div')
        .filter({ hasText: title })
        .first();

    this.cards = {
      pendingAccept: this._cardRoot('RMA - Pending Accept'),
      inProgress: this._cardRoot('RMA In Progress').first(),
      inProgressOver30: this._cardRoot('More than 30 days'),
      submittedMore3Times: this._cardRoot('More than 3 times'),
      repairedNotClosed: this._cardRoot('Repaired but not closed'),
      acceptedNotReceived: this._cardRoot('Accepted & Not Received'),
      awaitingDevice: this._cardRoot('Awaiting Device'),
      repairedCustomer: this._cardRoot('RMA Repaired'),
    };

    this.sidebar = {
      dashboard: page.locator('nav a, .sidebar a').filter({ hasText: /^Dashboard$/i }).first(),
      submitRma: page.locator('nav a, .sidebar a').filter({ hasText: /Submit RMA/i }).first(),
      viewRma: page.locator('nav a, .sidebar a').filter({ hasText: /View RMA/i }).first(),
      factoryInsert: page.locator('nav a, .sidebar a').filter({ hasText: /Factory Insert/i }).first(),
      factoryReceive: page.locator('nav a, .sidebar a').filter({ hasText: /Factory Receive/i }).first(),
      manageAddress: page.locator('nav a, .sidebar a').filter({ hasText: /Manage Address/i }).first(),
    };
  }

  async goto() {
    await this.navigate('/rma');
  }

  async clickCard(cardName) {
    const card = this._cardRoot(cardName);
    await card.waitFor({ state: 'visible', timeout: 10_000 });
    await card.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getCardCount(cardName) {
    const card = this._cardRoot(cardName);
    const bubble = card.locator('[class*="count"], [class*="badge"], [class*="bubble"], span').first();
    const text = await bubble.textContent();
    return parseInt(text?.trim() ?? '0', 10);
  }

  async getCardBubbleColor(cardName) {
    const card = this._cardRoot(cardName);
    const bubble = card.locator('[class*="count"], [class*="badge"], [class*="bubble"]').first();
    return await bubble.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  }

  async isSidebarItemVisible(itemKey) {
    return await this.sidebar[itemKey].isVisible();
  }

  async expectPageLoaded() {
    await this.pageHeading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async expectCardClickable(cardName) {
    const card = this._cardRoot(cardName);
    await card.waitFor({ state: 'visible' });
    const cursor = await card.evaluate((el) => window.getComputedStyle(el).cursor);
    return cursor !== 'not-allowed';
  }
}

module.exports = { RMADashboardPage };
