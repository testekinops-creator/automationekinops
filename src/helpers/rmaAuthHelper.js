/**
 * helpers/rmaAuthHelper.js
 * Reusable login helpers for RMA Playwright tests.
 */
const { ROUTES } = require('./Constants');

/**
 * Login as a specific user and wait for navigation away from /login.
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password: string }} user
 */
async function loginAs(page, user) {
  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
  await emailInput.fill(user.email);

  // Fill password
  await page.locator('input[type="password"]').fill(user.password);

  // Submit
  await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
  await page.waitForLoadState('networkidle');

  // Verify not still on login page
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error(`Login failed for user: ${user.email} — still on login page`);
  }
}

/**
 * Navigate to RMA dashboard section after login.
 * @param {import('@playwright/test').Page} page
 */
async function navigateToRMA(page) {
  await page.goto(ROUTES.rmaDashboard);
  await page.waitForLoadState('networkidle');
}

/**
 * Check if the current user can access a given route.
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @returns {Promise<boolean>}
 */
async function canAccess(page, route) {
  const response = await page.goto(route);
  await page.waitForLoadState('networkidle');
  const status = response?.status() ?? 200;
  const url = page.url();
  return status < 400 && !url.includes('/login') && !url.includes('/unauthorized') && !url.includes('/403');
}

module.exports = { loginAs, navigateToRMA, canAccess };
