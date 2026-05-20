/* eslint-env browser */
const { expect } = require('@playwright/test');
const BasePage = require('../BasePage');

/**
 * RMADashboardPage - Page Object for RMA Dashboard.
 * Selectors based on actual DOM at https://myconnect-acc.ekinops.com/rma/dashboard/
 * @extends BasePage
 */
class RMADashboardPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    // Page heading — "RMA Requests" heading with "RMA Dashboard" subtitle
    this.pageHeading = page.locator('h2, h1').filter({ hasText: /RMA Requests/i }).first();
    this.pageSubtitle = page.locator('text=RMA Dashboard').first();
    this.introText = page.locator('text=/comprehensive overview/i').first();

    // KPI Card helper — each card lives in a div.bubble-box container
    this._cardRoot = (title) =>
      page.locator('div.bubble-box')
        .filter({ hasText: title })
        .first();

    // Employee KPI Cards (exact titles from the live application)
    this.cards = {
      repairInProgress: this._cardRoot('RMA Repair In Progress'),
      pendingAccept: this._cardRoot('RMA - Pending Accept'),
      inProgressOver30: this._cardRoot('In Progress More Than 30 Days'),
      acceptedNotReceived: this._cardRoot('Accepted & Not Received'),
      submittedMore3Times: this._cardRoot('Submitted More Than 3 Times'),
      repairedNotClosed: this._cardRoot('Repaired But Not Closed'),
      // Customer cards
      awaitingDevice: this._cardRoot('Awaiting Device'),
      repairedCustomer: this._cardRoot('RMA Repaired'),
    };

    // Left sidebar navigation — actual text from the live application
    this.sidebar = {
      dashboard: page.locator('.sidebar a, nav a, .left-panel a').filter({ hasText: /^Dashboard$/i }).first(),
      rmaList: page.locator('.sidebar a, nav a, .left-panel a').filter({ hasText: /^RMA List$/i }).first(),
      submitRma: page.locator('.sidebar a, nav a, .left-panel a').filter({ hasText: /Submit RMA Request/i }).first(),
      factoryInsert: page.locator('.sidebar a, nav a, .left-panel a').filter({ hasText: /Factory Insert RMA/i }).first(),
      factoryReceive: page.locator('.sidebar a, nav a, .left-panel a').filter({ hasText: /Factory Receive RMA/i }).first(),
      manageAddress: page.locator('.sidebar a, nav a, .left-panel a').filter({ hasText: /Manage Address/i }).first(),
      standardizedFaults: page.locator('.sidebar a, nav a, .left-panel a').filter({ hasText: /Standardized Faults/i }).first(),
    };

    // Top navigation bar
    this.topNav = {
      home: page.locator('.navbar a[href="/home"], .nav-link[href="/home"]').first(),
      salesforce: page.locator('.navbar a, .nav-link').filter({ hasText: /Salesforce/i }).first(),
      extranet: page.locator('.navbar a, .nav-link').filter({ hasText: /Extranet/i }).first(),
      rmaDropdown: page.locator('.navbar a, .nav-link').filter({ hasText: /RMA.*Access Product/i }).first(),
      documentCenter: page.locator('.navbar a, .nav-link').filter({ hasText: /Document Center/i }).first(),
      logout: page.locator('a:has-text("Logout")'),
    };
  }

  async goto() {
    await this.navigate('/rma/dashboard/');
  }

  async clickCard(cardName) {
    const card = this._cardRoot(cardName);
    await card.waitFor({ state: 'visible', timeout: 10_000 });
    // The card's <a> wraps all content (href="#", triggers JS/form POST)
    const link = card.locator('a').first();
    const linkVisible = await link.isVisible({ timeout: 3000 }).catch(() => false);
    if (linkVisible) {
      await link.click();
    } else {
      // Fallback: click the card itself
      await card.click();
    }
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async getCardCount(cardName) {
    const card = this._cardRoot(cardName);
    // Count bubble is div.dashboard-bubble (e.g. <div class="dashboard-bubble bubble-blue">15</div>)
    const bubble = card.locator('div.dashboard-bubble').first();
    const text = await bubble.textContent();
    return parseInt(text?.trim() ?? '0', 10);
  }

  async getCardBubbleColor(cardName) {
    const card = this._cardRoot(cardName);
    const bubble = card.locator('div.dashboard-bubble').first();
    return bubble.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  }

  async expectBubbleColor(cardName, expectedColor) {
    const card = this._cardRoot(cardName);
    const bubble = card.locator('div.dashboard-bubble').first();
    // Valid classes in DOM are bubble-grey, bubble-blue, bubble-red, bubble-green
    await expect(bubble).toHaveClass(new RegExp(`bubble-${expectedColor}`, 'i'));
  }

  async isSidebarItemVisible(itemKey) {
    return this.sidebar[itemKey].isVisible();
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
