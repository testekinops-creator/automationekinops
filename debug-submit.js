const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE_URL = 'https://myconnect-acc.ekinops.com';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: path.resolve(__dirname, '.auth', 'rmaAdmin.json')
  });
  const page = await context.newPage();
  
  console.log('Navigating to Add RMA...');
  await page.goto('/rma/add');
  await page.waitForLoadState('domcontentloaded');
  
  console.log('Filling serial...');
  const serial = 'T2149008234103530'; // The ACCEPTED serial
  const serialInput = page.locator('#serial_number').first();
  await serialInput.fill(serial);
  await page.keyboard.press('Tab');
  
  console.log('Waiting for AJAX lookup...');
  await page.waitForTimeout(5000);
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'add-rma-error.png', fullPage: true });
  
  const html = await page.content();
  fs.writeFileSync('add-rma-error.html', html);
  
  console.log('Clicking Save to see what happens...');
  const saveBtn = page.locator('#submitBtn, button:has-text("Save"), button[type="submit"]').first();
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'add-rma-error-after-save.png', fullPage: true });
    console.log('URL after save:', page.url());
  } else {
    console.log('Save button not visible!');
  }
  
  await browser.close();
  console.log('Done!');
})();
