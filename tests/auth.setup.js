// @ts-check
/**
 * tests/auth.setup.js
 * Playwright Setup Project — Authenticates once per user role and saves
 * the session cookies to .auth/<roleName>.json via storageState.
 *
 * This eliminates per-test UI logins, preventing server rate-limiting.
 * New roles: add an entry to ROLES_TO_CACHE below.
 */
const { test: setup } = require('@playwright/test');
const { loginAs } = require('../src/helpers/rmaAuthHelper');
const { USERS } = require('../src/helpers/Constants');
const path = require('path');

/**
 * Roles to cache — each entry produces one UI login and one .auth/<key>.json file.
 * To add a new role in the future, just add a row here.
 */
const ROLES_TO_CACHE = Object.entries(USERS).map(([key, user]) => ({ key, user }));

for (const { key, user } of ROLES_TO_CACHE) {
  setup(`authenticate as ${key} (${user.email})`, async ({ page }) => {
    const storagePath = path.resolve(__dirname, '..', '.auth', `${key}.json`);

    // Perform a real UI login
    await loginAs(page, user);

    // Verify we are logged in (not on /login page)
    const url = page.url();
    if (url.includes('/login')) {
      throw new Error(`storageState setup failed for ${key}: still on login page`);
    }

    // Save the authenticated session to disk
    await page.context().storageState({ path: storagePath });
    console.log(`  ✅ Cached session for ${key} → ${storagePath}`);

    // Cooldown between logins to avoid triggering rate-limiter during setup
    await page.waitForTimeout(3000);
  });
}
