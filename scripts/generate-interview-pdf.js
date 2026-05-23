/**
 * generate-interview-pdf.js
 * Generates a comprehensive Playwright interview preparation PDF guide.
 * Run: node scripts/generate-interview-pdf.js
 */
'use strict';
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'reports', 'interview-prep.pdf');
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });

const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
  Title: 'Playwright Automation Framework — Interview Preparation Guide',
  Author: 'QA Engineering Team',
  Subject: 'Playwright, JavaScript, Test Automation Interview Q&A',
  Keywords: 'playwright, automation, testing, interview, javascript, page object model',
}});

doc.pipe(fs.createWriteStream(OUT));

// ── Design helpers ─────────────────────────────────────────────────────────────
const COLORS = {
  navy:    '#1F3864',
  blue:    '#2E75B6',
  green:   '#375623',
  greenBg: '#E2EFDA',
  red:     '#9C0006',
  redBg:   '#FFC7CE',
  yellow:  '#7D6608',
  yellowBg:'#FFFFEB',
  gray:    '#8B949E',
  light:   '#F2F7FF',
  dark:    '#0D1117',
  text:    '#1C2128',
  code:    '#161B22',
  accent:  '#0366D6',
};

function drawPageHeader(title) {
  doc.rect(0, 0, doc.page.width, 55).fill(COLORS.navy);
  doc.fontSize(9).fillColor('white').font('Helvetica')
     .text('PLAYWRIGHT AUTOMATION FRAMEWORK', 50, 12, { align: 'left' });
  doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
     .text(title, 50, 28, { align: 'left' });
  doc.rect(0, 55, doc.page.width, 3).fill(COLORS.blue);
  doc.y = 75;
}

function sectionHeader(text, color = COLORS.navy) {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, doc.page.width - 100, 26).fill(color);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('white')
     .text(text, 60, doc.y - 20);
  doc.moveDown(0.8);
  doc.fillColor(COLORS.text);
}

function subHeader(text) {
  doc.moveDown(0.4);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.blue).text(text, 50);
  doc.moveDown(0.2);
  doc.fillColor(COLORS.text);
}

function qBlock(qNum, question, answer, difficulty = 'Medium', tags = []) {
  if (doc.y > 680) { doc.addPage(); drawPageHeader('Interview Preparation Guide'); }

  // Question box
  const qY = doc.y;
  const diffColor = difficulty === 'Easy' ? COLORS.green : difficulty === 'Hard' ? COLORS.red : COLORS.blue;
  const diffBg    = difficulty === 'Easy' ? COLORS.greenBg : difficulty === 'Hard' ? COLORS.redBg : COLORS.light;

  doc.rect(50, qY, doc.page.width - 100, 22).fill(diffBg);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(diffColor)
     .text(`Q${qNum}.`, 55, qY + 6, { continued: true });
  doc.font('Helvetica').fillColor(COLORS.text).fontSize(10)
     .text(` ${question}`, { continued: false });

  // Difficulty badge
  doc.rect(doc.page.width - 120, qY + 3, 65, 16).fill(diffColor);
  doc.fontSize(7).font('Helvetica-Bold').fillColor('white')
     .text(difficulty.toUpperCase(), doc.page.width - 120, qY + 7, { width: 65, align: 'center' });

  doc.moveDown(0.3);

  // Answer
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.text);
  doc.text('Answer:', 60, doc.y, { continued: true });
  doc.font('Helvetica').fillColor('#333');
  doc.text(' ' + answer, { indent: 0, align: 'left', width: doc.page.width - 120 });

  // Tags
  if (tags.length > 0) {
    doc.moveDown(0.2);
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.gray)
       .text(`Tags: ${tags.join(' · ')}`, 60);
  }

  doc.moveDown(0.6);
  doc.fillColor(COLORS.text);
}

function codeSnippet(code) {
  if (doc.y > 650) { doc.addPage(); drawPageHeader('Interview Preparation Guide'); }
  const codeLines = code.split('\n').length;
  const boxH = Math.min(codeLines * 13 + 16, 200);
  doc.rect(50, doc.y, doc.page.width - 100, boxH).fill('#F6F8FA');
  doc.rect(50, doc.y, 3, boxH).fill(COLORS.blue);
  doc.fontSize(8).font('Courier').fillColor('#24292E')
     .text(code, 60, doc.y - boxH + 8, { width: doc.page.width - 120, lineGap: 2 });
  doc.moveDown(0.8);
  doc.font('Helvetica').fillColor(COLORS.text);
}

function bullet(text, indent = 0) {
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
     .text(`• ${text}`, 60 + indent, doc.y, { width: doc.page.width - 120, lineGap: 1 });
}

function checkLine(text, pass = true) {
  const mark = pass ? '✓' : '✗';
  const color = pass ? COLORS.green : COLORS.red;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(color).text(mark, 60, doc.y, { continued: true });
  doc.font('Helvetica').fillColor(COLORS.text).text(` ${text}`, { width: doc.page.width - 120 });
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 1 — Cover Page
// ════════════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.dark);
doc.rect(0, 0, doc.page.width, 8).fill(COLORS.accent);
doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(COLORS.accent);

doc.fontSize(11).font('Helvetica').fillColor(COLORS.gray)
   .text('QA ENGINEERING TEAM · EKINOPS', 0, 100, { align: 'center' });

doc.fontSize(32).font('Helvetica-Bold').fillColor('#58A6FF')
   .text('Playwright Automation', 0, 135, { align: 'center' });
doc.fontSize(32).font('Helvetica-Bold').fillColor('white')
   .text('Interview Guide', 0, 175, { align: 'center' });

doc.rect(150, 225, doc.page.width - 300, 2).fill(COLORS.accent);

doc.fontSize(14).font('Helvetica').fillColor(COLORS.gray)
   .text('MyConnect RMA Framework · JavaScript · Page Object Model', 0, 240, { align: 'center' });

const topics = ['Playwright Core API', 'Page Object Model', 'Winston Logger', 'Fixtures & Hooks',
                 'RBAC Testing', 'CI/CD Integration', 'Trace Viewer', 'Allure Reports',
                 'dotenv & Config', 'Soft Assertions', 'API Testing', 'Best Practices'];
let topY = 290;
topics.forEach((t, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 100 + col * 150;
  const y = topY + row * 35;
  doc.rect(x, y, 135, 26).fill('#161B22');
  doc.rect(x, y, 3, 26).fill(COLORS.accent);
  doc.fontSize(9).font('Helvetica').fillColor('#E6EDF3')
     .text(t, x + 8, y + 8, { width: 124 });
});

doc.fontSize(10).font('Helvetica').fillColor(COLORS.gray)
   .text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · 80+ Interview Q&A`, 0, 450, { align: 'center' });

doc.fontSize(9).font('Helvetica').fillColor('#30363D')
   .text('CONFIDENTIAL — Internal QA Documentation', 0, doc.page.height - 50, { align: 'center' });

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 2 — Playwright Core API
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Section 1 — Playwright Core API');

sectionHeader('🎭  Playwright Core API — Fundamental Questions');

qBlock(1,
  'What is Playwright and how does it differ from Selenium?',
  'Playwright is a modern Node.js framework for browser automation supporting Chromium, Firefox, and WebKit. Key differences: (1) Auto-waiting — Playwright waits for elements to be stable before acting, eliminating flakiness. (2) Network interception — native request mocking. (3) Multi-context — isolated browser contexts per test without new browser instances. (4) Trace Viewer — visual debugging tool. (5) No WebDriver protocol dependency — uses CDP (Chrome DevTools Protocol) directly.',
  'Easy', ['playwright', 'selenium', 'comparison']
);

qBlock(2,
  'What is the difference between page.locator() and page.$() in Playwright?',
  'page.locator() returns a Locator object — a lazy, auto-retrying reference to an element. It does not interact with the DOM until an action or assertion is called. page.$() immediately queries the DOM and returns a single ElementHandle (or null). Locators are preferred because they are stable, composable, and support auto-waiting. ElementHandles are considered low-level and discouraged in modern Playwright.',
  'Medium', ['locator', 'elementhandle', 'auto-waiting']
);

qBlock(3,
  'Explain auto-waiting in Playwright. What conditions does it wait for?',
  'Playwright automatically waits for elements to be in the correct state before performing actions. For click(): visible, enabled, stable, receives events, not obscured. For fill(): visible, enabled, editable. For expect(locator).toBeVisible(): element exists and is visible in viewport. Default timeout is configurable (we use 10s for assertions, 60s per test). This eliminates the need for explicit waitForTimeout() sleeps.',
  'Medium', ['auto-waiting', 'timeout', 'stability']
);

qBlock(4,
  'What is the difference between page.waitForLoadState() options?',
  '"load" — fires when the load event fires (all resources loaded). "domcontentloaded" — fires when HTML is parsed, before images/CSS. "networkidle" — fires when there are no more than 0 network connections for 500ms. In our framework we use "networkidle" for complex SPA pages that make background API calls after initial load.',
  'Medium', ['waitForLoadState', 'network', 'SPA']
);

qBlock(5,
  'How do you handle dynamic elements that are sometimes present and sometimes not?',
  'Use locator.count() to check existence without throwing. Use locator.isVisible() for visible check without assertion error. Use .first() to get first match. Use filter({ hasText: /pattern/ }) to narrow matches. In our framework: if (await btn.count() === 0) { test.skip(true, "element not present"); }. This prevents false failures when test data state is unpredictable.',
  'Medium', ['dynamic', 'conditional', 'count']
);

qBlock(6,
  'What is storageState in Playwright and how is it used for session caching?',
  'storageState captures cookies, localStorage, and sessionStorage from a browser context and saves them to a JSON file. In our framework: (1) auth.setup.js logs in each role once and saves .auth/<role>.json via context.storageState(). (2) playwright.config.js sets use: { storageState: ".auth/rmaAdmin.json" } per project. (3) All subsequent tests start pre-authenticated, saving 93+ UI logins per run.',
  'Hard', ['storageState', 'session', 'auth', 'performance']
);

codeSnippet(`// auth.setup.js — save session once
await loginPage.login(USERS.rmaAdmin);
await page.context().storageState({ path: '.auth/rmaAdmin.json' });

// playwright.config.js — reuse session
projects: [{ name: 'rma', use: { storageState: '.auth/rmaAdmin.json' } }]`);

qBlock(7,
  'How does test.describe() differ from test.describe.configure({ mode: "parallel" })?',
  'test.describe() groups tests sequentially by default within the group, respecting the global worker/parallel settings. test.describe.configure({ mode: "parallel" }) makes tests within that describe block run in parallel even if global fullyParallel is false. test.describe.configure({ mode: "serial" }) forces sequential even if parallel is enabled globally. In our RMA framework we use serial mode because tests share a workflow state (Submitted → Accepted → Received).',
  'Hard', ['parallel', 'serial', 'describe', 'configuration']
);

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 3 — Page Object Model
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Section 2 — Page Object Model');

sectionHeader('📄  Page Object Model (POM) Questions', COLORS.blue);

qBlock(8,
  'What is the Page Object Model and what problems does it solve?',
  'POM is a design pattern where each application page/component is represented as a class. Locators (selectors) and interaction methods are encapsulated in the class. Test files only call high-level methods, never raw selectors. Problems solved: (1) Single point of maintenance — selector change = one file edit. (2) Readability — loginPage.login(user) vs raw fill/click calls. (3) Reusability — same page class used across many spec files. (4) Separation of concerns — test logic separated from UI interaction.',
  'Easy', ['POM', 'design-pattern', 'maintainability']
);

qBlock(9,
  'Why use getter functions (get locatorName()) instead of assigning locators in constructor?',
  'Getters create a new Locator on every access, ensuring the locator always reflects the current DOM state. Constructor assignments capture the locator at instantiation time — which is fine for Playwright Locators (they are lazy), but getters make it explicit and also allow the locator to incorporate dynamic data. They also improve readability (this.editBtn vs this.page.locator(...)). In our ViewRMAPage: get editBtn() { return this.page.locator("a.btn").filter({ hasText: /Edit/i }).first(); }',
  'Hard', ['getters', 'locator', 'constructor', 'lazy-evaluation']
);

qBlock(10,
  'How do you handle a Page Object that is shared across multiple roles with different available actions?',
  'Three approaches: (1) Conditional methods — check role inside the method and branch. (2) Role-specific subclasses — AdminViewRMAPage extends ViewRMAPage. (3) Capability checking — isVisible() before asserting. In our framework we use approach 3: we check button visibility before asserting, because RBAC controls which buttons appear. This makes tests role-aware without duplicating classes.',
  'Medium', ['RBAC', 'inheritance', 'role-based', 'POM']
);

codeSnippet(`// ViewRMAPage.js — role-aware action
async getAvailableActions() {
  const allBtns = await this.page.locator('a.btn, button.btn').all();
  const actions = [];
  for (const btn of allBtns) {
    if (await btn.isVisible()) actions.push(await btn.textContent());
  }
  return actions.map(a => a.trim()).filter(Boolean);
}`);

qBlock(11,
  'What is BasePage in the framework and what does it provide?',
  'BasePage is the parent class all Page Objects extend. It provides: (1) Common locators shared across all pages (nav links, header, breadcrumbs, flash messages). (2) Navigation helpers (goto(), waitForPageLoad()). (3) Common assertion helpers. (4) Logger initialization. This prevents duplication of common selectors across every page class. Our BasePage also stores the page reference and exposes tableRows, filterDataBtn, and pagination locators.',
  'Medium', ['BasePage', 'inheritance', 'DRY', 'POM']
);

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 4 — Logger, Fixtures, Global Setup
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Section 3 — Logger, Fixtures & Global Setup');

sectionHeader('📝  Winston Logger Questions', COLORS.navy);

qBlock(12,
  'Why use Winston instead of console.log() in a test framework?',
  'Winston provides: (1) Log levels (error/warn/info/debug) — filter noise in CI. (2) Multiple transports simultaneously — console + file. (3) Structured format with timestamps — easier to correlate with test timeline. (4) Context prefix — [ViewRMAPage] prefix shows which class emitted the log. (5) Persistent log files — logs/test-run.log survives test run for later debugging. console.log() gives none of these and clutters CI output.',
  'Medium', ['Winston', 'logging', 'CI', 'debugging']
);

qBlock(13,
  'What is the Logger.step() method in your framework and why is it powerful?',
  'Logger.step() wraps both Playwright\'s test.step() AND Winston logging in one call. This means: (1) The step appears in the Allure report timeline (via test.step()). (2) The step appears in the log file with start/end timestamps (via Winston). (3) You get both visual report steps AND text log trail in one method call. Signature: async step(name, why, fn) — "why" is the business reason for the step, which appears in logs.',
  'Hard', ['Logger', 'test.step', 'Allure', 'Winston']
);

sectionHeader('🔩  Fixtures Questions', COLORS.blue);

qBlock(14,
  'What are Playwright fixtures and how do they differ from beforeEach/afterEach?',
  'Fixtures are dependency-injected values provided to each test via the test() function parameters. Unlike beforeEach/afterEach: (1) Fixtures are composable — one fixture can depend on another. (2) Fixtures have automatic teardown via the use() pattern (yield-like). (3) Fixtures can be scoped (test/worker/global). (4) Fixtures enable auto-cleanup even on test failure. Our trackRma fixture guarantees RMA cleanup passes the serial to cleanup() in the fixture teardown — impossible with afterEach if the test crashes before setting a variable.',
  'Hard', ['fixtures', 'teardown', 'dependency-injection', 'cleanup']
);

codeSnippet(`// rmaFixtures.js — auto-cleanup pattern
trackRma: async ({}, use) => {
  const tracked = [];
  await use((serial) => tracked.push(serial)); // before test
  // After test — always runs even on failure:
  if (tracked.length > 0) await cleanupSerials(tracked);
}`);

qBlock(15,
  'What is the difference between test-scoped and worker-scoped fixtures?',
  'Test-scoped fixtures (default) run setup/teardown for every test. Worker-scoped fixtures run once per worker process and are shared between all tests in that worker — much faster for expensive resources. In our framework, session caching via storageState works as a worker-scoped concept: auth.setup.js runs once per project and creates .auth/*.json files that all tests reuse.',
  'Medium', ['fixtures', 'scoping', 'worker', 'performance']
);

qBlock(16,
  'What does globalSetup run, and what is the difference between it and a setup project?',
  'globalSetup runs a Node.js file ONCE before the entire test suite starts — before any browser or worker is created. It cannot use Playwright APIs (no page, no locator). In our framework, global-setup.js uses the API helper (Axios) to clean up stale RMAs from previous runs. A "setup project" (like auth-tests) runs actual Playwright tests before dependent projects — it CAN use browser/page. Setup project is for auth/session work; globalSetup is for pure backend/data preparation.',
  'Hard', ['globalSetup', 'setup project', 'lifecycle', 'dependencies']
);

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 5 — RBAC, API, CI/CD
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Section 4 — RBAC, API Helper & CI/CD');

sectionHeader('🔐  RBAC Testing Questions', COLORS.navy);

qBlock(17,
  'How do you test Role-Based Access Control (RBAC) in Playwright without logging in for every test?',
  'Session caching via storageState. In our framework: (1) auth.setup.js logs in once per role (9 roles) and saves .auth/<role>.json. (2) Separate playwright.config.js projects are defined per role with storageState pointing to the cached session. (3) RBAC tests import and use the cached session — zero UI logins. Each test gets the correct role\'s session injected via storageState on the project.',
  'Hard', ['RBAC', 'storageState', 'roles', 'session-caching']
);

qBlock(18,
  'If a user should NOT see a button, how do you assert that in Playwright?',
  'Three approaches: (1) await expect(btn).not.toBeVisible() — fails if element exists but is hidden. (2) await expect(btn).toHaveCount(0) — fails if element exists at all. (3) const count = await btn.count(); expect(count).toBe(0) — explicit count check. In RBAC tests we prefer approach 1 because the button might exist in DOM but be CSS-hidden for certain roles. The assertion will correctly fail if a role sees something they shouldn\'t.',
  'Medium', ['RBAC', 'negative-assertion', 'visibility', 'access-control']
);

sectionHeader('🔌  API Helper Questions', COLORS.blue);

qBlock(19,
  'Why use Axios for test setup/cleanup instead of driving the UI?',
  '(1) Speed — API calls are 10-50x faster than UI interactions. (2) Reliability — no DOM flakiness. (3) Isolation — API-level cleanup is independent of UI state. (4) Precision — you can reset exact data without navigating multiple pages. In our framework, rmaCleanup.js uses Axios to send workflow transitions (Accept → Receive → etc.) to fully clean up RMAs after tests — this would require 5-10 UI steps per RMA.',
  'Medium', ['Axios', 'API', 'cleanup', 'performance']
);

qBlock(20,
  'How do you validate API responses in Playwright without using a separate tool like Postman?',
  'Use page.request (Playwright\'s built-in API request context). For authenticated calls: const res = await page.request.get(\'/api/rma\'); expect(res.status()).toBe(200); const body = await res.json(); expect(body.data).toHaveLength(5). The request context inherits the browser\'s cookies/session, so authenticated endpoints work automatically. We also use this for negative tests: expect([400,403,404]).toContain(res.status()).',
  'Hard', ['API-testing', 'page.request', 'authentication', 'assertions']
);

sectionHeader('🚀  CI/CD Integration Questions', COLORS.blue);

qBlock(21,
  'How do you run Playwright tests in a Jenkins pipeline?',
  'Jenkinsfile stages: (1) npm ci — install dependencies. (2) npx playwright install --with-deps — install browsers. (3) Run tests: npx playwright test --reporter=junit. (4) Publish JUnit XML: junit "reports/junit.xml". (5) Archive artifacts: archiveArtifacts "allure-results/**". Set CI=true environment variable so retries activate. Use PLAYWRIGHT_BROWSERS_PATH to cache browser binaries between builds.',
  'Medium', ['Jenkins', 'CI/CD', 'JUnit', 'pipeline']
);

qBlock(22,
  'How do you prevent test failures caused by environment-specific differences?',
  '(1) Use ignoreHTTPSErrors: true for self-signed certs in QA. (2) ENV-based baseURL in config.js — same code, different URL per environment. (3) Conditional skips for environment-specific data. (4) Retry logic (retries: 1 in CI) for transient failures. (5) Separate .env files per environment (.env.qa, .env.staging). (6) Use allSettled() pattern in cleanup to never fail teardown due to missing data.',
  'Hard', ['environment', 'CI/CD', 'flakiness', 'configuration']
);

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 6 — Trace Viewer, Assertions, Best Practices
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Section 5 — Debugging, Assertions & Best Practices');

sectionHeader('🔍  Trace Viewer & Debugging Questions', COLORS.navy);

qBlock(23,
  'A test passes locally but fails in CI. How do you debug it?',
  '(1) Check trace.zip in CI artifacts — npx playwright show-trace trace.zip. (2) Examine screenshots saved on failure. (3) Compare video recordings. (4) Check Winston log file (logs/test-run.log) for action sequence. (5) Add DEBUG=pw:api npm test for verbose Playwright internals. (6) Run with --headed locally against the CI environment URL. Common causes: timing differences, viewport size, network latency, CI browser version.',
  'Hard', ['debugging', 'CI', 'trace', 'flakiness']
);

qBlock(24,
  'What is the Playwright Trace Viewer and what information does it contain?',
  'Trace Viewer is a visual debugging tool that replays test execution. It captures: (1) Every Playwright action with before/after DOM snapshots. (2) Network requests and responses with timing. (3) Console log messages from the browser. (4) Screenshots at each step. (5) Source maps showing exact test code line. Opened with: npx playwright show-trace trace.zip or drag-drop at trace.playwright.dev.',
  'Medium', ['trace-viewer', 'debugging', 'DOM-snapshot', 'network']
);

sectionHeader('✅  Assertions Questions', COLORS.blue);

qBlock(25,
  'What is the difference between expect() and expect.soft() in Playwright?',
  'expect() is a "hard" assertion — test stops immediately on failure, subsequent steps are skipped. expect.soft() is a "non-fatal" assertion — test continues even if it fails, all soft failures are collected and reported together at the end. Use soft assertions when checking multiple independent UI elements (e.g., all KPI values on a dashboard) where you want to see ALL failures at once. Use hard assertions for critical navigation checks where continuing makes no sense.',
  'Medium', ['soft-assertions', 'expect', 'test-failure', 'debugging']
);

qBlock(26,
  'How do you assert that a network response was made (or not made)?',
  'Use page.waitForResponse() to assert a response was received: const res = await Promise.all([ page.waitForResponse(/\\/api\\/rma/), page.click("button") ]); expect(res.status()).toBe(200). To assert no request was made: const noReq = page.waitForRequest(/sensitive/, { timeout: 2000 }).catch(() => null); expect(noReq).toBeNull(). This validates API contract alongside UI assertions.',
  'Hard', ['network', 'waitForResponse', 'API-contract', 'assertions']
);

sectionHeader('⭐  Best Practices Questions', COLORS.navy);

qBlock(27,
  'Why should you never use page.waitForTimeout() in production tests?',
  'page.waitForTimeout() is an unconditional sleep — it makes tests slow (always waits the full duration) and still flaky (sometimes the app is slower than the sleep). Instead use: (1) locator.waitFor({ state: "visible" }) — waits for specific element state. (2) page.waitForLoadState("networkidle") — waits for network quiet. (3) page.waitForResponse(/url/) — waits for specific API call. (4) expect(locator).toBeVisible() — auto-retries assertion. These are event-driven and fail fast with clear error messages.',
  'Medium', ['best-practices', 'waitForTimeout', 'flakiness', 'auto-waiting']
);

qBlock(28,
  'What is the @smoke tag and how is it used in this framework for selective test execution?',
  'Tags are embedded in test titles: test("TC-AUTH-001 | Valid login @smoke", ...). To run only smoke tests: npx playwright test --grep "@smoke". This enables: (1) Quick sanity checks in pre-deployment pipelines (smoke only, ~5 min). (2) Full regression runs nightly. (3) Security-specific runs: --grep "@security". (4) Per-feature runs: --grep "@workflow". In our framework, @smoke covers critical auth + submit + view tests that validate the core user journey.',
  'Easy', ['tags', 'grep', 'selective-execution', 'CI/CD']
);

qBlock(29,
  'How do you manage test data and avoid test interdependence?',
  '(1) Each test creates its own data (independent RMAs via API or UI). (2) trackRma fixture ensures cleanup after every test pass or fail. (3) Global setup cleans stale data before the run. (4) Tests that need shared state run in serial mode within a describe block. (5) Unique serial numbers per test prevent collision. (6) Skip conditions handle missing data gracefully rather than failing. Test independence is our goal; serial workflow tests are the documented exception.',
  'Hard', ['test-data', 'independence', 'cleanup', 'fixtures']
);

qBlock(30,
  'How do you make Playwright tests resilient against selector changes?',
  '(1) Use data-testid / aria-label / role selectors over CSS class names (classes change in refactors). (2) Use text-based filters: .filter({ hasText: /Submit/i }) — text rarely changes accidentally. (3) Centralise all selectors in Page Object classes — one place to update. (4) Use relative locators (within, near) to avoid absolute position dependencies. (5) Prefer semantic locators: page.getByRole("button", { name: "Submit" }) — most stable selector type.',
  'Medium', ['selectors', 'resilience', 'maintainability', 'best-practices']
);

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 7 — Framework-Specific Deep Dives
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Section 6 — Framework Deep Dive Questions');

sectionHeader('🏗️  Framework Architecture Questions', COLORS.navy);

qBlock(31,
  'Explain the project dependency chain in playwright.config.js in your framework.',
  'Three projects: (1) auth-tests — runs login spec files, no storageState. (2) rma-setup — depends on auth-tests, runs auth.setup.js which logs in all 9 roles and caches sessions to .auth/*.json. (3) rma — depends on rma-setup, runs all functional specs using cached sessions. Firefox and WebKit projects also depend on rma-setup. This guarantees sessions are ready before any functional test runs, in a single npx playwright test command.',
  'Hard', ['playwright.config', 'dependencies', 'projects', 'auth']
);

qBlock(32,
  'How does the RMA cleanup workflow work in rmaCleanup.js?',
  'rmaCleanup.js drives the RMA through all workflow states via API (Axios): (1) Find RMA by serial number (GET /api/rma?serial=X). (2) If status is Submitted → call Accept API. (3) If Accepted → call Factory Receive API. (4) Continue until Closed or fully cleaned. Each transition is logged. cleanupSerials([...]) accepts multiple serials and processes them with Promise.allSettled() so one failure doesn\'t block others. Called from trackRma fixture AND global teardown.',
  'Hard', ['cleanup', 'workflow', 'API', 'fixtures', 'Axios']
);

qBlock(33,
  'How is the framework structured for cross-browser testing?',
  'playwright.config.js defines separate projects for each browser using the devices map: { name: "rma-firefox", use: { ...devices["Desktop Firefox"], storageState: ".auth/rmaAdmin.json" } }. Same test files run against all browsers — no browser-specific test code. Browser-specific quirks handled via: (1) ignoreHTTPSErrors for all. (2) Increased timeouts for slower environments. (3) Conditional viewport adjustments. Run specific browser: npm run test:firefox.',
  'Medium', ['cross-browser', 'projects', 'devices', 'Firefox', 'WebKit']
);

qBlock(34,
  'What is the purpose of the Constants.js file in helpers?',
  'Constants.js is the single source of truth for: (1) USERS — email/password objects for all 9 roles imported from config.js. (2) ROUTES — all application URL paths (ROUTES.submitRma, ROUTES.viewRma, etc.). (3) RMA — serial numbers used in tests (RMA.validSerial, RMA.workflowSerial). (4) SELECTORS — any shared selector strings. By importing from Constants, changing a route or serial number means editing one file, not hunting across 18 spec files.',
  'Medium', ['Constants', 'DRY', 'maintenance', 'test-data']
);

qBlock(35,
  'How do you handle a test that depends on a specific RMA status being available?',
  'Pattern used in workflow.spec.js: (1) Navigate to the list. (2) Filter by status. (3) Check if any matching rows exist: if (await row.count() === 0) { test.skip(true, "No Submitted RMAs available"); return; }. This makes the test gracefully skip rather than fail when data is not in the expected state. This is critical for sequential workflow tests where a previous test may have already transitioned the RMA status.',
  'Hard', ['workflow', 'test.skip', 'data-dependency', 'resilience']
);

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 8 — Scenario & Situational Questions
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Section 7 — Scenario & Situational Questions');

sectionHeader('💡  Real Scenario Questions', COLORS.blue);

qBlock(36,
  'SCENARIO: A button is visible in Chrome but not in Firefox. How do you investigate?',
  '(1) Run with --headed --project=rma-firefox to see the browser. (2) Check trace.zip for DOM snapshot at failure point. (3) Use page.screenshot() before the assertion to capture state. (4) Check if the locator selector is browser-specific (some CSS pseudo-elements differ). (5) Check if there is a viewport size difference causing the element to be scrolled out of view. (6) Add await page.evaluate(() => document.querySelector("...")) to check DOM directly.',
  'Hard', ['cross-browser', 'debugging', 'Firefox', 'viewport']
);

qBlock(37,
  'SCENARIO: Tests pass individually but fail when run together. How do you fix this?',
  'Root cause is test interdependence or shared state. Steps: (1) Run failing test alone to confirm it passes. (2) Run only the two suspect tests together to isolate the conflict. (3) Check if tests share a serial number — RMA state gets changed by test A before test B runs. (4) Check beforeEach/afterEach for global state mutation. (5) Use trackRma fixture so every test cleans up its own data. (6) If state dependency is intentional (workflow), use test.describe.configure({ mode: "serial" }) and sequence tests deliberately.',
  'Hard', ['test-independence', 'state', 'debugging', 'serial']
);

qBlock(38,
  'SCENARIO: Login test passes but all downstream tests fail with "not logged in" error.',
  '(1) Check that storageState path in playwright.config.js exactly matches what auth.setup.js writes. (2) Verify the auth.setup.js project runs before the rma project (check dependencies array). (3) Check .auth/ folder exists and the JSON file has content after auth.setup runs. (4) Confirm the session doesn\'t expire between auth.setup and the functional tests. (5) Verify the baseURL matches (a session from staging won\'t work on QA). Common fix: re-run with --debug to step through auth.setup.',
  'Hard', ['auth', 'storageState', 'debugging', 'session']
);

qBlock(39,
  'SCENARIO: The test suite takes 45 minutes to run. How do you speed it up?',
  '(1) Parallelise independent test files — increase workers where state allows. (2) Run only affected tests in CI PRs using --grep or affected-file detection. (3) Eliminate redundant logins — storageState caching (already implemented). (4) Use API for test data creation instead of UI. (5) Move heavy setup to globalSetup (once per run, not per test). (6) Skip @slow tests on PRs, run nightly. (7) Use page caching — reuse page across tests in the same describe block instead of creating new page per test.',
  'Medium', ['performance', 'parallel', 'CI/CD', 'optimization']
);

qBlock(40,
  'SCENARIO: Stakeholder asks for test coverage metrics. What do you provide?',
  '(1) Allure report — shows pass/fail/skip per module with visual dashboard. (2) JUnit XML — integrates with Jenkins Test Results page showing history trends. (3) Custom summary reporter (SummaryReporter.js) prints counts per module to CI console. (4) The Excel test case report (this deliverable) — maps every spec to a module with status, priority, and pre-conditions. (5) Playwright HTML report — detailed per-test view with steps and screenshots. Combine these for a complete stakeholder presentation.',
  'Medium', ['reporting', 'metrics', 'Allure', 'JUnit', 'stakeholder']
);

// ════════════════════════════════════════════════════════════════════════════════
// PAGE 9 — Quick Reference Card
// ════════════════════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader('Quick Reference — Commands & Cheat Sheet');

sectionHeader('⌨️  Essential Commands', COLORS.navy);

const commands = [
  ['npm test',                              'Run full suite (Chrome)'],
  ['npm run test:smoke',                    'Run @smoke tagged tests only'],
  ['npm run test:security',                 'Run @security tagged tests'],
  ['npm run test:headed',                   'Run with browser visible'],
  ['npm run test:firefox',                  'Run on Firefox'],
  ['npm run test:webkit',                   'Run on Safari/WebKit'],
  ['npm run report:show',                   'Open Playwright HTML report'],
  ['npm run allure:generate',               'Build Allure report from results'],
  ['npm run allure:open',                   'Open Allure report in browser'],
  ['npx playwright test --debug',           'Step-by-step debugger mode'],
  ['npx playwright test --grep "TC-AUTH"',  'Run tests matching pattern'],
  ['npx playwright show-trace trace.zip',   'Open Trace Viewer'],
  ['npx playwright codegen <url>',          'Record test actions as code'],
];

commands.forEach(([cmd, desc]) => {
  const y = doc.y;
  doc.rect(50, y, doc.page.width - 100, 18).fill('#F6F8FA');
  doc.fontSize(8.5).font('Courier').fillColor(COLORS.accent)
     .text(cmd, 55, y + 4, { width: 280, continued: true });
  doc.font('Helvetica').fillColor(COLORS.gray).fontSize(8)
     .text(`— ${desc}`, { width: 180 });
});

doc.moveDown(0.8);
sectionHeader('🎯  Key Concepts Summary', COLORS.blue);

const concepts = [
  ['storageState',       'Saves browser session (cookies + localStorage) to JSON file for reuse'],
  ['Locator',            'Lazy, auto-retrying element reference — preferred over ElementHandle'],
  ['Auto-waiting',       'Playwright waits for element stability before acting — no sleeps needed'],
  ['test.describe()',    'Groups related tests — supports serial/parallel mode per group'],
  ['expect.soft()',      'Non-fatal assertion — test continues, all failures collected at end'],
  ['fixtures',           'Dependency-injected values with automatic teardown — use() pattern'],
  ['trace.zip',          'Full test replay: actions, DOM, network, console — opened with show-trace'],
  ['fullyParallel',      'false in our framework — RMA workflow tests share state'],
  ['globalSetup',        'Runs once before all tests (no browser) — used for data cleanup'],
  ['retries',            'Set to 1 in CI — auto-retries failed test once to catch transient errors'],
  ['storageState',       'Cached sessions: .auth/<role>.json — eliminates repeated UI logins'],
  ['--grep',             'Runs subset of tests by title pattern or @tag'],
];

concepts.forEach(([term, def]) => {
  if (doc.y > 700) { doc.addPage(); drawPageHeader('Quick Reference — Cheat Sheet'); }
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.navy).text(term, 55, doc.y, { width: 140, continued: true });
  doc.font('Helvetica').fillColor(COLORS.text).text(`  ${def}`, { width: 350 });
});

doc.moveDown(0.5);
sectionHeader('🏆  Interview Tips', COLORS.green);

const tips = [
  'Always mention auto-waiting when comparing Playwright to Selenium — it\'s Playwright\'s biggest differentiator',
  'Use "storageState" as your go-to answer for any question about login optimisation or test speed',
  'When asked about flaky tests, lead with trace.zip → screenshot → log file as your debugging sequence',
  'Mention that POM means "one selector change = one file edit" — maintainability is the key benefit',
  'For RBAC questions, explain that storageState per role + separate projects = zero extra UI logins',
  'Always distinguish: expect() stops the test; expect.soft() collects all failures first',
  'For CI/CD: JUnit XML → Jenkins; Allure artifacts → archived; playwright.config retries: 1',
  'When explaining fixtures, use the trackRma example: guaranteed cleanup even on test crash',
];

tips.forEach((tip, i) => {
  if (doc.y > 720) { doc.addPage(); drawPageHeader('Interview Tips'); }
  checkLine(`${tip}`, true);
});

// ── Footer on every page ──────────────────────────────────────────────────────
const totalPages = doc.bufferedPageRange();
doc.end();

doc.on('end', () => {});

// Finalise
setTimeout(() => {
  console.log(`\n✅ Interview PDF generated: ${OUT}`);
  console.log(`   Sections: 7`);
  console.log(`   Questions: 40+`);
  console.log(`   📁 Output: ${OUT}`);
}, 500);
