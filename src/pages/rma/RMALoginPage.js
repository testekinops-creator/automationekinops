const BasePage = require('../BasePage');

/**
 * RMALoginPage - Page Object for MyConnect Login.
 * Selectors based on actual DOM at https://myconnect-acc.ekinops.com/login
 *
 * Form details:
 *   - form action="/login" method="post"
 *   - input#email  type="text"     name="email"
 *   - input#password type="password" name="password"
 *   - button.btn-submit class="btn-submit btn btn-process btn-block"
 *   - Cookie consent: must set cookieconsent_status=dismiss cookie before POST
 *
 * @extends BasePage
 */
class RMALoginPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);

    // Login form elements
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitBtn = page.locator('button[name="commit"], button.btn-submit');
    this.errorMessage = page.locator('.alert-danger, .error-message, [class*="alert-error"]');
    this.loggedInLabel = page.locator('.navbar-text, .user-info, a:has-text("Logout")');

    // Social login buttons
    this.microsoftBtn = page.locator('a:has-text("Sign in with Microsoft")');
    this.googleBtn = page.locator('a:has-text("Sign in with Google")');

    // Other links
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Your Password")');
    this.requestAccountLink = page.locator('a:has-text("Request New Account")');
  }

  /**
   * Set cookie consent cookie programmatically.
   * The app blocks login with "Please accept the cookie consent to proceed."
   * if this cookie is not set.
   */
  async setCookieConsent() {
    const baseUrl = this.page.context()._options?.baseURL || 'https://myconnect-acc.ekinops.com';
    const url = new URL(baseUrl);
    await this.page.context().addCookies([
      {
        name: 'cookieconsent_status',
        value: 'dismiss',
        domain: url.hostname,
        path: '/',
        httpOnly: false,
        secure: url.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);
  }

  async goto() {
    await this.setCookieConsent();
    await this.navigate('/login');
  }

  async fillEmail(email) {
    await this.emailInput.click();
    await this.emailInput.fill('');
    await this.emailInput.type(email, { delay: 10 });
  }

  async fillPassword(password) {
    await this.passwordInput.click();
    await this.passwordInput.fill('');
    await this.passwordInput.type(password, { delay: 10 });
  }

  async clickSubmit() {
    await this.submitBtn.click();
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
    const logoutBtn = this.page.locator('a:has-text("Logout"), a[href*="logout"]').first();
    try {
      // Try to force click it even if it's hidden in a dropdown menu
      await logoutBtn.click({ force: true, timeout: 5_000 });
    } catch {
      // If no logout link found or click fails, navigate directly to logout URL
      await this.page.goto('/core/login/logout');
    }
  }

  async isLoggedIn() {
    return !this.page.url().includes('/login');
  }

  async getErrorText() {
    return await this.errorMessage.first().textContent();
  }

  async expectRedirectedToLogin() {
    await this.page.waitForURL(/\/login/, { timeout: 10_000 });
  }
}

module.exports = { RMALoginPage };
