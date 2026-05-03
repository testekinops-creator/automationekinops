/**
 * BasePage - Abstract base class for all Page Object Models.
 *
 * Provides common page interaction methods that all page objects inherit.
 * Every page class in the framework should extend BasePage.
 *
 * @example
 * class LoginPage extends BasePage {
 *   constructor(page) {
 *     super(page);
 *   }
 * }
 */
class BasePage {
  /**
   * @param {import('@playwright/test').Page} page - Playwright page instance
   */
  constructor(page) {
    /** @type {import('@playwright/test').Page} */
    this.page = page;
  }

  /**
   * Navigate to a specific path relative to baseURL.
   * @param {string} [path='/'] - URL path to navigate to
   * @returns {Promise<void>}
   */
  async navigate(path = '/') {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Get the current page title.
   * @returns {Promise<string>} Page title
   */
  async getTitle() {
    return await this.page.title();
  }

  /**
   * Get the current page URL.
   * @returns {string} Current URL
   */
  getCurrentURL() {
    return this.page.url();
  }

  /**
   * Wait for page to reach network idle state.
   * @param {number} [timeout=10000] - Maximum wait time in ms
   * @returns {Promise<void>}
   */
  async waitForPageLoad(timeout = 10_000) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Get element by data-testid attribute (preferred locator strategy).
   * @param {string} testId - The data-testid value
   * @returns {import('@playwright/test').Locator}
   */
  getByTestId(testId) {
    return this.page.getByTestId(testId);
  }

  /**
   * Get element by ARIA role.
   * @param {string} role - ARIA role name
   * @param {object} [options] - Additional options (e.g., { name: 'Submit' })
   * @returns {import('@playwright/test').Locator}
   */
  getByRole(role, options) {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by label text.
   * @param {string} label - Label text
   * @returns {import('@playwright/test').Locator}
   */
  getByLabel(label) {
    return this.page.getByLabel(label);
  }

  /**
   * Get element by visible text content.
   * @param {string} text - Text content to match
   * @param {object} [options] - Additional options (e.g., { exact: true })
   * @returns {import('@playwright/test').Locator}
   */
  getByText(text, options) {
    return this.page.getByText(text, options);
  }

  /**
   * Get element by placeholder text.
   * @param {string} placeholder - Placeholder text
   * @returns {import('@playwright/test').Locator}
   */
  getByPlaceholder(placeholder) {
    return this.page.getByPlaceholder(placeholder);
  }

  /**
   * Wait for a specific element to be visible.
   * @param {import('@playwright/test').Locator} locator - Element locator
   * @param {number} [timeout=10000] - Maximum wait time in ms
   * @returns {Promise<void>}
   */
  async waitForElement(locator, timeout = 10_000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Scroll an element into the viewport.
   * @param {import('@playwright/test').Locator} locator - Element locator
   * @returns {Promise<void>}
   */
  async scrollToElement(locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Get the inner text of an element.
   * @param {import('@playwright/test').Locator} locator - Element locator
   * @returns {Promise<string>} Element inner text
   */
  async getText(locator) {
    return await locator.innerText();
  }

  /**
   * Check if an element is visible on the page.
   * @param {import('@playwright/test').Locator} locator - Element locator
   * @returns {Promise<boolean>} True if visible
   */
  async isVisible(locator) {
    return await locator.isVisible();
  }

  /**
   * Check if an element is enabled (not disabled).
   * @param {import('@playwright/test').Locator} locator - Element locator
   * @returns {Promise<boolean>} True if enabled
   */
  async isEnabled(locator) {
    return await locator.isEnabled();
  }

  /**
   * Take a screenshot with a descriptive name.
   * @param {string} name - Screenshot filename (without extension)
   * @returns {Promise<Buffer>} Screenshot buffer
   */
  async screenshot(name) {
    return await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Handle browser dialog (alert, confirm, prompt).
   * @param {'accept'|'dismiss'} action - Action to take
   * @param {string} [promptText] - Text to enter for prompt dialogs
   * @returns {Promise<void>}
   */
  async handleDialog(action = 'accept', promptText) {
    this.page.once('dialog', async (dialog) => {
      if (action === 'accept') {
        await dialog.accept(promptText);
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Wait for a specific URL pattern.
   * @param {string|RegExp} urlPattern - URL string or regex pattern
   * @param {number} [timeout=10000] - Maximum wait time in ms
   * @returns {Promise<void>}
   */
  async waitForURL(urlPattern, timeout = 10_000) {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  /**
   * Press a keyboard key.
   * @param {string} key - Key to press (e.g., 'Enter', 'Tab', 'Escape')
   * @returns {Promise<void>}
   */
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  /**
   * Reload the current page.
   * @returns {Promise<void>}
   */
  async reload() {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Go back in browser history.
   * @returns {Promise<void>}
   */
  async goBack() {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }
}

module.exports = BasePage;
