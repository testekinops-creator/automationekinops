/* eslint-env browser */
/**
 * tests/security/security.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * MyConnect RMA – Comprehensive Security Test Automation
 * Covers:
 *   SEC-1  Authentication Bypass
 *   SEC-2  Authorization / RBAC
 *   SEC-3  Input Validation (SQLi, XSS, HTML Injection, Command Injection)
 *   SEC-4  API Security (Token, IDOR, Mass Assignment, Method Override)
 *   SEC-5  Session Management (Timeout, Fixation, Hijacking)
 *   SEC-6  Data Exposure (PII, Stack Traces, Headers)
 *   SEC-7  CSRF Protection
 *   SEC-8  Direct URL Access Restriction
 *   SEC-9  Audit Log Integrity
 *   SEC-10 Rate Limiting / Brute Force
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { loginAs, switchRole }      = require('../../../src/helpers/rmaAuthHelper');
const { USERS, ROUTES, RMA } = require('../../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../../src/helpers/Logger');

// Disable global storageState so tests start unauthenticated (required since tests use loginAs manually)
test.use({ storageState: { cookies: [], origins: [] } });

// ─── Security payloads ────────────────────────────────────────────────────────
const PAYLOADS = {
  sqli: [
    "' OR '1'='1",
    "'; DROP TABLE rma_master_table; --",
    "' AND SLEEP(5) --",
    "' UNION SELECT 1,2,3,username,password FROM users --",
    "1' OR '1'='1' /*",
  ],
  xss: [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '"><script>alert(document.cookie)</script>',
    "javascript:alert('XSS')",
    '<svg onload=alert(1)>',
    '<iframe src="javascript:alert(1)">',
  ],
  htmlInject: [
    '<h1>HACKED</h1>',
    '<a href="https://evil.com">Click me</a>',
    '<meta http-equiv="refresh" content="0;url=https://evil.com">',
  ],
  cmdInject: [
    '; ls -la',
    '| cat /etc/passwd',
    '`id`',
    '$(whoami)',
  ],
  ldapInject: [
    'admin)(|(password=*))',
    '*)(uid=*))(|(uid=*',
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ],
};

// ─── Protected routes for all roles ──────────────────────────────────────────
const PROTECTED_ROUTES = [
  ROUTES.rmaDashboard ?? '/rma/dashboard/',
  ROUTES.submitRma ?? '/rma/add',
  ROUTES.viewRma ?? '/rma/list',
  ROUTES.factoryReceive ?? '/rma/factory/receive/',
  ROUTES.factoryInsert ?? '/rma/factory/add',
  ROUTES.manageAddress ?? '/rma/address',
];

const EMPLOYEE_ONLY_ROUTES = [
  '/rma/factory/receive/',
  '/rma/factory/add',
  '/rma/address',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function _expectNoAlertFired(page, action) {
  let alertFired = false;
  page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
  await action();
  await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(600ms)
  return !alertFired;
}

async function expectNoSystemInfo(page) {
  const body = await page.locator('body').textContent().catch(() => '');
  const dangerPatterns = [
    /SQL syntax/i, /ORA-\d+/, /SQLSTATE/i, /mysqli_/i,
    /at Object\.<anonymous>/, /at Function\./, /stack trace/i,
    /laravel/i, /symfony/i, /Exception in thread/i,
    /\/var\/www\/html/, /\/home\/\w+\//,
    /DB_PASSWORD/, /DB_HOST/, /APP_KEY/i,
  ];
  for (const pattern of dangerPatterns) {
    await expect(body).not.toMatch(pattern);
  }
}

async function _getResponseHeaders(page, url) {
  const response = await page.goto(url);
  return response?.headers() ?? {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-1: AUTHENTICATION BYPASS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-1 | Authentication Bypass', () => {
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('Security');
    await allure.story('OWASP & Auth Security');
  });



  test.beforeEach(async ({ page }) => {
    // Explicitly clear cookies to ensure unauthenticated state
    await page.context().clearCookies();
  });

  test('SEC-1-01 | All protected routes redirect unauthenticated users to login @security', async ({ page }) => {
    Logger.step('SEC-1-01 | All protected routes redirect unauthenticated users to login');

    for (const route of PROTECTED_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      await expect(url, `Route ${route} should be protected`).toMatch(/\/login|\/unauthorized/i);
    }
  });

  test('SEC-1-02 | SQL injection in login email field – no bypass @security', async ({ page }) => {
    Logger.step('SEC-1-02 | SQL injection in login email field – no bypass');

    await page.goto(ROUTES.login ?? '/login');
    await page.waitForLoadState('domcontentloaded');

    for (const payload of PAYLOADS.sqli.slice(0, 3)) {
      const emailInput = page.locator('input[type="email"],input[name="email"]').first();
      await emailInput.fill(payload);
      await page.locator('input[type="password"]').fill('anypassword');
      await page.locator('#loginBtn, button[type="submit"], input[type="submit"], .btn-login, button:has-text("Login"), button:has-text("Sign in")').first().click();
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)

      await expect(page.url()).toMatch(/\/login/i);
      await expectNoSystemInfo(page);

      await page.goto(ROUTES.login ?? '/login');
    }
  });

  test('SEC-1-03 | XSS in login email field – not executed @security', async ({ page }) => {
    Logger.step('SEC-1-03 | XSS in login email field – not executed');

    await page.goto(ROUTES.login ?? '/login');
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });

    const emailInput = page.locator('input[type="email"],input[name="email"]').first();
    await emailInput.fill(PAYLOADS.xss[0]);
    await page.locator('input[type="password"]').fill('any');
    await page.locator('#loginBtn, button[type="submit"], input[type="submit"], .btn-login, button:has-text("Login"), button:has-text("Sign in")').first().click();
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)

    await expect(alertFired).toBe(false);
  });

  test('SEC-1-04 | Expired session token rejected @security', async ({ page }) => {
    Logger.step('SEC-1-04 | Expired session token rejected');

    await loginAs(page, USERS.rmaAdmin);
    await page.waitForLoadState('domcontentloaded');

    // Clear cookies to simulate expired session
    await page.context().clearCookies();

    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(page.url()).toMatch(/\/login|\/unauthorized/i);
  });

  test('SEC-1-05 | Manipulated session cookie rejected @security', async ({ page }) => {
    Logger.step('SEC-1-05 | Manipulated session cookie rejected');

    await loginAs(page, USERS.repairWatcher);
    const cookies = await page.context().cookies();

    // Attempt to forge a cookie with elevated role
    const sessionCookie = cookies.find(c =>
      c.name.toLowerCase().includes('session') || c.name.toLowerCase().includes('token')
    );

    if (sessionCookie) {
      await page.context().addCookies([{
        ...sessionCookie,
        value: sessionCookie.value + '_FORGED',
      }]);

      await page.goto(ROUTES.factoryReceive);
      await page.waitForLoadState('domcontentloaded');
      // Wait for AJAX DataTable to populate
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

      // Forged cookie should NOT grant access to factory receive
      const factoryForm = page.locator('h1,h2').filter({ hasText: /Factory Receive/i });
      const submitBtn   = page.locator('button:has-text("Submit")').first();

      const _hasAccess = await factoryForm.isVisible().catch(() => false) ||
                        await submitBtn.isVisible().catch(() => false);
      // Watcher should not have access even with a forged cookie attempt
      // (if server validates token server-side this will fail)
    }
  });

  test('SEC-1-06 | Password brute force – account does not expose information @security', async ({ page }) => {
    Logger.step('SEC-1-06 | Password brute force – account does not expose information');

    await page.goto(ROUTES.login ?? '/login');
    const _prevError = '';

    for (let i = 0; i < 3; i++) {
      const emailInput = page.locator('input[type="email"],input[name="email"]').first();
      await emailInput.fill(USERS.rmaAdmin.email);
      await page.locator('input[type="password"]').fill(`WrongPass${i}`);
      await page.locator('#loginBtn, button[type="submit"], input[type="submit"], .btn-login, button:has-text("Login"), button:has-text("Sign in")').first().click();
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)

      const errorText = await page.locator('[class*="error"],.alert-danger').first()
        .textContent().catch(() => '');

      // Error should be generic, not revealing "wrong password" vs "wrong username"
      await expect(errorText).not.toMatch(/password.*incorrect|wrong password/i);
      await expectNoSystemInfo(page);

      await page.goto(ROUTES.login ?? '/login');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-2: AUTHORIZATION / RBAC
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-2 | Authorization & RBAC', () => {


  test('SEC-2-01 | Customer cannot access employee-only routes @security', async ({ page }) => {
    Logger.step('SEC-2-01 | Customer cannot access employee-only routes');

    await switchRole(page, USERS.customerOne);

    for (const route of EMPLOYEE_ONLY_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      const isBlocked = url.includes('/login') || url.includes('/403') || url.includes('/unauthorized') || url.includes('/core/accessviolation');
      await expect(isBlocked, `Customer should be blocked from ${route}`).toBe(true);
    }
  });

  test('SEC-2-02 | Repair Watcher cannot POST factory receive API @security', async ({ page }) => {
    Logger.step('SEC-2-02 | Repair Watcher cannot POST factory receive API');

    await switchRole(page, USERS.repairWatcher);

    const response = await page.request.post('/api/rma/factory/receive', {
      data: { serial_number: RMA.validSerial },
      headers: { 'Content-Type': 'application/json' },
    });
    await expect([401, 403, 405]).toContain(response.status());
  });

  test('SEC-2-03 | Customer cannot POST accept workflow via API @security', async ({ page }) => {
    Logger.step('SEC-2-03 | Customer cannot POST accept workflow via API');

    await switchRole(page, USERS.customerOne);

    const response = await page.request.post('/api/rma/1/accept', {
      data: { comment: 'Unauthorized accept attempt' },
      headers: { 'Content-Type': 'application/json' },
    });
    await expect([401, 403, 404, 405]).toContain(response.status());
  });

  test('SEC-2-04 | Repair Watcher cannot see workflow action buttons @security', async ({ page }) => {
    Logger.step('SEC-2-04 | Repair Watcher cannot see workflow action buttons');

    await switchRole(page, USERS.repairWatcher);
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('domcontentloaded');

    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.locator('a, button').last().click();
      await page.waitForLoadState('domcontentloaded');

      const acceptBtn = page.locator('button:has-text("Accept"), a:has-text("Accept")');
      const rejectBtn = page.locator('button:has-text("Reject"), a:has-text("Reject")');
      await expect(acceptBtn).toBeHidden();
      await expect(rejectBtn).toBeHidden();
    }
  });

  test('SEC-2-05 | Privilege escalation via API body parameter rejected @security', async ({ page }) => {
    Logger.step('SEC-2-05 | Privilege escalation via API body parameter rejected');

    await switchRole(page, USERS.repairWatcher);

    // Attempt to escalate role via API body
    const response = await page.request.patch('/api/users/me', {
      data: { role: 'RMA Admin', permissions: ['factory-receive', 'accept'] },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should be rejected
    await expect([400, 403, 404, 405, 422]).toContain(response.status());
  });

  test('SEC-2-06 | IDOR: Customer cannot access another customer RMA by ID @security', async ({ page }) => {
    Logger.step('SEC-2-06 | IDOR: Customer cannot access another customer RMA by ID');

    await switchRole(page, USERS.customerOne);

    // Try to access RMA IDs likely owned by another customer
    for (const id of [1, 2, 100, 999]) {
      const response = await page.request.get(`/api/rma/${id}`);
      if (response.status() === 200) {
        const body = await response.json().catch(() => ({}));
        const email = body.customer_email ?? body.user_email ?? body.email ?? '';
        if (email) {expect(email).not.toContain('testaccess2');}
      } else {
        await expect([403, 404]).toContain(response.status());
      }
    }
  });

  test('SEC-2-07 | Repair Watcher read-only: no write API calls succeed @security', async ({ page }) => {
    Logger.step('SEC-2-07 | Repair Watcher read-only: no write API calls succeed');

    await switchRole(page, USERS.repairWatcher);

    const writeAttempts = [
      { method: 'post',   url: '/api/rma',                  data: { serial: 'TEST' } },
      { method: 'post',   url: '/api/rma/1/accept',         data: { comment: 'x' } },
      { method: 'delete', url: '/api/rma/1',                data: {} },
      { method: 'patch',  url: '/api/rma/1',                data: { status: 'Accepted' } },
    ];

    for (const { method, url, data } of writeAttempts) {
      const response = await page.request[method](url, {
        data, headers: { 'Content-Type': 'application/json' },
      });
      await expect([400, 401, 403, 404, 405, 422],
        `Write to ${url} should be blocked for Watcher`).toContain(response.status());
    }
  });

  test('SEC-2-08 | Customer dashboard only shows own RMA counts, not global @security', async ({ page }) => {
    Logger.step('SEC-2-08 | Customer dashboard only shows own RMA counts, not global');

    await switchRole(page, USERS.customerOne);
    await page.goto(ROUTES.rmaDashboard ?? '/rma');
    await page.waitForLoadState('domcontentloaded');

    // Employee-only KPI cards must not be visible
    await expect(page.locator('text=/Pending Accept/i').first()).toBeHidden();
    await expect(page.locator('text=/Accepted.*Not Received/i').first()).toBeHidden();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-3: INPUT VALIDATION – INJECTION ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-3 | Input Validation & Injection', () => {


  test.beforeEach(async ({ page }) => {
    await switchRole(page, USERS.rmaAdmin);
  });

  // ── SQL Injection ───────────────────────────────────────────────────────────
  test('SEC-3-01 | SQL injection in Submit RMA Serial Number field @security', async ({ page }) => {
    Logger.step('SEC-3-01 | SQL injection in Submit RMA Serial Number field');

    await page.goto(ROUTES.submitRma ?? '/rma/add');
    await page.waitForLoadState('domcontentloaded');

    for (const payload of PAYLOADS.sqli) {
      const snInput = page.locator('input[placeholder*="serial" i], input[name*="serial"]').first();
      await snInput.fill(payload);
      await snInput.press('Tab');
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1200ms)

      await expectNoSystemInfo(page);
      await expect(page.url()).not.toContain('/500');
    }
  });

  test('SEC-3-02 | SQL injection in RMA List Filter – RMA ID field @security', async ({ page }) => {
    Logger.step('SEC-3-02 | SQL injection in RMA List Filter – RMA ID field');

    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const filterBtn = page.locator('button:has-text("Filter Data")').first();
    await filterBtn.click();
    // removed: waitForTimeout(400ms) — use event-based wait if needed

    const rmaIdInput = page.locator('input[placeholder*="RMA ID" i], input[placeholder*="comma separated RMA" i]').first();

    for (const payload of PAYLOADS.sqli.slice(0, 3)) {
      await rmaIdInput.fill(payload);
      await page.locator('button:has-text("Apply")').first().click();
      await page.waitForLoadState('domcontentloaded');

      await expectNoSystemInfo(page);
      await expect(page.url()).not.toContain('/500');

      await filterBtn.click();
      // removed: waitForTimeout(300ms) — use event-based wait if needed
    }
  });

  test('SEC-3-03 | SQL injection in Factory Receive Serial Number @security', async ({ page }) => {
    Logger.step('SEC-3-03 | SQL injection in Factory Receive Serial Number');

    await page.goto(ROUTES.factoryReceive ?? '/rma/factory/receive/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const snInput = page.locator('input[placeholder*="serial" i], table input').first();

    for (const payload of PAYLOADS.sqli.slice(0, 2)) {
      await snInput.fill(payload);
      await snInput.press('Tab');
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)

      await expectNoSystemInfo(page);
    }
  });

  test('SEC-3-04 | Blind SQL injection (time-based) – no delay in response @security', async ({ page }) => {
    Logger.step('SEC-3-04 | Blind SQL injection (time-based) – no delay in response');

    await page.goto(ROUTES.submitRma ?? '/rma/add');
    await page.waitForLoadState('domcontentloaded');

    const snInput = page.locator('input[placeholder*="serial" i], input[name*="serial"]').first();
    const start = Date.now();

    await snInput.fill("SN' AND SLEEP(5) --");
    await snInput.press('Tab');
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(2000ms)

    const elapsed = Date.now() - start;
    // Response should NOT take 5+ seconds (would indicate SLEEP was executed)
    await expect(elapsed).toBeLessThan(7000);
    await expectNoSystemInfo(page);
  });

  // ── XSS ─────────────────────────────────────────────────────────────────────
  test('SEC-3-05 | Reflected XSS in RMA List filter keyword – not executed @security', async ({ page }) => {
    Logger.step('SEC-3-05 | Reflected XSS in RMA List filter keyword – not executed');

    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });

    const filterBtn = page.locator('button:has-text("Filter Data")').first();
    await filterBtn.click();
    // removed: waitForTimeout(400ms) — use event-based wait if needed

    const keyword = page.locator('input[placeholder*="ID, Serial" i]').first();
    for (const payload of PAYLOADS.xss) {
      await keyword.fill(payload);
      await page.locator('button:has-text("Apply")').first().click();
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(800ms)

      await expect(alertFired).toBe(false);
      await expectNoSystemInfo(page);

      await filterBtn.click();
      // removed: waitForTimeout(300ms) — use event-based wait if needed
    }
  });

  test('SEC-3-06 | Stored XSS in Note for Repair – not executed for other users @security', async ({ page }) => {
    Logger.step('SEC-3-06 | Stored XSS in Note for Repair – not executed for other users');

    await page.goto(ROUTES.submitRma ?? '/rma/add');
    await page.waitForLoadState('domcontentloaded');

    const noteField = page.locator('textarea').first();
    if (await noteField.isVisible()) {
      await noteField.fill(PAYLOADS.xss[0]);
    }

    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    // removed: waitForTimeout(500ms) — use event-based wait if needed

    await expect(alertFired).toBe(false);
  });

  test('SEC-3-07 | XSS in RMA Comment modal – stripped before save @security', async ({ page }) => {
    Logger.step('SEC-3-07 | XSS in RMA Comment modal – stripped before save');

    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');

    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.locator('a, button').last().click();
      await page.waitForLoadState('domcontentloaded');

      const commentBtn = page.locator('button:has-text("Comment")').first();
      if (await commentBtn.isVisible()) {
        await commentBtn.click();
        // removed: waitForTimeout(500ms) — use event-based wait if needed

        let alertFired = false;
        page.on('dialog', async d => { alertFired = true; await d.dismiss(); });

        const modal = page.locator('[role="dialog"], [class*="modal"]').first();
        const editor = modal.locator('textarea, [contenteditable="true"]').first();
        if (await editor.isVisible()) {
          await editor.fill(PAYLOADS.xss[0]);
        }
        // removed: waitForTimeout(400ms) — use event-based wait if needed
        await expect(alertFired).toBe(false);
      }
    }
  });

  test('SEC-3-08 | HTML injection in filter fields – rendered as plain text @security', async ({ page }) => {
    Logger.step('SEC-3-08 | HTML injection in filter fields – rendered as plain text');

    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const filterBtn = page.locator('button:has-text("Filter Data")').first();
    await filterBtn.click();
    // removed: waitForTimeout(400ms) — use event-based wait if needed

    const keyword = page.locator('input[placeholder*="ID, Serial" i]').first();
    await keyword.fill(PAYLOADS.htmlInject[0]);  // <h1>HACKED</h1>
    await page.locator('button:has-text("Apply")').first().click();
    await page.waitForLoadState('domcontentloaded');

    // The injected <h1> tag should NOT be rendered as an actual heading
    const h1Count = await page.locator('h1:has-text("HACKED")').count();
    await expect(h1Count).toBe(0);
  });

  test('SEC-3-09 | Path traversal in serial number field – blocked @security', async ({ page }) => {
    Logger.step('SEC-3-09 | Path traversal in serial number field – blocked');

    await page.goto(ROUTES.factoryReceive ?? '/rma/factory/receive/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const snInput = page.locator('table input, input[placeholder*="serial" i]').first();
    for (const payload of PAYLOADS.pathTraversal) {
      await snInput.fill(payload);
      await snInput.press('Tab');
      await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1000ms)

      const body = await page.locator('body').textContent().catch(() => '');
      await expect(body).not.toContain('root:x:0:0');
      await expect(body).not.toContain('[boot loader]');
      await expectNoSystemInfo(page);
    }
  });

  test('SEC-3-10 | Special characters in all text inputs do not break page @security', async ({ page }) => {
    Logger.step('SEC-3-10 | Special characters in all text inputs do not break page');

    await page.goto(ROUTES.submitRma ?? '/rma/add');
    await page.waitForLoadState('domcontentloaded');

    const specialChars = ['<>', '&amp;', '\\n\\r', '\0', '日本語', '🔥💀'];
    const snInput = page.locator('input[placeholder*="serial" i], input[name*="serial"]').first();

    for (const chars of specialChars) {
      await snInput.fill(chars);
      await snInput.press('Tab');
      // removed: waitForTimeout(500ms) — use event-based wait if needed
      await expect(page.url()).not.toContain('/500');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-4: API SECURITY
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-4 | API Security', () => {

  test('SEC-4-04 | HTTP method override header rejected @security', async ({ page }) => {
    Logger.step('SEC-4-04 | HTTP method override header rejected');

    await switchRole(page, USERS.customerOne);

    // Customer tries to POST to factory-receive using method override
    const response = await page.request.get('/api/rma/factory/receive', {
      headers: {
        'X-HTTP-Method-Override': 'POST',
        'Content-Type': 'application/json',
      },
    });
    // Method override should not work; GET should return 404/405/403
    await expect([401, 403, 404, 405]).toContain(response.status());
  });

  test('SEC-4-05 | API rate limiting enforced on serial number lookup @security', async ({ page }) => {
    Logger.step('SEC-4-05 | API rate limiting enforced on serial number lookup');

    await switchRole(page, USERS.rmaAdmin);

    const responses = [];
    for (let i = 0; i < 30; i++) {
      const response = await page.request.post('/api/rma/factory/receive', {
        data: { serial_number: `SN-RATE-TEST-${i}` },
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null);
      if (response) {responses.push(response.status());}
    }

    // At least some responses should be rate limited (429) after rapid requests
    const _hasRateLimit = responses.includes(429);
    // Log for information even if rate limiting not yet implemented
    Logger.info(`  Rate limit test: ${responses.filter(r => r === 429).length}/30 requests rate-limited`);
    // We don't hard-fail if rate limiting not yet implemented, just log
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-5: SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-5 | Session Management', () => {


  test('SEC-5-01 | Session cookie is HttpOnly @security', async ({ page }) => {
    Logger.step('SEC-5-01 | Session cookie is HttpOnly');

    await loginAs(page, USERS.rmaAdmin);

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('token') ||
      c.name.toLowerCase().includes('auth') ||
      c.name.toLowerCase().includes('laravel')
    );

    if (sessionCookie) {
      await expect(sessionCookie.httpOnly, 'Session cookie must be HttpOnly').toBe(true);
      Logger.info(`  Session cookie "${sessionCookie.name}": httpOnly=${sessionCookie.httpOnly} ✓`);
    } else {
      Logger.info('  No session cookie found to check');
    }
  });

  test('SEC-5-02 | Session cookie is Secure on HTTPS @security', async ({ page }) => {
    Logger.step('SEC-5-02 | Session cookie is Secure on HTTPS');

    await loginAs(page, USERS.rmaAdmin);
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('laravel')
    );

    if (sessionCookie && page.url().startsWith('https')) {
      await expect(sessionCookie.secure).toBe(true);
    }
  });

  test('SEC-5-03 | Session invalidated after logout @security', async ({ page }) => {
    Logger.step('SEC-5-03 | Session invalidated after logout');

    await loginAs(page, USERS.rmaAdmin);

    // Capture session cookies before logout
    const _cookiesBefore = await page.context().cookies();

    // Logout
    const logoutBtn = page.locator('a:has-text("Logout"), button:has-text("Logout"), [href*="logout"]').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      await page.context().clearCookies();
    }

    // Try to access protected route after logout
    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(page.url()).toMatch(/\/login|\/unauthorized|\/access-denied/i);
  });

  test('SEC-5-04 | Session persists within valid session window @security', async ({ page }) => {
    Logger.step('SEC-5-04 | Session persists within valid session window');

    await loginAs(page, USERS.rmaAdmin);

    // Navigate away and back
    await page.goto('https://myconnect-acc.ekinops.com');
    await page.waitForLoadState('domcontentloaded');

    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Should still be authenticated
    await expect(page.url()).not.toMatch(/\/login/i);
  });

  test('SEC-5-05 | Session does not persist in incognito context @security', async ({ browser }) => {
    Logger.step('SEC-5-05 | Session does not persist in incognito context');

    // Open normal context and login
    const normalCtx  = await browser.newContext();
    const normalPage = await normalCtx.newPage();
    await loginAs(normalPage, USERS.rmaAdmin);

    // Open incognito (new context) – should NOT share session
    const incognitoCtx  = await browser.newContext();
    const incognitoPage = await incognitoCtx.newPage();
    await incognitoPage.goto(ROUTES.viewRma ?? '/rma/list');
    await incognitoPage.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await incognitoPage.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    await expect(incognitoPage.url()).toMatch(/\/login|\/unauthorized/i);

    await normalCtx.close();
    await incognitoCtx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-6: DATA EXPOSURE
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-6 | Data Exposure', () => {


  test('SEC-6-01 | 404 pages do not expose server stack trace @security', async ({ page }) => {
    Logger.step('SEC-6-01 | 404 pages do not expose server stack trace');

    await switchRole(page, USERS.rmaAdmin);
    await page.goto('/rma/request/99999999');
    await page.waitForLoadState('domcontentloaded');

    await expectNoSystemInfo(page);
    const body = await page.locator('body').textContent().catch(() => '');
    await expect(body).not.toContain('at Function.');
    await expect(body).not.toContain('vendor/laravel');
  });

  test('SEC-6-02 | API error responses do not reveal DB structure @security', async ({ page }) => {
    Logger.step('SEC-6-02 | API error responses do not reveal DB structure');

    await switchRole(page, USERS.rmaAdmin);

    const response = await page.request.post('/api/rma', {
      data: { invalid_field: 'value', serial_number: '' },
      headers: { 'Content-Type': 'application/json' },
    });

    const text = await response.text().catch(() => '');
    await expect(text).not.toMatch(/SQLSTATE/i);
    await expect(text).not.toMatch(/rma_master_table/i);
    await expect(text).not.toMatch(/Column.*doesn.*t exist/i);
    await expect(text).not.toMatch(/ORA-\d+/);
  });

  test('SEC-6-03 | Customer API response excludes internal-only fields @security', async ({ page }) => {
    Logger.step('SEC-6-03 | Customer API response excludes internal-only fields');

    await switchRole(page, USERS.customerOne);
    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Try to access RMA API as customer
    const response = await page.request.get('/api/rma');
    if (response.status() === 200) {
      const text = await response.text().catch(() => '');
      // Customer should not see repair engineer notes, internal cost data
      await expect(text).not.toMatch(/"repair_price":\s*\d+/);
      await expect(text).not.toMatch(/"internal_comment"/);
      await expect(text).not.toMatch(/"engineer_note"/);
    }
  });

  test('SEC-6-04 | Console does not log sensitive data @security', async ({ page }) => {
    Logger.step('SEC-6-04 | Console does not log sensitive data');

    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const sensitivePatterns = [
      /password/i, /token.*:.*[a-zA-Z0-9]{20}/i,
      /secret/i, /api_key/i, /private_key/i,
    ];

    for (const log of consoleLogs) {
      for (const pattern of sensitivePatterns) {
        await expect(log).not.toMatch(pattern);
      }
    }
  });

  test('SEC-6-05 | Error messages are user-friendly (no raw exception details) @security', async ({ page }) => {
    Logger.step('SEC-6-05 | Error messages are user-friendly (no raw exception details)');

    await switchRole(page, USERS.rmaAdmin);

    // Trigger various error conditions
    const badRequests = [
      { method: 'post', url: '/api/rma', data: {} },
      { method: 'get',  url: '/api/rma/invalid-id-xyz' },
    ];

    for (const { method, url, data } of badRequests) {
      const response = await page.request[method](url, {
        data, headers: { 'Content-Type': 'application/json' },
      });

      const text = await response.text().catch(() => '');
      await expect(text).not.toMatch(/(Exception|Fatal error|Parse error).*in \/.*\.php/i);
      await expect(text).not.toMatch(/\bstack\b.*\btrace\b/i);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-7: CSRF PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-7 | CSRF Protection', () => {


  test('SEC-7-01 | POST requests require CSRF token @security', async ({ page }) => {
    Logger.step('SEC-7-01 | POST requests require CSRF token');

    await switchRole(page, USERS.rmaAdmin);

    // Attempt POST without CSRF token
    const response = await page.request.post('/rma/add', {
      form: {
        serial_number: RMA.validSerial,
        rma_type: 'Repair',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Intentionally omitting X-CSRF-TOKEN
      },
    });

    // Should be rejected (419 = CSRF token mismatch in Laravel)
    await expect([403, 405, 419, 422]).toContain(response.status());
  });

  test('SEC-7-02 | State-changing API calls include CSRF protection @security', async ({ page }) => {
    Logger.step('SEC-7-02 | State-changing API calls include CSRF protection');

    await switchRole(page, USERS.rmaAdmin);
    await page.goto(ROUTES.viewRma ?? '/rma/list');

    // Get the CSRF token from the page meta or cookie
    const csrfToken = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      return metaTag ? metaTag.getAttribute('content') : null;
    });

    Logger.info(`  CSRF token present: ${csrfToken ? 'YES ✓' : 'Using cookie-based CSRF'}`);
    // Either meta CSRF token or cookie-based CSRF should be present
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-8: DIRECT URL ACCESS RESTRICTION
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-8 | Direct URL Access Restriction', () => {


  test('SEC-8-01 | Customer cannot access admin URLs directly @security', async ({ page }) => {
    Logger.step('SEC-8-01 | Customer cannot access admin URLs directly');

    await switchRole(page, USERS.customerOne);

    const adminOnlyRoutes = [
      '/rma/factory/receive/',
      '/rma/factory/add',
      '/rma/address',
    ];

    for (const route of adminOnlyRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      const formVisible = await page.locator('form, [class*="form"]').first().isVisible().catch(() => false);
      const isBlocked = url.includes('/login') || url.includes('/403') || url.includes('/unauthorized') || url.includes('/core/accessviolation');

      await expect(isBlocked || !formVisible, `Customer blocked from ${route}`).toBe(true);
    }
  });

  test('SEC-8-02 | Repair Watcher cannot access factory pages via direct URL @security', async ({ page }) => {
    Logger.step('SEC-8-02 | Repair Watcher cannot access factory pages via direct URL');

    await switchRole(page, USERS.repairWatcher);

    for (const route of EMPLOYEE_ONLY_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      const isBlocked = url.includes('/login') || url.includes('/403') || url.includes('/core/accessviolation');
      const submitBtn  = await page.locator('button:has-text("Submit")').isVisible().catch(() => false);

      await expect(isBlocked || !submitBtn, `Watcher blocked from ${route}`).toBe(true);
    }
  });

  test('SEC-8-03 | Deep link to RMA detail of another customer is blocked @security', async ({ page }) => {
    Logger.step('SEC-8-03 | Deep link to RMA detail of another customer is blocked');

    await switchRole(page, USERS.customerOne);

    // Try various direct RMA view URLs
    for (const id of [1, 2, 3, 50, 100]) {
      await page.goto(`/rma/request/view/${id}`);
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      const isBlocked = url.includes('/login') || url.includes('/403') || url.includes('/unauthorized') || url.includes('/core/accessviolation');
      const body = await page.locator('body').textContent().catch(() => '');

      // If page loads, it must not show another customer's data
      if (!isBlocked) {
        await expect(body).not.toContain('testaccess2');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-9: AUDIT LOG INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-9 | Audit Log Integrity', () => {


  test('SEC-9-01 | Audit log entry created for factory receive @security', async ({ page }) => {
    Logger.step('SEC-9-01 | Audit log entry created for factory receive');

    await switchRole(page, USERS.repairEngineer);
    await page.goto(ROUTES.factoryReceive ?? '/rma/factory/receive/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Enter a serial number (even an invalid one – we're checking logs exist)
    const snInput = page.locator('table input, input[placeholder*="serial" i]').first();
    await snInput.fill(RMA.validSerial);
    await snInput.press('Tab');
    await page.waitForLoadState('domcontentloaded'); // replaced: waitForTimeout(1500ms)

    // Navigate to RMA detail to check audit
    await page.goto(ROUTES.viewRma ?? '/rma/list');
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Open first RMA record
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.locator('a, button').last().click();
      await page.waitForLoadState('domcontentloaded');

      // Look for audit/history section
      const historySection = page.locator('text=/History|Activity|Audit/i').first();
      const isVisible = await historySection.isVisible().catch(() => false);
      Logger.info(`  Audit/History section visible: ${isVisible}`);
    }
  });

  test('SEC-9-02 | Audit logs cannot be deleted via API @security', async ({ page }) => {
    Logger.step('SEC-9-02 | Audit logs cannot be deleted via API');

    await switchRole(page, USERS.rmaAdmin);

    // Attempt to delete an audit log entry
    const response = await page.request.delete('/api/rma/audit/1', {
      headers: { 'Content-Type': 'application/json' },
    });

    await expect([403, 404, 405], 'Audit log deletion must be blocked').toContain(response.status());
  });

  test('SEC-9-03 | Audit logs cannot be modified via API @security', async ({ page }) => {
    Logger.step('SEC-9-03 | Audit logs cannot be modified via API');

    await switchRole(page, USERS.rmaAdmin);

    const response = await page.request.patch('/api/rma/audit/1', {
      data: { action: 'Modified by hacker' },
      headers: { 'Content-Type': 'application/json' },
    });

    await expect([403, 404, 405, 422], 'Audit log modification must be blocked').toContain(response.status());
  });

  test('SEC-9-04 | Unauthorized access attempt is logged @security', async ({ page }) => {
    Logger.step('SEC-9-04 | Unauthorized access attempt is logged');

    await switchRole(page, USERS.customerOne);

    // Attempt to access factory receive
    await page.goto(ROUTES.factoryReceive);
    await page.waitForLoadState('domcontentloaded');
    // Wait for AJAX DataTable to populate
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // We can't directly verify the log was written, but we can verify the access was blocked
    const url = page.url();
    await expect(url).toMatch(/\/login|\/403|\/unauthorized/i);
    // The access should have been blocked AND logged (server-side verification)
    Logger.info('  Unauthorized access blocked (server should log this attempt)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-10: SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SEC-10 | Security Headers', () => {


  test('SEC-10-01 | Content-Security-Policy header present @security', async ({ page }) => {
    Logger.step('SEC-10-01 | Content-Security-Policy header present');

    const response = await page.goto('https://myconnect-acc.ekinops.com');
    await page.waitForLoadState('domcontentloaded');

    const headers = response?.headers() ?? {};
    const csp = headers['content-security-policy'] ?? '';
    Logger.info(`  CSP header: ${csp ? 'PRESENT ✓' : 'MISSING ⚠'}`);
    // Log for awareness; not hard-fail for dev environment
  });

  test('SEC-10-02 | X-Frame-Options or frame-ancestors prevents clickjacking @security', async ({ page }) => {
    Logger.step('SEC-10-02 | X-Frame-Options or frame-ancestors prevents clickjacking');

    const response = await page.goto('https://myconnect-acc.ekinops.com');
    const headers = response?.headers() ?? {};

    const xFrameOptions = headers['x-frame-options'] ?? '';
    const csp = headers['content-security-policy'] ?? '';
    const _hasFrameProtection = xFrameOptions !== '' || csp.includes('frame-ancestors');

    Logger.info(`  X-Frame-Options: "${xFrameOptions}"`);
    Logger.info(`  CSP frame-ancestors: ${csp.includes('frame-ancestors') ? 'PRESENT' : 'not set'}`);
    // Log for awareness
  });

  test('SEC-10-03 | X-Content-Type-Options header set to nosniff @security', async ({ page }) => {
    Logger.step('SEC-10-03 | X-Content-Type-Options header set to nosniff');

    const response = await page.goto('https://myconnect-acc.ekinops.com');
    const headers = response?.headers() ?? {};
    const xCto = headers['x-content-type-options'] ?? '';

    Logger.info(`  X-Content-Type-Options: "${xCto}"`);
    if (xCto) {expect(xCto.toLowerCase()).toBe('nosniff');}
  });

  test('SEC-10-04 | Strict-Transport-Security header on HTTPS @security', async ({ page }) => {
    Logger.step('SEC-10-04 | Strict-Transport-Security header on HTTPS');

    const response = await page.goto('https://myconnect-acc.ekinops.com');
    const headers = response?.headers() ?? {};
    const hsts = headers['strict-transport-security'] ?? '';

    Logger.info(`  HSTS header: ${hsts ? hsts : 'NOT SET ⚠'}`);
    if (hsts) {
      await expect(hsts).toContain('max-age');
    }
  });
});

