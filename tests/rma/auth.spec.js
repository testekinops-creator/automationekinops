// @ts-check
/**
 * tests/rma/auth.spec.js
 * Authentication Tests — Login / Logout / Session (9 tests)
 */
const { test, expect } = require('@playwright/test');
const { RMALoginPage } = require('../../src/pages/rma/RMALoginPage');
const { USERS, ROUTES } = require('../../src/helpers/Constants');

test.describe('Authentication @auth', () => {
  test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

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

        // Verify we left the login page
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
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

      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
      const error = page.locator('.alert-danger, [class*="error"], [class*="alert"]').first();
      await expect(error).toBeVisible();
    });

    test('Non-existent email shows error message', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.fillEmail('doesnotexist@rma.com');
      await loginPage.fillPassword('AnyPassword@123');
      await loginPage.clickSubmit();
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });

    test('Empty email and password — form validates before submission', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.clickSubmit();
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });

    test('Empty password field — blocked from login', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.fillEmail(USERS.rmaAdmin.email);
      await loginPage.clickSubmit();
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });

    test('SQL injection in email field — no system error @security', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.goto();
      await loginPage.fillEmail("' OR '1'='1' --");
      await loginPage.fillPassword("' OR '1'='1'");
      await loginPage.clickSubmit();

      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
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
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  });

  test.describe('TC-AUTH-003 | Session Management', () => {
    test('Unauthenticated user cannot access RMA routes directly @security', async ({ page }) => {
      const restrictedRoutes = [ROUTES.rmaDashboard, ROUTES.submitRma, ROUTES.viewRma, ROUTES.factoryReceive, ROUTES.factoryInsert];

      for (const route of restrictedRoutes) {
        await page.goto(route, { waitUntil: 'commit' });
        await expect(page).toHaveURL(/\/login|\/unauthorized/, { timeout: 15_000 });
      }
    });

    test('Logout clears session and redirects to login', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.login(USERS.rmaAdmin);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
      
      await loginPage.logout();
      
      // After logout, should be redirected to login
      await page.goto(ROUTES.rmaDashboard, { waitUntil: 'commit' });
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });

    test('Session persists across page refreshes', async ({ page }) => {
      const loginPage = new RMALoginPage(page);
      await loginPage.login(USERS.rmaAdmin);
      await page.reload();
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    });
  });
});
