/**
 * helpers/rmaAuthHelper.js
 * Reusable login helpers for RMA Playwright tests.
 */
const { ROUTES } = require('./Constants');
const path = require('path');

/**
 * Directory where cached storageState JSON files are stored.
 * Each role gets its own file: .auth/<roleKey>.json
 */
const STORAGE_STATE_DIR = path.resolve(__dirname, '..', '..', '.auth');

/**
 * Get the absolute path to a role's cached storageState JSON file.
 * Use this in test.use({ storageState: ... }) or playwright.config.js projects.
 *
 * @param {string} roleKey - Key from USERS (e.g., 'rmaAdmin', 'customerOne')
 * @returns {string} Absolute path to the .auth/<roleKey>.json file
 *
 * @example
 *   test.use({ storageState: getStorageStatePath('customerOne') });
 */
function getStorageStatePath(roleKey) {
  return path.join(STORAGE_STATE_DIR, `${roleKey}.json`);
}

/**
 * Set the cookie consent cookie directly (bypasses the banner entirely).
 * The CookieConsent library (cc.js) sets a cookie named "cookieconsent_status"
 * with value "dismiss" when the user clicks "Allow Cookies".
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} baseUrl - The base URL for the cookie domain
 */
async function setCookieConsent(page, baseUrl) {
  const url = new URL(baseUrl);
  await page.context().addCookies([
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

/**
 * Perform a single login attempt.
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password: string }} user
 * @returns {Promise<boolean>} true if login succeeded
 */
async function _attemptLogin(page, user) {
  try {
    await page.goto(process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.context().clearCookies();
    await setCookieConsent(page, process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com');
    await page.goto(ROUTES.login, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const emailInput = page.locator('#email');
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.type(user.email, { delay: 10 });

    const passwordInput = page.locator('#password');
    await passwordInput.click();
    await passwordInput.fill('');
    await passwordInput.type(user.password, { delay: 10 });

    const submitBtn = page.locator('button.btn-submit');
    await submitBtn.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 });

    return !page.url().includes('/login');
  } catch (error) {
    console.warn(`Login step failed: ${error.message.split('\n')[0]}`);
    return false;
  }
}

/**
 * Login as a specific user with retry logic to handle server rate-limiting.
 * Sets cookie consent programmatically to avoid banner interference.
 *
 * Retries up to 3 times with exponential backoff (2s, 4s, 8s).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password: string }} user
 */
async function loginAs(page, user) {
  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const success = await _attemptLogin(page, user);
    if (success) {return;}

    if (attempt < MAX_RETRIES) {
      const backoff = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s
      console.warn(`⚠️  Login attempt ${attempt} failed for ${user.email} — retrying in ${backoff}ms`);
      await page.waitForTimeout(backoff);
    }
  }

  throw new Error(
    `Login failed for user: ${user.email} — still on login page after ${MAX_RETRIES} attempts (possible server rate-limiting)`
  );
}

/**
 * Navigate to RMA dashboard section after login.
 * @param {import('@playwright/test').Page} page
 */
async function navigateToRMA(page) {
  await page.goto(ROUTES.rmaDashboard, { waitUntil: 'networkidle' });
}

/**
 * Check if the current user can access a given route.
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @returns {Promise<boolean>}
 */
async function canAccess(page, route) {
  const response = await page.goto(route, { waitUntil: 'networkidle' });
  const status = response?.status() ?? 200;
  const url = page.url();
  return status < 400 && !url.includes('/login') && !url.includes('/unauthorized') && !url.includes('/403');
}

module.exports = { loginAs, navigateToRMA, canAccess, setCookieConsent, getStorageStatePath };
