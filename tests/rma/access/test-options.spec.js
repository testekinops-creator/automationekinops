const { test, expect } = require('@playwright/test');
test('Check Test_Account_Access users', async ({ page }) => {
  await page.goto('/rma/add');
  await page.waitForTimeout(2000);
  
  // Select Test_Account_Access
  await page.locator('#select2-customer_id-container').click({ force: true });
  await page.waitForTimeout(500);
  await page.locator('.select2-search__field').fill('Test_Account_Access');
  await page.waitForTimeout(1500);
  const results = await page.locator('.select2-results__option').allTextContents();
  console.log("Search results:", results);
  
  if (results.length > 0 && !results[0].includes('No results')) {
    await page.locator('.select2-results__option').filter({ hasText: /Test_Account_Access/i }).first().click();
    await page.waitForTimeout(3000);
    
    // Check users
    const userOptions = await page.locator('#customer_user_id option').allTextContents();
    console.log("Users for Test_Account_Access:", userOptions);
    
    // Also check Select2 user dropdown
    const containerExists = await page.locator('#select2-customer_user_id-container').count();
    console.log("User container exists:", containerExists);
    if (containerExists > 0) {
      await page.locator('#select2-customer_user_id-container').click({ force: true });
      await page.waitForTimeout(1000);
      const userResults = await page.locator('.select2-results__option').allTextContents();
      console.log("User Select2 results:", userResults);
    }
  }
});
