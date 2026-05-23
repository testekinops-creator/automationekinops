/**
 * scripts/check-serials.js
 * Check if serial numbers already have active RMAs.
 * Does its own login — no auth file needed.
 */
'use strict';
const { chromium } = require('playwright');
require('dotenv').config();

const SERIALS = [
  'T2137008182014457',
  'T2149008234103530',
  'T2149008234103378',
  'T2341008344060248',
  'T2048008256056664',
  'T2036008256051168',
  'T2103008256059686',
  'S2415008554503003',
];

const BASE_URL = process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com';
const EMAIL = process.env.RMA_RMA_ADMIN_EMAIL || process.env.RMA_ADMIN_EMAIL;
const PASSWORD = process.env.RMA_RMA_ADMIN_PASSWORD || process.env.RMA_ADMIN_PASSWORD;

async function login(page) {
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Cookie consent
  await page.context().addCookies([{
    name: 'cookieconsent_status', value: 'dismiss',
    domain: new URL(BASE_URL).hostname, path: '/',
  }]);
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const emailInput = page.locator('#email');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('button.btn-submit').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });

  if (page.url().includes('/login')) {
    throw new Error('Login failed — still on login page');
  }
  console.log('✅ Logged in as', EMAIL);
}

(async () => {
  console.log('Checking', SERIALS.length, 'serial numbers against', BASE_URL);
  console.log('');

  if (!EMAIL || !PASSWORD) {
    console.error('ERROR: Set RMA_ADMIN_EMAIL and RMA_ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await login(page);

  const results = [];

  for (let i = 0; i < SERIALS.length; i++) {
    const serial = SERIALS[i];
    try {
      await page.goto(BASE_URL + '/rma/add', { waitUntil: 'networkidle', timeout: 30000 });

      const serialInput = page.locator('#serial_number, input[name="serial_number"]').first();
      await serialInput.waitFor({ state: 'visible', timeout: 10000 });
      await serialInput.fill('');
      await serialInput.fill(serial);
      await serialInput.press('Tab');

      // Wait for AJAX validation
      await page.waitForTimeout(4000);

      const bodyText = await page.locator('body').textContent();

      // Check for duplicate/in-progress
      const hasActiveRMA = /in progress|duplicate|already exists|active rma|serial number is in progress/i.test(bodyText);

      // Check product name resolved
      const productField = page.locator('#product_name, input[name="product_name"], #productName, .product-name').first();
      let productName = '';
      try { productName = await productField.inputValue(); } catch {}
      if (!productName) try { productName = (await productField.textContent()) || ''; } catch {}

      // Check not found
      const notFound = /not found|invalid serial|no product|unknown|does not exist/i.test(bodyText);

      let status;
      if (hasActiveRMA) {
        status = '❌ HAS ACTIVE RMA';
      } else if (notFound || !productName.trim()) {
        status = '⚠️  NOT FOUND / NO PRODUCT';
      } else {
        status = '✅ AVAILABLE';
      }

      results.push({ serial, status, product: productName.trim() });
      console.log(`  ${i + 1}. ${serial}  →  ${status}${productName.trim() ? ' (' + productName.trim() + ')' : ''}`);
    } catch (err) {
      results.push({ serial, status: '⚠️  ERROR' });
      console.log(`  ${i + 1}. ${serial}  →  ⚠️  ERROR: ${err.message.split('\n')[0]}`);
    }
  }

  await browser.close();

  // Summary
  console.log('\n' + '═'.repeat(60));
  const available = results.filter(r => r.status.startsWith('✅'));
  const inUse = results.filter(r => r.status.startsWith('❌'));
  const unknown = results.filter(r => r.status.startsWith('⚠️'));

  console.log(`✅ Available:       ${available.length}`);
  console.log(`❌ Has active RMA:  ${inUse.length}`);
  console.log(`⚠️  Unknown/Error:  ${unknown.length}`);

  if (inUse.length > 0) {
    console.log('\nNeed replacement for:');
    inUse.forEach(r => console.log('  → ' + r.serial));
  }
  if (available.length === 8) {
    console.log('\n🎉 All 8 serials are AVAILABLE! Ready to configure.');
  }
})();
