const { chromium } = require('playwright');
const { getStorageStatePath } = require('../src/helpers/rmaAuthHelper');
const { ROUTES } = require('../src/helpers/Constants');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: getStorageStatePath('rmaAdmin') });
  const page = await context.newPage();
  
  await page.goto(process.env.PLAYWRIGHT_BASE_URL + ROUTES.factoryInsert);
  await page.waitForLoadState('networkidle');

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn')).map(b => ({
      tagName: b.tagName,
      type: b.type,
      id: b.id,
      className: b.className,
      text: b.innerText || b.value || b.textContent
    }));
  });

  console.log(JSON.stringify(buttons, null, 2));

  await browser.close();
})();
