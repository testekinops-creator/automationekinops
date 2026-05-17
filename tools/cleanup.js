const { chromium } = require('@playwright/test');
require('dotenv').config();

const baseUrl = process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com';
const adminEmail = process.env.RMA_ADMIN_EMAIL || 'administrator.test@rma.com';
const adminPassword = process.env.RMA_ADMIN_PASSWORD || 'Admin@1234567';
const engineerEmail = 'rma.engineer@rma.com';
const engineerPassword = 'Engineer@1234567';
const testSerials = ['L1040004215100962', 'T1138004504037562'];

async function cleanup() {
  console.log('🚀 Starting deep cleanup of test serial numbers...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Accept cookies
  await context.addCookies([{ name: 'cookieconsent_status', value: 'dismiss', domain: new URL(baseUrl).hostname, path: '/', httpOnly: false, secure: true, sameSite: 'Lax' }]);

  async function login(email, password) {
    await page.goto(`${baseUrl}/login`);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button.btn-submit').click();
    await page.waitForLoadState('networkidle');
  }

  // First, login as Admin to handle Submitted, Received, On Hold, Repaired
  console.log('Logging in as Admin...');
  await login(adminEmail, adminPassword);

  for (const serial of testSerials) {
    let hasMore = true;
    while (hasMore) {
      await page.goto(`${baseUrl}/rma/list`);
      await page.waitForLoadState('networkidle');
      
      const filterBtn = page.locator('a:has-text("Filter Data")').first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.locator('textarea[name="serial_number"]').first().fill(serial);
        await page.locator('select[name="show_only"]').first().selectOption({ label: 'Not Closed' });
        await page.locator('#filterSubmit').first().click();
        await page.waitForLoadState('networkidle');
      }

      const rows = page.locator('table tbody tr');
      if (await rows.count() === 0) {
        console.log(`✅ S/N ${serial} is fully clean.`);
        hasMore = false;
        continue;
      }

      const statusText = await rows.first().textContent();
      const status = ['Submitted', 'Accepted', 'Received', 'On Hold', 'On-Hold', 'Repaired', 'Rejected'].find(s => statusText.includes(s)) || 'Unknown';
      console.log(`Found S/N ${serial} in status: ${status}`);
      
      const actionLink = rows.first().locator('a').last();
      await actionLink.click();
      await page.waitForLoadState('networkidle');

      if (status.includes('Submitted') || status.includes('Received')) {
        console.log('Rejecting...');
        await page.locator('button:has-text("Reject"), a:has-text("Reject")').first().click();
        await page.waitForLoadState('networkidle');
        const noteEditable = page.locator('.note-editable[contenteditable="true"]').first();
        if (await noteEditable.isVisible()) await noteEditable.fill('TEARDOWN');
        else await page.locator('textarea[name*="comment" i], input[name*="comment" i]').first().fill('TEARDOWN');
        await page.locator('button:has-text("Reject"), button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');
      } else if (status.includes('Rejected') || status.includes('Repaired') || status.includes('On-Hold') || status.includes('On Hold')) {
        console.log('Closing...');
        await page.locator('button:has-text("Close"), a:has-text("Close")').first().click();
        await page.locator('[class*="modal"]:visible textarea').first().fill('TEARDOWN');
        const select = page.locator('[class*="modal"]:visible select[name*="status"]').first();
        if (await select.isVisible()) await select.selectOption({ index: 1 });
        await page.locator('[class*="modal"]:visible button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');
      } else if (status.includes('Accepted')) {
        console.log('Admin cannot clear Accepted. Leaving it for Engineer phase.');
        hasMore = false;
      } else {
        console.log(`Unknown status to clear: ${status}`);
        hasMore = false;
      }
    }
  }

  // Second phase: Login as Engineer to handle Accepted -> Received
  console.log('Logging in as Engineer...');
  await login(engineerEmail, engineerPassword);
  
  for (const serial of testSerials) {
    let hasMore = true;
    while (hasMore) {
      await page.goto(`${baseUrl}/rma/list`);
      await page.waitForLoadState('networkidle');
      
      const filterBtn = page.locator('a:has-text("Filter Data")').first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.locator('textarea[name="serial_number"]').first().fill(serial);
        await page.locator('select[name="show_only"]').first().selectOption({ label: 'Not Closed' });
        await page.locator('#filterSubmit').first().click();
        await page.waitForLoadState('networkidle');
      }

      const rows = page.locator('table tbody tr');
      if (await rows.count() === 0) {
        hasMore = false;
        continue;
      }

      const statusText = await rows.first().textContent();
      const status = ['Submitted', 'Accepted', 'Received', 'On Hold', 'On-Hold', 'Repaired', 'Rejected'].find(s => statusText.includes(s)) || 'Unknown';
      if (status.includes('Accepted')) {
        console.log(`Engineer Factory Receiving S/N ${serial}...`);
        await page.goto(`${baseUrl}/rma/factory/receive`);
        await page.locator('input[name="serial_number"]').first().fill(serial);
        await page.locator('button:has-text("Add")').first().click();
        await page.waitForTimeout(2000);
        await page.locator('button[type="submit"]:has-text("Receive")').first().click();
        await page.waitForLoadState('networkidle');
      } else {
        hasMore = false;
      }
    }
  }

  // Third phase: Admin cleans up any newly Received RMAs
  console.log('Logging in as Admin again to finish cleanup...');
  await login(adminEmail, adminPassword);
  for (const serial of testSerials) {
    let hasMore = true;
    while (hasMore) {
      await page.goto(`${baseUrl}/rma/list`);
      await page.waitForLoadState('networkidle');
      
      const filterBtn = page.locator('a:has-text("Filter Data")').first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.locator('textarea[name="serial_number"]').first().fill(serial);
        await page.locator('select[name="show_only"]').first().selectOption({ label: 'Not Closed' });
        await page.locator('#filterSubmit').first().click();
        await page.waitForLoadState('networkidle');
      }

      const rows = page.locator('table tbody tr');
      if (await rows.count() === 0) {
        hasMore = false;
        continue;
      }

      const statusText = await rows.first().textContent();
      const status = ['Submitted', 'Accepted', 'Received', 'On Hold', 'On-Hold', 'Repaired', 'Rejected'].find(s => statusText.includes(s)) || 'Unknown';
      if (status.includes('Received')) {
         const actionLink = rows.first().locator('a').last();
         await actionLink.click();
         await page.waitForLoadState('networkidle');
         console.log('Rejecting...');
         await page.locator('button:has-text("Reject"), a:has-text("Reject")').first().click();
         await page.waitForLoadState('networkidle');
         const noteEditable = page.locator('.note-editable[contenteditable="true"]').first();
         if (await noteEditable.isVisible()) await noteEditable.fill('TEARDOWN');
         else await page.locator('textarea[name*="comment" i], input[name*="comment" i]').first().fill('TEARDOWN');
         await page.locator('button:has-text("Reject"), button[type="submit"]').first().click();
         await page.waitForLoadState('networkidle');
      } else if (status.includes('Rejected')) {
         const actionLink = rows.first().locator('a').last();
         await actionLink.click();
         await page.waitForLoadState('networkidle');
         console.log('Closing...');
         await page.locator('button:has-text("Close"), a:has-text("Close")').first().click();
         await page.locator('[class*="modal"]:visible textarea').first().fill('TEARDOWN');
         const select = page.locator('[class*="modal"]:visible select[name*="status"]').first();
         if (await select.isVisible()) await select.selectOption({ index: 1 });
         await page.locator('[class*="modal"]:visible button[type="submit"]').first().click();
         await page.waitForLoadState('networkidle');
      } else {
        hasMore = false;
      }
    }
  }

  await browser.close();
  console.log('Cleanup complete!');
}

cleanup().catch(console.error);
