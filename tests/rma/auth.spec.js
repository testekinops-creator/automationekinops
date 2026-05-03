// @ts-check
/**
 * tests/rma/auth.spec.js
 * Authentication Tests — Login / Logout / Session (9 tests)
 */
const { test, expect } = require('@playwright/test');
const { RMALoginPage } = require('../../src/pages/rma/RMALoginPage');
const { USERS, ROUTES } = require('../../src/helpers/Constants');

test.describe('Authentication @auth', () => {

  test.describe('TC-AUTH-001 | Valid Login — All User Roles', () => {
    const roleTests = [
      { label: 'Admin User', user: USERS.adminUser },
      { label: 'RMA Admin', user: USERS.rmaAdmin },
      { label: 'Repair Engineer', user: USERS.repairEngineer },
      { label: 'Repair Watcher', user: USERS.repairWatcher },
      { label: 'Customer One', user: USERS.customerOne },
      { label: 'Customer Two', user: USERS.customerTwo },
    ];

    for (const { label, user } of roleTests) {
      test(`${label} can log in with valid credentials @smoke`, async ({ page }) => {
        const loginPage = new RMALoginPage(page);
        await loginPage.goto();
        await loginPage.fillEmail(user.email);
        await loginPage.fillPassword(user.password);
        await loginPage.clickSubmit();

        await expect(page).not.toHaveURL(/\/login/);
        const error = page.locator('.alert-danger, [class*="error-message"]');
        await expect(error).not.toBeVisible();
      });
    }
  });

  test.describe('TC-AUTH-002 | Invalid Login Scenarios', () => {
    test('Wrong password shows error message', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.fillEmail(USERS.rmaAdmin.email);
      await loginPage.fillPassword('WrongPassword!99');
      await loginPage.clickSubmit();

      await expect(page).toHaveURL(/\/login/);
      const error = page.locator('[class*="error"], .alert-danger, [class*="alert"]').first();
      await expect(error).toBeVisible();
    });

    test('Non-existent email shows error message', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.fillEmail('doesnotexist@rma.com');
      await loginPage.fillPassword('AnyPassword@123');
      await loginPage.clickSubmit();
      await expect(page).toHaveURL(/\/login/);
    });

    test('Empty email and password — form validates before submission', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.clickSubmit();
      await expect(page).toHaveURL(/\/login/);
    });

    test('Empty password field — blocked from login', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.fillEmail(USERS.rmaAdmin.email);
      await loginPage.clickSubmit();
      await expect(page).toHaveURL(/\/login/);
    });

    test('SQL injection in email field — no system error @security', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.fillEmail("' OR '1'='1' --");
      await loginPage.fillPassword("' OR '1'='1'");
      await loginPage.clickSubmit();

      await expect(page).toHaveURL(/\/login/);
      const body = page.locator('body');
      await expect(body).not.toContainText('SQL');
      await expect(body).not.toContainText('syntax error');
    });

    test('XSS payload in email field — not executed @security', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();

      let alertFired = false;
      page.on('dialog', async (dialog) => { alertFired = true; await dialog.dismiss(); });

      await loginPage.fillEmail('<script>alert("XSS")</script>');
      await loginPage.fillPassword('any');
      await loginPage.clickSubmit();

      expect(alertFired).toBe(false);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('TC-AUTH-003 | Session Management', () => {
    test('Unauthenticated user cannot access RMA routes directly @security', async ({ page }) => {
      const restrictedRoutes = ['/rma', '/rma/add', '/rma/requests', '/rma/factory-receive', '/rma/factory-insert'];

      for (const route of restrictedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const url = page.url();
        const isBlocked = url.includes('/login') || url.includes('/unauthorized');
        expect(isBlocked, `Route ${route} should be protected`).toBe(true);
      }
    });

    test('Logout clears session and redirects to login', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.login(USERS.rmaAdmin);
      await expect(page).not.toHaveURL(/\/login/);
      await loginPage.logout();
      await expect(page).toHaveURL(/\/login/);
      await page.goto('/rma');
      await expect(page).toHaveURL(/\/login/);
    });

    test('Session persists across page refreshes', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.login(USERS.rmaAdmin);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
    });
  });
});
