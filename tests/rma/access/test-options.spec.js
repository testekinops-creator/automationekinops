const { test } = require('@playwright/test');
const { allure } = require('allure-playwright');
const Logger = require('../../../src/helpers/Logger');
const { ROUTES } = require('../../../src/helpers/Constants');
test('Check Test_Account_Access users @rbac', async ({ page }) => {
    Logger.step('Check Test_Account_Access users');
    await allure.feature('Test Options');
    await allure.story('Test Configuration');

  await page.goto(ROUTES.submitRma);
  await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(2000ms)
  
  // Select Test_Account_Access
  await page.locator('#select2-customer_id-container').click({ force: true });
  // removed: waitForTimeout(500ms) — use event-based wait if needed
  await page.locator('.select2-search__field').fill('Test_Account_Access');
  await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)
  const results = await page.locator('.select2-results__option').allTextContents();
  Logger.info("Search results:", results);
  
  if (results.length > 0 && !results[0].includes('No results')) {
    await page.locator('.select2-results__option').filter({ hasText: /Test_Account_Access/i }).first().click();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(3000ms)
    
    // Check users
    const userOptions = await page.locator('#customer_user_id option').allTextContents();
    Logger.info("Users for Test_Account_Access:", userOptions);
    
    // Also check Select2 user dropdown
    const containerExists = await page.locator('#select2-customer_user_id-container').count();
    Logger.info("User container exists:", containerExists);
    if (containerExists > 0) {
      await page.locator('#select2-customer_user_id-container').click({ force: true });
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)
      const userResults = await page.locator('.select2-results__option').allTextContents();
      Logger.info("User Select2 results:", userResults);
    }
  }
});
