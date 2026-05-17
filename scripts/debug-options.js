const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/rmaAdmin.json' });
  const page = await context.newPage();
  await page.goto('https://myconnect-acc.ekinops.com/rma/add');
  await page.waitForTimeout(5000);
  
  const customerOptions = await page.locator('#customer_id option').allTextContents();
  console.log("Customers:");
  console.log(customerOptions.filter(o => o.toLowerCase().includes('2degree')));
  
  const userOptions = await page.locator('#customer_user_id option').allTextContents();
  console.log("Users:");
  console.log(userOptions.filter(o => o.toLowerCase().includes('customer')));
  
  await browser.close();
})();
