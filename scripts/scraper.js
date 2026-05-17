const { chromium } = require('@playwright/test');
const fs = require('fs');

const ROUTES = [
  { name: 'Dashboard', url: '/rma/dashboard/' },
  { name: 'SubmitRMA', url: '/rma/add' },
  { name: 'ViewRMA', url: '/rma/list' },
  { name: 'FactoryInsert', url: '/rma/factory/add' },
  { name: 'FactoryReceive', url: '/rma/factory/receive/' },
];

(async () => {
  console.log('Starting scraper...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = 'https://myconnect-acc.ekinops.com';
  await context.addCookies([
    {
      name: 'cookieconsent_status',
      value: 'dismiss',
      domain: 'myconnect-acc.ekinops.com',
      path: '/',
    },
  ]);
  console.log('Navigating to login...');
  await page.goto(baseUrl + '/login');
  
  // Dump login page
  let html = await page.content();
  fs.writeFileSync('dom_LoginPage.html', html);
  console.log('Saved dom_LoginPage.html');

  // Attempt to login using Admin user from Constants.js
  console.log('Logging in...');
  await page.locator('#email, input[name="email"]').fill('administrator.test@rma.com');
  await page.locator('#password, input[name="password"]').fill('Admin@1234567');
  

  
  await page.locator('button[name="commit"], .btn-submit').first().click();
  await page.waitForURL('**/home**', { timeout: 15000 }).catch(() => console.log('Timeout waiting for home'));

  for (const route of ROUTES) {
    console.log(`Navigating to ${route.name}...`);
    try {
      await page.goto(baseUrl + route.url);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      // Remove scripts and styles to make it smaller
      await page.evaluate(() => {
        document.querySelectorAll('script, style, svg').forEach(el => el.remove());
      });
      const html = await page.content();
      fs.writeFileSync(`dom_${route.name}.html`, html);
      console.log(`Saved dom_${route.name}.html`);
    } catch (err) {
      console.error(`Failed on ${route.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('Done.');
})();
