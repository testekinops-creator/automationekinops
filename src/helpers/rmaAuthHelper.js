/**
 * helpers/rmaAuthHelper.js
 * Reusable login helpers for RMA Playwright tests.
 */
const { ROUTES } = require('./Constants');
const path = require('path');
const config = require('./config');

/**
 * Directory where cached storageState JSON files are stored.
 * Each role gets its own file: .auth/<roleKey>.json
 */
const STORAGE_STATE_DIR = path.resolve(__dirname, '..', '..', '.auth');

/**
 * Get the absolute path to a role's cached storageState JSON file.
 * @param {string} roleKey - Key from USERS (e.g., 'rmaAdmin', 'customerOne')
 * @returns {string} Absolute path to the .auth/<roleKey>.json file
 */
function getStorageStatePath(roleKey) {
  return path.join(STORAGE_STATE_DIR, `${roleKey}.json`);
}

/**
 * Set the cookie consent cookie directly (bypasses the banner entirely).
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
    await page.goto(config.BASE_URL || 'https://myconnect-acc.ekinops.com/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.context().clearCookies();
    await setCookieConsent(page, config.BASE_URL || 'https://myconnect-acc.ekinops.com');
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
 * Login as a specific user with a strict 25-second wait to bypass app lockouts.
 * The application imposes a ~24-second lockout on repeated failed/rapid logins.
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password: string }} user
 */
async function loginAs(page, user) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const success = await _attemptLogin(page, user);
    if (success) { return; }

    if (attempt < MAX_RETRIES) {
      // Wait 25 seconds to bypass the application's ~24-second login lockout
      console.warn(`⚠️  Login attempt ${attempt} failed for ${user.email} — waiting 25 seconds for lockout to clear...`);
      await page.waitForTimeout(25000);
    }
  }

  throw new Error(
    `Login failed for user: ${user.email} — still on login page after ${MAX_RETRIES} attempts.`
  );
}

/**
 * Switch role by loading cached storageState cookies (FAST — no UI login).
 * The auth.setup.js phase caches sessions to .auth/<roleKey>.json.
 * This function loads those cookies into the current page context.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password: string }} user - The USERS.xxx object
 */
async function switchRole(page, user) {
  const fs = require('fs');
  const { USERS } = require('./Constants');

  // Reverse-lookup: find the roleKey from the user object
  const roleKey = Object.entries(USERS).find(([, u]) => u.email === user.email)?.[0];
  if (!roleKey) {
    // Fallback to UI login if user not in USERS map
    console.warn(`switchRole: unknown user ${user.email} — falling back to loginAs()`);
    return loginAs(page, user);
  }

  const storagePath = getStorageStatePath(roleKey);
  if (!fs.existsSync(storagePath)) {
    // Fallback to UI login if no cached session
    console.warn(`switchRole: no cached session at ${storagePath} — falling back to loginAs()`);
    return loginAs(page, user);
  }

  // Load the cached session
  const storageState = JSON.parse(fs.readFileSync(storagePath, 'utf8'));

  // Clear existing cookies and set the cached ones
  await page.context().clearCookies();
  if (storageState.cookies && storageState.cookies.length > 0) {
    await page.context().addCookies(storageState.cookies);
  }

  // Reload the current page with the new session (or go to dashboard)
  const currentUrl = page.url();
  const targetUrl = (currentUrl && !currentUrl.includes('about:blank') && !currentUrl.includes('/login'))
    ? currentUrl
    : ROUTES.rmaDashboard;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
}

/**
 * Navigate to RMA dashboard section after login.
 * @param {import('@playwright/test').Page} page
 */
async function navigateToRMA(page) {
  await page.goto(ROUTES.rmaDashboard, { waitUntil: 'domcontentloaded' });
}

/**
 * Check if the current user can access a given route.
 * Returns false if: HTTP error, redirected to login/403/unauthorized, or
 * redirected away from the requested route (e.g. customer → dashboard).
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @returns {Promise<boolean>}
 */
async function canAccess(page, route) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  const status = response?.status() ?? 200;
  const url = page.url();
  // Blocked if: HTTP error, redirected to login/403, OR redirected away from the requested route
  const isErrorPage = url.includes('/login') || url.includes('/unauthorized') || url.includes('/403');
  const wasRedirected = !url.includes(route.replace(/\/$/, '')); // strip trailing slash for comparison
  return status < 400 && !isErrorPage && !wasRedirected;
}

module.exports = { loginAs, switchRole, navigateToRMA, canAccess, setCookieConsent, getStorageStatePath };
