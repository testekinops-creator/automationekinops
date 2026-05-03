const BasePage = require('../BasePage');

/**
 * RMALoginPage - Page Object for MyConnect Login.
 * @extends BasePage
 */
class RMALoginPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    this.emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    this.errorMessage = page.locator('.error-message, .alert-danger, [class*="error"], [class*="alert"]');
    this.loggedInLabel = page.locator('[class*="user-name"], [class*="username"], .nav-user, header .user');
  }

  async goto() {
    await this.navigate('/login');
  }

  async fillEmail(email) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password) {
    await this.passwordInput.fill(password);
  }

  async clickSubmit() {
    await this.submitBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Full login flow.
   * @param {{ email: string, password: string }} user
   */
  async login(user) {
    await this.goto();
    await this.fillEmail(user.email);
    await this.fillPassword(user.password);
    await this.clickSubmit();
  }

  async logout() {
    const logoutBtn = this.page.locator(
      'a:has-text("Logout"), a:has-text("Sign out"), button:has-text("Logout"), [href*="logout"]'
    );
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async isLoggedIn() {
    return !this.page.url().includes('/login');
  }

  async getErrorText() {
    return await this.errorMessage.textContent();
  }

  async expectRedirectedToLogin() {
    await this.page.waitForURL(/\/login/, { timeout: 10_000 });
  }
}

module.exports = { RMALoginPage };
