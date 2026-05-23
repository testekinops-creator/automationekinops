# Playwright Automation Framework — Coding Rules & Standards
# automationekinops | MyConnect RMA Module

These rules MUST be followed in every test file, page object, helper, and config file.
Violations will be flagged by `node scripts/audit-project.js`.

---

## 🔴 CRITICAL RULES — Tests will silently lie if broken

### RULE-001: Always `await` Playwright assertions
Every `expect(...)` call MUST have `await`. Without it, assertions never execute.

```js
// ❌ WRONG — silently passes, never actually checks
expect(page).toHaveURL(/dashboard/);
expect(element).toBeVisible();

// ✅ CORRECT
await expect(page).toHaveURL(/dashboard/);
await expect(element).toBeVisible();
```

### RULE-002: Never use `page.waitForTimeout()` (sleep anti-pattern)
`waitForTimeout` is a hardcoded sleep. It makes tests slow and flaky.
Always wait for a specific element, network event, or page state.

```js
// ❌ WRONG
await page.waitForTimeout(3000);
await page.waitForTimeout(2000);

// ✅ CORRECT
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible();
await element.waitFor({ state: 'visible' });
await page.waitForResponse(r => r.url().includes('/api/rma'));
await page.waitForSelector('.alert-success');
```

---

## 🔴 HIGH RULES — Security & Data Integrity

### RULE-003: Never hardcode credentials
Passwords, emails, and tokens MUST come from `USERS` (Constants.js) or `process.env` via `config.js`.

```js
// ❌ WRONG
await page.fill('#email', 'rma.admin@rma.com');
const password = 'Admin@123';

// ✅ CORRECT
await loginPage.fillEmail(USERS.rmaAdmin.email);
await loginPage.fillPassword(USERS.rmaAdmin.password);
```

### RULE-004: Never hardcode test data (serials, RMA IDs)
All serial numbers and test RMA identifiers MUST come from `RMA` or `CUSTOMERS` in `Constants.js`.

```js
// ❌ WRONG
await serialInput.type('T1138004504037566');
const rmaId = 'S2513008343588978';

// ✅ CORRECT
const { RMA } = require('../../src/helpers/Constants');
await serialInput.type(RMA.validSerial);
const rmaId = RMA.workflowSerial;
```

### RULE-005: Never hardcode URLs
Base URLs, API endpoints, and page routes MUST come from `config.js` or `ROUTES` in `Constants.js`.

```js
// ❌ WRONG
await page.goto('https://myconnect-acc.ekinops.com/rma/add');
const baseUrl = 'https://myconnect-acc.ekinops.com';
const BASE_URL = 'http://localhost:3000';

// ✅ CORRECT
const { ROUTES } = require('../../src/helpers/Constants');
const { BASE_URL } = require('../../src/helpers/config');
await page.goto(ROUTES.submitRma);
```

### RULE-006: Never use hardcoded route paths in `page.goto()`
Always use the `ROUTES` object from `Constants.js`.

```js
// ❌ WRONG
await page.goto('/rma/add');
await page.goto('/rma/factory/receive/');

// ✅ CORRECT
await page.goto(ROUTES.submitRma);
await page.goto(ROUTES.factoryReceive);
```

---

## 🟡 ARCHITECTURE RULES — Maintainability

### RULE-007: All `process.env` reads belong ONLY in `config.js`
No file other than `src/helpers/config.js` and `playwright.config.js` may read `process.env` directly.

```js
// ❌ WRONG — in rmaAuthHelper.js, rmaCleanup.js, Logger.js, etc.
const baseUrl = process.env.RMA_BASE_URL || 'https://...';
const level = process.env.LOG_LEVEL || 'info';

// ✅ CORRECT — import from config
const { BASE_URL, LOG_LEVEL } = require('./config');
const baseUrl = BASE_URL;
```

### RULE-008: Never use `console.log` in spec files or page objects
Use the `Logger` helper for all diagnostic output. This ensures structured logging, log levels, and file output.

```js
// ❌ WRONG
console.log(`✓ RMA ${id} created`);
console.log('Navigating to dashboard...');

// ✅ CORRECT
Logger.step('Navigate to dashboard');
Logger.action(`RMA ${id} created successfully`);
Logger.verify(`RMA ${id} visible in list`);
```

### RULE-009: No `axios` or `fetch` calls directly in spec files
API calls belong in `src/helpers/apiHelper.js`. Tests call the helper.

```js
// ❌ WRONG — in a .spec.js file
const axios = require('axios');
const response = await axios.get(`${BASE_URL}/api/rma/${id}`);

// ✅ CORRECT
const { ApiHelper } = require('../../src/helpers/apiHelper');
const api = new ApiHelper(request);
const rma = await api.getRma(id);
```

### RULE-010: No direct login calls in functional/regression spec files
Auth is handled by the `rma-setup` project via `storageState`. Never call `loginPage.login()` in functional specs.

```js
// ❌ WRONG — in tests/rma/functional/view-rma.spec.js
await loginPage.fillEmail(USERS.rmaAdmin.email);
await loginPage.fillPassword(USERS.rmaAdmin.password);
await loginPage.clickSubmit();

// ✅ CORRECT — set via storageState in playwright.config.js
// The rma project already sets storageState per user role.
// Just use the page — you're already logged in.
```

---

## 🟡 STRUCTURE RULES — Test Design

### RULE-011: Every `test()` title MUST have at least one `@tag`
Tags enable selective execution: `npx playwright test --grep @smoke`.

```js
// ❌ WRONG
test('RMA list loads with correct columns', async ({ page }) => {

// ✅ CORRECT
test('TC-VR-001 | RMA list loads with correct columns @smoke @view', async ({ page }) => {
```

**Approved tags:**
| Tag | Use for |
|---|---|
| `@smoke` | Critical happy-path, run on every PR |
| `@regression` | Bug regression tests |
| `@functional` | Feature-level tests |
| `@security` | Security & auth tests |
| `@rbac` | Role-based access tests |
| `@workflow` | State transition tests |
| `@factory` | Factory receive/insert |
| `@filter` | List & filter tests |
| `@submit` | RMA submission tests |
| `@view` | View screen tests |
| `@edit` | Edit form tests |
| `@dashboard` | Dashboard/KPI tests |
| `@integration` | Multi-step E2E tests |
| `@debug` | Developer investigation (never in CI) |

### RULE-012: Every spec file MUST import `allure` and `Logger`
```js
// Required at the top of every .spec.js file
const { allure } = require('allure-playwright');
const Logger = require('../../src/helpers/Logger'); // adjust path depth
```

### RULE-013: Every spec file MUST set Allure `feature` and `story`
Use `test.beforeEach` inside the outermost `test.describe`:
```js
test.describe('View RMA @view', () => {
  test.beforeEach(async () => {
    await allure.feature('View RMA');
    await allure.story('RMA List & Detail');
  });
  // ...tests
});
```

### RULE-014: Every test MUST call `Logger.step()` as its first line
```js
test('TC-VR-001 | RMA list loads @smoke @view', async ({ page }) => {
  Logger.step('RMA list loads with correct columns');
  // rest of test...
});
```

### RULE-015: No `test.only()` or `describe.only()` committed to repo
These focus modes break the full test suite in CI.

```js
// ❌ NEVER commit these
test.only('my test', ...);
describe.only('my suite', ...);

// ✅ Use tags and grep for focused runs
npx playwright test --grep @smoke
```

---

## 🟢 QUALITY RULES — Reliability

### RULE-016: No magic numbers for timeouts
Define timeout constants in `src/helpers/config.js` and import them.

```js
// ❌ WRONG
await expect(btn).toBeVisible({ timeout: 15000 });
await element.waitFor({ timeout: 30000 });

// ✅ CORRECT — in config.js
TIMEOUTS: { default: 10_000, navigation: 30_000, long: 60_000 }

// in test
const { TIMEOUTS } = require('../../src/helpers/config');
await expect(btn).toBeVisible({ timeout: TIMEOUTS.default });
```

### RULE-017: No empty `catch` blocks
Empty catches hide real failures.

```js
// ❌ WRONG
try {
  await doSomething();
} catch (e) {}

// ✅ CORRECT
try {
  await doSomething();
} catch (e) {
  Logger.warn(`doSomething failed: ${e.message}`);
}
```

### RULE-018: `test.skip(true)` must include a reason and be temporary
Permanent `test.skip(true)` is not allowed. Use `test.fixme()` for known broken tests.

```js
// ❌ WRONG — permanent silent skip
test.skip(true, '');

// ✅ ACCEPTABLE — data-conditional skip with reason
if (await element.count() === 0) {
  test.skip(true, 'No RMAs in this status — data-dependent skip');
  return;
}

// ✅ CORRECT for known broken tests
test.fixme('TC-XX | known broken test @regression', async ({ page }) => {
```

### RULE-019: `test.setTimeout()` values must use config constants
```js
// ❌ WRONG
test.setTimeout(120_000);

// ✅ CORRECT
const { TIMEOUTS } = require('../../../src/helpers/config');
test.setTimeout(TIMEOUTS.long);
```

### RULE-020: No TODO/FIXME left in committed code
All TODOs must be tracked as GitHub issues, not left in code.

---

## 📁 File Structure Rules

### RULE-021: Page Objects go in `src/pages/rma/`
No DOM interaction (locators, clicks, fills) in spec files — all UI actions go in Page Objects.

### RULE-022: Test data goes in `Constants.js` or `.env`
No raw test values in spec files.

### RULE-023: Helper utilities go in `src/helpers/`
Reusable logic (auth, cleanup, assertions, API) goes in helpers, not duplicated across tests.

---

## 🔧 Running the Audit

```bash
# Run the full audit at any time
node scripts/audit-project.js

# Expected output after compliance:
# WAIT_FOR_TIMEOUT    : 0
# MISSING_AWAIT_EXPECT: 0
# HARDCODED_CREDENTIALS: 0
# CONSOLE_LOG         : 0
# TEST_ONLY_FOCUSED   : 0
```

---

## 📋 Pre-Commit Checklist

Before committing any spec file, verify:
- [ ] All `expect()` calls have `await`
- [ ] No `page.waitForTimeout()` calls
- [ ] No hardcoded credentials, emails, passwords
- [ ] No hardcoded serial numbers (use `RMA.xxx`)
- [ ] No hardcoded URLs (use `ROUTES.xxx` or `config.BASE_URL`)
- [ ] No `console.log` (use `Logger.xxx`)
- [ ] Every `test()` has at least one `@tag`
- [ ] File has `allure` and `Logger` imports
- [ ] File has `allure.feature()` and `allure.story()` in `beforeEach`
- [ ] Every `test()` starts with `Logger.step()`
- [ ] No `test.only()` left in

---

*Last updated: 2026-05-21 | Enforced by: scripts/audit-project.js*
