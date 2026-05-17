/**
 * Debug script to test login flow step by step.
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Navigating to login page...');
  await page.goto('https://myconnect-acc.ekinops.com/login', { waitUntil: 'networkidle' });
  console.log(`   URL: ${page.url()}`);

  // Check for cookie banner
  console.log('2. Checking for cookie banner...');
  const cookieBanner = page.locator('text=/cookie|consent|accept|allow/i');
  const hasCookieBanner = await cookieBanner.count() > 0;
  console.log(`   Cookie banner found: ${hasCookieBanner}`);
  if (hasCookieBanner) {
    const btnText = await cookieBanner.first().textContent();
    console.log(`   Banner text: ${btnText}`);
    try {
      await page.locator('button:has-text("Allow"), button:has-text("Accept"), a:has-text("Allow")').first().click();
      console.log('   Dismissed cookie banner');
    } catch (e) {
      console.log(`   Failed to dismiss: ${e.message}`);
    }
  }

  // Check form structure
  console.log('3. Checking form structure...');
  const formTag = await page.locator('form').count();
  console.log(`   Form tags found: ${formTag}`);
  if (formTag > 0) {
    const formAction = await page.locator('form').first().getAttribute('action');
    const formMethod = await page.locator('form').first().getAttribute('method');
    console.log(`   Form action: ${formAction}`);
    console.log(`   Form method: ${formMethod}`);
  }

  // Check email input
  const emailInput = page.locator('#email');
  const emailExists = await emailInput.count() > 0;
  console.log(`   Email input exists: ${emailExists}`);
  if (emailExists) {
    const emailType = await emailInput.getAttribute('type');
    const emailName = await emailInput.getAttribute('name');
    console.log(`   Email type="${emailType}" name="${emailName}"`);
  }

  // Check password input
  const passInput = page.locator('#password');
  const passExists = await passInput.count() > 0;
  console.log(`   Password input exists: ${passExists}`);
  if (passExists) {
    const passType = await passInput.getAttribute('type');
    const passName = await passInput.getAttribute('name');
    console.log(`   Password type="${passType}" name="${passName}"`);
  }

  // Check button
  const btn = page.locator('button.btn-submit');
  const btnExists = await btn.count() > 0;
  console.log(`   Submit button exists: ${btnExists}`);
  if (btnExists) {
    const btnType = await btn.getAttribute('type');
    const btnText = await btn.textContent();
    console.log(`   Button type="${btnType}" text="${btnText?.trim()}"`);
  }

  // Check ALL buttons
  const allButtons = page.locator('button');
  const allBtnCount = await allButtons.count();
  console.log(`   Total buttons: ${allBtnCount}`);
  for (let i = 0; i < allBtnCount; i++) {
    const text = await allButtons.nth(i).textContent();
    const type = await allButtons.nth(i).getAttribute('type');
    const cls = await allButtons.nth(i).getAttribute('class');
    console.log(`   Button ${i}: type="${type}" class="${cls}" text="${text?.trim()}"`);
  }

  // Fill and submit
  console.log('4. Filling credentials...');
  await emailInput.click();
  await emailInput.fill('');
  await emailInput.type('administrator.test@rma.com', { delay: 10 });
  await passInput.click();
  await passInput.fill('');
  await passInput.type('Admin@1234567', { delay: 10 });

  console.log('5. Clicking Sign In and monitoring network...');
  
  // Monitor network requests
  page.on('request', (req) => {
    if (req.method() === 'POST') {
      console.log(`   >>> POST ${req.url()}`);
    }
  });
  page.on('response', (res) => {
    if (res.request().method() === 'POST') {
      console.log(`   <<< ${res.status()} ${res.url()}`);
    }
  });

  // Try clicking the button
  await btn.click();
  console.log('   Button clicked, waiting 5 seconds...');
  await page.waitForTimeout(5000);
  console.log(`   URL after wait: ${page.url()}`);

  // If still on login, try submitting the form directly
  if (page.url().includes('/login')) {
    console.log('6. Still on login — trying form.submit()...');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.submit();
    });
    await page.waitForTimeout(5000);
    console.log(`   URL after form.submit(): ${page.url()}`);
  }

  // If still on login, try pressing Enter in password field
  if (page.url().includes('/login')) {
    console.log('7. Still on login — trying Enter key...');
    await passInput.press('Enter');
    await page.waitForTimeout(5000);
    console.log(`   URL after Enter: ${page.url()}`);
  }

  await browser.close();
  console.log('Done.');
})();
