/**
 * generate-pptx.js
 * Generates a premium 20-slide PowerPoint presentation from actual framework code.
 * Run: node scripts/generate-pptx.js
 */
'use strict';
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'reports', 'framework-presentation.pptx');

// ── Read actual file snippets ─────────────────────────────────────────────────
function readSnippet(filePath, startLine = 1, endLine = 999) {
  try {
    const lines = fs.readFileSync(path.join(ROOT, filePath), 'utf8').split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  } catch (_) { return '// File not found'; }
}

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author  = 'QA Engineering Team';
pptx.company = 'Ekinops — MyConnect RMA';
pptx.subject = 'Playwright Automation Framework Presentation';
pptx.title   = 'Playwright Automation Framework — MyConnect RMA';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const BG        = '0D1117';   // dark bg
const ACCENT    = '58A6FF';   // blue accent
const ACCENT2   = '3FB950';   // green accent
const TEXT      = 'E6EDF3';   // light text
const SUBTEXT   = '8B949E';   // muted text
const HEADER_BG = '161B22';   // header bar bg
const CODE_BG   = '1C2128';   // code block bg
const YELLOW    = 'F0883E';   // orange/yellow accent
const RED       = 'FF7B72';   // red accent

// ── Helpers ───────────────────────────────────────────────────────────────────
function addSlide({ titleText, subtitleText, notes = '' } = {}) {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  // Top header bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.55, fill: { color: HEADER_BG }, line: { color: HEADER_BG } });

  // Title in header
  if (titleText) {
    slide.addText(titleText, {
      x: 0.2, y: 0.05, w: 9.0, h: 0.45,
      fontSize: 18, bold: true, color: ACCENT,
      fontFace: 'Calibri', valign: 'middle',
    });
  }

  // Slide number (right side of header)
  if (notes) slide.addNotes(notes);
  return slide;
}

function addCodeBox(slide, code, x, y, w, h, lang = '') {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: CODE_BG }, line: { color: '30363D', pt: 1 }, rounding: true });
  if (lang) {
    slide.addText(lang, { x: x + 0.1, y: y + 0.02, w: 1.5, h: 0.18, fontSize: 7, color: SUBTEXT, fontFace: 'Courier New' });
  }
  slide.addText(code, { x: x + 0.1, y: y + 0.22, w: w - 0.2, h: h - 0.3, fontSize: 9, color: TEXT, fontFace: 'Courier New', valign: 'top' });
}

function addBullets(slide, items, x, y, w, h, opts = {}) {
  const textItems = items.map((item, idx) => ({
    text: item,
    options: {
      bullet: { type: 'bullet', characterCode: '25B6', color: opts.bulletColor || ACCENT },
      color: opts.color || TEXT,
      fontSize: opts.fontSize || 13,
      fontFace: 'Calibri',
      paraSpaceAfter: 4,
      bold: item.startsWith('→') || item.startsWith('✅') || item.startsWith('🔹'),
    },
  }));
  slide.addText(textItems, { x, y, w, h, valign: 'top' });
}

function addInfoBox(slide, text, x, y, w, h, color = ACCENT) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: '0D2137' }, line: { color: color, pt: 2 }, rounding: true });
  slide.addText(text, { x: x + 0.12, y: y + 0.08, w: w - 0.25, h: h - 0.16, fontSize: 11, color: TEXT, fontFace: 'Calibri', valign: 'top', wrap: true });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title Slide
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  // Gradient banner
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 2.8, fill: { color: HEADER_BG }, line: { color: HEADER_BG } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 2.8, w: '100%', h: 0.06, fill: { color: ACCENT }, line: { color: ACCENT } });

  slide.addText('🎭  Playwright Automation Framework', {
    x: 0.5, y: 0.5, w: 9, h: 1,
    fontSize: 30, bold: true, color: ACCENT, fontFace: 'Calibri', align: 'center',
  });
  slide.addText('MyConnect RMA Module — End-to-End Test Suite', {
    x: 0.5, y: 1.5, w: 9, h: 0.6,
    fontSize: 18, color: TEXT, fontFace: 'Calibri', align: 'center',
  });
  slide.addText('JavaScript  ·  Page Object Model  ·  Multi-Role RBAC  ·  CI/CD', {
    x: 0.5, y: 2.1, w: 9, h: 0.5,
    fontSize: 13, color: SUBTEXT, fontFace: 'Calibri', align: 'center', italic: true,
  });
  slide.addText([
    { text: '👤  Author: ', options: { bold: true, color: SUBTEXT } },
    { text: 'QA Engineering Team\n', options: { color: TEXT } },
    { text: '📅  Date: ', options: { bold: true, color: SUBTEXT } },
    { text: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), options: { color: TEXT } },
  ], { x: 3, y: 3.3, w: 4, h: 0.8, fontSize: 13, fontFace: 'Calibri', align: 'center' });

  slide.addText('ekinops — myconnect-acc.ekinops.com', { x: 0, y: 4.9, w: '100%', h: 0.3, fontSize: 10, color: SUBTEXT, fontFace: 'Calibri', align: 'center' });
  slide.addNotes('Welcome slide. Introduce yourself and the purpose of this presentation: a walkthrough of the Playwright automation framework built for the MyConnect RMA module at Ekinops.');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Agenda
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '📋  Agenda', notes: 'Walk the audience through the sections covered in this presentation.' });
  const agendaItems = [
    ['01', 'Framework Overview', 'Goals, scope, and approach'],
    ['02', 'Tech Stack', 'Tools, libraries and versions'],
    ['03', 'Folder Structure', 'Every folder and file explained'],
    ['04', 'Architecture Diagram', 'How all layers connect'],
    ['05', 'playwright.config.js', 'Every setting explained'],
    ['06', 'Page Object Model', 'Design pattern + real code'],
    ['07', 'Winston Logger', 'Structured logging across the suite'],
    ['08', 'Trace Viewer', 'Capturing and reading trace files'],
    ['09', 'Allure Report', 'How to generate and interpret'],
    ['10', 'Fixtures & Global Setup', 'Session caching and cleanup'],
    ['11', 'API Helper', 'Axios integration for test data'],
    ['12', 'dotenv / Config', 'Environment variable management'],
    ['13', 'Soft Assertions', 'Non-fatal assertions with Logger'],
    ['14', 'CI/CD Integration', 'Jenkins, GitHub Actions, Azure'],
    ['15', 'How to Run', 'Install, run, report commands'],
    ['16', 'Best Practices', 'Quality patterns in this framework'],
  ];

  for (let i = 0; i < agendaItems.length; i++) {
    const [num, title, sub] = agendaItems[i];
    const col = i < 8 ? 0 : 1;
    const row = i % 8;
    const x = 0.3 + col * 4.9;
    const y = 0.7 + row * 0.53;
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 4.6, h: 0.45, fill: { color: HEADER_BG }, line: { color: '30363D', pt: 1 }, rounding: true });
    slide.addText(num, { x: x + 0.1, y, w: 0.45, h: 0.45, fontSize: 11, bold: true, color: ACCENT, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    slide.addText(title, { x: x + 0.6, y: y + 0.02, w: 2.8, h: 0.22, fontSize: 11, bold: true, color: TEXT, fontFace: 'Calibri' });
    slide.addText(sub, { x: x + 0.6, y: y + 0.22, w: 3.8, h: 0.2, fontSize: 8, color: SUBTEXT, fontFace: 'Calibri' });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Framework Overview
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🎯  Framework Overview', notes: 'Explain what the framework does, why it was built, and what problems it solves.' });

  addInfoBox(slide, '🎯  Purpose\nEnd-to-end automated test suite for the MyConnect RMA (Return Merchandise Authorisation) module at Ekinops. Validates multi-role workflows, RBAC access control, UI actions, and API-level security in a single cohesive framework.', 0.2, 0.65, 4.5, 1.3, ACCENT);
  addInfoBox(slide, '🏆  Goals\n• Zero UI logins per test (session caching saves ~93 logins per run)\n• Multi-role coverage: Admin, Engineer, Watcher, Customer\n• Cross-browser: Chrome, Firefox, Safari\n• Full CI/CD integration: Jenkins, GitHub Actions, Azure Pipelines', 4.85, 0.65, 5.0, 1.3, ACCENT2);

  const stats = [
    ['300+', 'Total Test Cases'],
    ['9', 'User Roles Tested'],
    ['18+', 'Spec Files'],
    ['3', 'Browsers'],
    ['6', 'CI/CD Configs'],
    ['0', 'UI Logins / Run'],
  ];
  stats.forEach(([num, label], i) => {
    const x = 0.2 + (i % 3) * 3.25;
    const y = 2.1 + Math.floor(i / 3) * 1.1;
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 3.0, h: 0.95, fill: { color: HEADER_BG }, line: { color: ACCENT, pt: 1 }, rounding: true });
    slide.addText(num, { x, y: y + 0.05, w: 3.0, h: 0.55, fontSize: 26, bold: true, color: ACCENT, fontFace: 'Calibri', align: 'center' });
    slide.addText(label, { x, y: y + 0.58, w: 3.0, h: 0.3, fontSize: 10, color: SUBTEXT, fontFace: 'Calibri', align: 'center' });
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Tech Stack
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🔧  Tech Stack', notes: 'Walk through each tool and explain why it was chosen and what role it plays in the framework.' });

  const stack = [
    { tool: '@playwright/test', version: 'v1.44.0', role: 'Core test runner, browser automation, assertions', color: ACCENT },
    { tool: 'Winston', version: 'v3.19.0', role: 'Structured logging — console + file transports', color: YELLOW },
    { tool: 'Allure Playwright', version: 'v2.15.0', role: 'Rich HTML test reports with screenshots & steps', color: RED },
    { tool: 'Axios', version: 'v1.16.0', role: 'HTTP client for API-level test data creation/cleanup', color: ACCENT2 },
    { tool: 'dotenv', version: 'v16.4.0', role: 'Environment variable management from .env files', color: '9E78FF' },
    { tool: 'Cheerio', version: 'v1.2.0', role: 'HTML parsing for server-rendered response validation', color: SUBTEXT },
    { tool: 'ESLint + Prettier', version: 'v8.57 / v3.2', role: 'Code quality enforcement + formatting', color: '58C4DD' },
    { tool: 'Husky', version: 'v9.0.0', role: 'Git pre-commit hooks to run lint + format', color: 'F78166' },
  ];

  stack.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.2 + col * 4.95;
    const y = 0.65 + row * 1.1;
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 4.7, h: 1.0, fill: { color: HEADER_BG }, line: { color: item.color, pt: 2 }, rounding: true });
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.08, h: 1.0, fill: { color: item.color }, line: { color: item.color } });
    slide.addText(item.tool, { x: x + 0.2, y: y + 0.08, w: 3.0, h: 0.3, fontSize: 13, bold: true, color: item.color, fontFace: 'Courier New' });
    slide.addText(item.version, { x: x + 3.3, y: y + 0.08, w: 1.2, h: 0.3, fontSize: 10, color: SUBTEXT, fontFace: 'Calibri', align: 'right' });
    slide.addText(item.role, { x: x + 0.2, y: y + 0.45, w: 4.3, h: 0.5, fontSize: 10.5, color: TEXT, fontFace: 'Calibri', valign: 'top', wrap: true });
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Folder Structure
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '📁  Folder Structure', notes: 'Explain the purpose of every folder. Emphasize the separation of test logic, page objects, helpers, and config.' });

  const tree = `automationekinops/
├── playwright.config.js     ← Test runner config (projects, browser, retries)
├── .env / .env.example      ← Environment credentials & config
├── config/
│   ├── environments.js      ← baseURL per environment (qa/staging/prod)
│   ├── global-setup.js      ← Runs once before all tests (RMA cleanup)
│   └── global-teardown.js   ← Runs once after all tests (log archival)
├── src/
│   ├── pages/rma/           ← Page Object Model classes
│   │   ├── BasePage.js      ← Shared locators & navigation helpers
│   │   ├── RMALoginPage.js  ← Login actions & session caching
│   │   ├── SubmitRMAPage.js ← RMA submission form interactions
│   │   ├── ViewRMAPage.js   ← List, filter, detail page actions
│   │   └── ...              ← 7 total Page Object files
│   ├── helpers/
│   │   ├── Logger.js        ← Winston-powered logger
│   │   ├── apiHelper.js     ← Axios HTTP client
│   │   ├── assertions.js    ← Soft & hard assertion wrappers
│   │   ├── config.js        ← Centralised env config
│   │   ├── Constants.js     ← Routes, selectors, test data
│   │   └── rmaCleanup.js    ← RMA workflow automation cleanup
│   └── fixtures/
│       ├── rmaFixtures.js   ← trackRma: auto-cleanup fixture
│       └── index.js         ← Re-exports all fixtures
├── tests/
│   ├── auth.setup.js        ← Logs in once per role, saves .auth/*.json
│   └── rma/
│       ├── auth.spec.js     ← Login / session / security tests
│       ├── rbac.spec.js     ← Role-Based Access Control
│       └── functional/      ← 18 functional spec files`;

  addCodeBox(slide, tree, 0.2, 0.6, 9.6, 4.55);
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Architecture Diagram
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🏗️  Architecture Diagram', notes: 'Walk through how each layer connects — from the test file all the way to the output reports.' });

  const layers = [
    { label: '⌨️  Test File (spec.js)', sub: 'test.describe() → test() → Logger.info()', color: '7B8CDE', x: 3.8, y: 0.65, w: 4.0 },
    { label: '🔧  Fixtures', sub: 'rmaFixtures.js — trackRma auto-cleanup', color: '9E78FF', x: 0.3, y: 1.55, w: 3.2 },
    { label: '📄  Page Objects', sub: 'ViewRMAPage / SubmitRMAPage / BasePage', color: ACCENT, x: 4.0, y: 1.55, w: 3.2 },
    { label: '🌐  Browser (Playwright)', sub: 'Chromium / Firefox / Safari', color: ACCENT2, x: 7.4, y: 1.55, w: 2.3 },
    { label: '📝  Logger (Winston)', sub: 'Console + test-run.log + error.log', color: YELLOW, x: 0.3, y: 2.55, w: 3.2 },
    { label: '⚙️  Config + dotenv', sub: '.env → config.js → playwright.config.js', color: '58C4DD', x: 4.0, y: 2.55, w: 3.2 },
    { label: '🔌  API Helper (Axios)', sub: 'Cleanup + test data creation', color: RED, x: 7.4, y: 2.55, w: 2.3 },
    { label: '📊  Reporters', sub: 'HTML · JUnit · JSON · Allure · Summary', color: '3FB950', x: 0.3, y: 3.55, w: 3.2 },
    { label: '🗄️  Global Setup/Teardown', sub: 'Auth cache · RMA cleanup · Log archival', color: 'F0883E', x: 4.0, y: 3.55, w: 3.2 },
    { label: '📁  Output', sub: 'reports/ · allure-report/ · logs/ · test-results/', color: SUBTEXT, x: 7.4, y: 3.55, w: 2.3 },
  ];

  layers.forEach(l => {
    slide.addShape(pptx.ShapeType.rect, { x: l.x, y: l.y, w: l.w, h: 0.8, fill: { color: HEADER_BG }, line: { color: l.color, pt: 2 }, rounding: true });
    slide.addShape(pptx.ShapeType.rect, { x: l.x, y: l.y, w: l.w, h: 0.12, fill: { color: l.color }, line: { color: l.color } });
    slide.addText(l.label, { x: l.x + 0.1, y: l.y + 0.14, w: l.w - 0.2, h: 0.3, fontSize: 10, bold: true, color: l.color, fontFace: 'Calibri' });
    slide.addText(l.sub, { x: l.x + 0.1, y: l.y + 0.45, w: l.w - 0.2, h: 0.3, fontSize: 8, color: SUBTEXT, fontFace: 'Calibri', wrap: true });
  });

  // Arrow labels
  slide.addText('↕ uses', { x: 1.5, y: 2.1, w: 1, h: 0.3, fontSize: 9, color: SUBTEXT, fontFace: 'Calibri', align: 'center' });
  slide.addText('↕ drives', { x: 4.8, y: 2.1, w: 1, h: 0.3, fontSize: 9, color: SUBTEXT, fontFace: 'Calibri', align: 'center' });
  slide.addText('↕ feeds', { x: 1.5, y: 3.1, w: 1, h: 0.3, fontSize: 9, color: SUBTEXT, fontFace: 'Calibri', align: 'center' });
  slide.addText('↕ configs', { x: 4.8, y: 3.1, w: 1, h: 0.3, fontSize: 9, color: SUBTEXT, fontFace: 'Calibri', align: 'center' });

  addInfoBox(slide, '📌  All layers share the same Logger singleton. dotenv feeds config.js which feeds playwright.config.js and all Page Objects.', 0.2, 4.55, 9.6, 0.55, YELLOW);
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — playwright.config.js
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '⚙️  playwright.config.js — Every Setting Explained', notes: 'Go through the key config settings and explain the WHY behind each decision.' });

  const configCode = `module.exports = defineConfig({
  testDir: './tests',          // where specs live
  fullyParallel: false,        // RMA tests share state → sequential
  workers: 1,                  // single worker prevents race conditions
  retries: process.env.CI ? 1 : 0, // auto-retry once in CI
  timeout: 60_000,             // 60s per test (network-heavy UI)
  expect: { timeout: 10_000 },

  reporter: [
    ['html',   { outputFolder: 'reports/html-report' }],
    ['junit',  { outputFile: 'reports/junit.xml' }],  // Jenkins
    ['json',   { outputFile: 'reports/results.json' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
    ['./src/reporters/SummaryReporter.js'],  // custom summary
  ],

  use: {
    screenshot: 'only-on-failure', // saves disk space
    video:      'retain-on-failure',
    trace:      'retain-on-failure',
    headless:   true,
    viewport:   { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,   // self-signed cert on acc env
  },

  globalSetup:    './config/global-setup',    // runs once before all
  globalTeardown: './config/global-teardown', // runs once after all

  projects: [
    { name: 'auth-tests', /* login flow tests, no storageState */ },
    { name: 'rma-setup',  dependencies: ['auth-tests'], /* cache sessions */ },
    { name: 'rma',        dependencies: ['rma-setup'],  /* run all specs */ },
    { name: 'rma-firefox', ... },  // cross-browser
    { name: 'rma-webkit', ... },   // Safari
  ],
});`;

  addCodeBox(slide, configCode, 0.2, 0.62, 9.6, 4.55, 'playwright.config.js');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Page Object Model
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '📄  Page Object Model (POM)', notes: 'Explain what POM is, why it reduces duplication, and how it is applied in this framework.' });

  slide.addText('What is POM?', { x: 0.2, y: 0.65, w: 9, h: 0.3, fontSize: 13, bold: true, color: ACCENT, fontFace: 'Calibri' });
  slide.addText('Page Object Model is a design pattern where each page/component of the application is represented as a class. Locators and actions are encapsulated, keeping tests clean and reusable.', { x: 0.2, y: 0.95, w: 9, h: 0.5, fontSize: 11, color: TEXT, fontFace: 'Calibri', wrap: true });

  const pomCode = `// src/pages/rma/ViewRMAPage.js
class ViewRMAPage extends BasePage {
  constructor(page) {
    super(page);
    this.logger = new Logger('ViewRMAPage');
  }

  // ── Locators (getters — never stale) ──────────────────────────────
  get editBtn()    { return this.page.locator('a.btn, button.btn').filter({ hasText: /Edit/i }).first(); }
  get commentBtn() { return this.page.locator('a.btn, button.btn').filter({ hasText: /^(Add )?Comment$/i }).first(); }
  get backBtn()    { return this.page.locator('a.btn, button.btn').filter({ hasText: /Back/i }).first(); }

  // ── Actions ───────────────────────────────────────────────────────
  async filterRmaList({ status, keyword } = {}) {
    this.logger.action('click', 'Filter Data button');
    await this.filterDataBtn.click();
    // ... reset + select status + fill keyword + submit
  }

  async goToRmaDetailByStatus(status) {
    this.logger.info(\`Navigating to first RMA with status: "\${status}"\`);
    const row = this.tableRows.filter({ hasText: new RegExp(status, 'i') }).first();
    await this._clickRowLink(row);
    return await row.count() > 0;
  }
}`;

  addCodeBox(slide, pomCode, 0.2, 1.55, 9.6, 3.6, 'src/pages/rma/ViewRMAPage.js');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Logger
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '📝  Winston Logger — Structured Logging', notes: 'Explain the Logger class: transports, methods, and how test.step() is integrated.' });

  const loggerCode = `// src/helpers/Logger.js
class Logger {
  constructor(context = 'General') { this.context = context; }

  // Basic levels
  info(msg)        { _winston.info(\`[\${this.context}] \${msg}\`); }
  warn(msg)        { _winston.warn(\`[\${this.context}] \${msg}\`); }
  error(msg, err)  { _winston.error(\`[\${this.context}] \${msg}\${err?.message}\`); }

  // Semantic helpers
  action(method, element) { this.info(\`  ▶ \${method.toUpperCase()} → \${element}\`); }
  verify(what, expected)  { this.info(\`  🔍 VERIFY [\${what}] expected: \${expected}\`); }

  // Integrates Playwright test.step() + Winston log
  async step(name, why, fn) {
    this.info(\`📌 STEP START — \${name} [\${why}]\`);
    const result = await test.step(name, fn);    // ← appears in Allure
    this.info(\`✅ STEP DONE  — \${name}\`);
    return result;
  }
}

// Console output example:
// [18:32:01] INFO  | [ViewRMAPage]   ▶ GOTO → /rma/list
// [18:32:05] INFO  | [ViewRMAPage] 📌 STEP START — Filter by Submitted
// [18:32:07] INFO  | [ViewRMAPage] ✅ STEP DONE  — Filter by Submitted`;

  addCodeBox(slide, loggerCode, 0.2, 0.62, 9.6, 4.0, 'src/helpers/Logger.js');

  slide.addText('Transports: Console (colorized) · logs/test-run.log (all levels) · logs/error.log (errors only)', {
    x: 0.2, y: 4.72, w: 9.6, h: 0.35, fontSize: 11, color: YELLOW, fontFace: 'Calibri', bold: false,
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Trace Viewer
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🔍  Trace Viewer — Debug Like a Pro', notes: 'Demonstrate how trace files are saved on failure and how to open them.' });

  addBullets(slide, [
    'Playwright Trace Viewer captures every action, screenshot, DOM snapshot, and network call',
    'Configured as: trace: "retain-on-failure" → only saves when a test fails (saves disk space)',
    'Saved to: test-results/<test-name>/trace.zip automatically',
    '→ Open with:  npx playwright show-trace test-results/.../trace.zip',
    '→ Or drag-and-drop trace.zip at:  https://trace.playwright.dev',
  ], 0.2, 0.65, 9.6, 2.2);

  const traceConfig = `// playwright.config.js
use: {
  trace:      'retain-on-failure',  // saves only for failed tests
  screenshot: 'only-on-failure',    // auto screenshot on failure
  video:      'retain-on-failure',  // records video of failed tests
},

// What trace.zip captures:
// ✅ Every click, fill, goto, waitFor action
// ✅ DOM snapshot at every step (before + after)
// ✅ Network requests & responses
// ✅ Console logs from the browser
// ✅ Playwright API calls with timing
// ✅ Full test timeline with step durations`;

  addCodeBox(slide, traceConfig, 0.2, 2.9, 9.6, 2.3, 'playwright.config.js');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Allure Report
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '📊  Allure Report', notes: 'Show how to generate and read the Allure report. Explain what each section shows.' });

  addBullets(slide, [
    'Allure Playwright (v2.15) captures every test step, screenshot, and trace automatically',
    'Each test.step() call becomes a collapsible step in the Allure timeline',
    '→ Generate report:  npm run allure:generate',
    '→ Open report:      npm run allure:open',
    '→ Results folder:   allure-results/ (raw JSON) → allure-report/ (final HTML)',
  ], 0.2, 0.65, 9.6, 1.8);

  const allureCode = `// playwright.config.js reporter config
reporter: [
  ['allure-playwright', { outputFolder: 'allure-results' }],
],

// In package.json:
"allure:generate": "npx allure generate allure-results -o allure-report --clean",
"allure:open":     "npx allure open allure-report",

// Allure report shows:
// ✅ Test suite tree with pass/fail/skip counts
// ✅ Timeline view — parallel execution overview
// ✅ Each test: steps, duration, screenshots, tags
// ✅ @smoke, @security, @workflow tag filtering
// ✅ History trends (if run repeatedly)
// ✅ Environment info (browser, baseURL, build number)`;

  addCodeBox(slide, allureCode, 0.2, 2.55, 9.6, 2.6, 'allure configuration');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Fixtures
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🔩  Fixtures — Automatic Test Cleanup', notes: 'Explain what Playwright fixtures are and how rmaFixtures.js uses them for auto-cleanup.' });

  const fixtureCode = `// src/fixtures/rmaFixtures.js
const test = base.test.extend({

  trackRma: async ({}, use, testInfo) => {
    const trackedSerials = [];

    // Before test: provide the trackRma() function
    await use((serial) => {
      if (serial && !trackedSerials.includes(serial))
        trackedSerials.push(serial);
    });

    // After test (pass OR fail): auto-cleanup tracked serials
    if (trackedSerials.length > 0) {
      console.log(\`🧹 Cleaning up \${trackedSerials.length} serial(s)\`);
      await cleanupSerials(trackedSerials, { includeEngineerPhase: true });
    }
  },
});

// Usage in any spec file:
const { test, expect } = require('../../src/fixtures/rmaFixtures');

test('submit RMA', async ({ page, trackRma }) => {
  trackRma('L1040004215100962');  // ← registered for auto-cleanup
  // ... submit RMA logic ...
}); // ← fixture teardown runs here automatically`;

  addCodeBox(slide, fixtureCode, 0.2, 0.62, 9.6, 4.55, 'src/fixtures/rmaFixtures.js');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Global Setup / Teardown
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🌐  Global Setup & Teardown', notes: 'Explain how global setup/teardown eliminates 93+ redundant UI logins and handles cleanup.' });

  addBullets(slide, [
    '🔹 Global Setup runs ONCE before any test in the suite',
    '  → Cleans up any active RMAs from previous interrupted runs',
    '  → Ensures a clean starting state across all serial numbers',
    '',
    '🔹 Session Caching (auth.setup.js project)',
    '  → Logs in ONCE per user role (9 roles = 9 logins total)',
    '  → Saves cookies/session to .auth/<role>.json',
    '  → All subsequent tests reuse the cached session — ZERO UI logins',
    '  → Eliminates server rate-limiting from 93+ per-test logins',
    '',
    '🔹 Global Teardown runs ONCE after all tests complete',
    '  → Deletes .auth/*.json (9 session files)',
    '  → Safety-net RMA cleanup for any missed teardowns',
    '  → Archives logs to logs-archive/run-<timestamp>/',
    '  → Prints final TEST RUN COMPLETE summary',
  ], 0.2, 0.65, 9.6, 4.45, { fontSize: 11 });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — API Helper
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🔌  API Helper — Axios Integration', notes: 'Explain why API-level operations are faster than UI for test setup and cleanup.' });

  const apiCode = `// src/helpers/apiHelper.js
class ApiHelper {
  constructor(baseURL = BASE_URL, token = null) {
    this.logger = new Logger('ApiHelper');
    this.client = axios.create({
      baseURL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });
    // Auto-log every response
    this.client.interceptors.response.use(
      (res) => { this.logger.info(\`\${res.config.method.toUpperCase()} \${res.config.url} → \${res.status}\`); return res; },
      (err) => { this.logger.error(\`\${err.config.method} \${err.config.url} → FAILED\`); return Promise.reject(err); }
    );
  }

  async get(endpoint, params = {})  { this.logger.action('GET', endpoint);    return this.client.get(endpoint, { params }); }
  async post(endpoint, body = {})   { this.logger.action('POST', endpoint);   return this.client.post(endpoint, body); }
  async put(endpoint, body = {})    { this.logger.action('PUT', endpoint);    return this.client.put(endpoint, body); }
  async delete(endpoint)            { this.logger.action('DELETE', endpoint); return this.client.delete(endpoint); }
}

// Why API vs UI?
// ✅ 10x faster than driving the UI for test data creation/cleanup
// ✅ Validates API contracts independently of UI rendering
// ✅ Used in rmaCleanup.js for workflow state transitions`;

  addCodeBox(slide, apiCode, 0.2, 0.62, 9.6, 4.55, 'src/helpers/apiHelper.js');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — dotenv / Config
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🔐  dotenv & Config — Environment Management', notes: 'Explain how env vars flow from .env → config.js → page objects.' });

  const configCode = `# .env.example — copy to .env and fill in values
ENV=qa
RMA_BASE_URL=https://myconnect-acc.ekinops.com
RMA_ADMIN_EMAIL=administrator.test@rma.com
RMA_ADMIN_PASSWORD=<your-admin-password>
RMA_ENGINEER_EMAIL=rma.engineer@rma.com
RMA_VALID_SERIAL=T1138004504037566
CI=false
BUILD_NUMBER=local
LOG_LEVEL=info   # error | warn | info | debug`;

  const helperCode = `// src/helpers/config.js — single source of truth
const BASE_URL  = process.env.RMA_BASE_URL || 'https://myconnect-acc.ekinops.com';
const ENV_USERS = {
  rmaAdmin: { email: process.env.RMA_RMA_ADMIN_EMAIL, password: process.env.RMA_RMA_ADMIN_PASSWORD },
  repairEngineer: { email: process.env.RMA_ENGINEER_EMAIL, password: process.env.RMA_ENGINEER_PASSWORD },
  // ... 9 total roles
};
// Never read process.env directly in tests — always import from config.js`;

  slide.addText('.env.example', { x: 0.2, y: 0.65, w: 4.5, h: 0.25, fontSize: 10, color: SUBTEXT, fontFace: 'Courier New' });
  addCodeBox(slide, configCode, 0.2, 0.88, 4.5, 2.3);

  slide.addText('src/helpers/config.js', { x: 5.0, y: 0.65, w: 4.8, h: 0.25, fontSize: 10, color: SUBTEXT, fontFace: 'Courier New' });
  addCodeBox(slide, helperCode, 5.0, 0.88, 4.8, 2.3);

  addInfoBox(slide, '🔒  Security Rule: Never commit .env to git. Use CI secrets manager (GitHub Secrets / Jenkins Credentials) to inject values at runtime. .gitignore already excludes .env.', 0.2, 3.3, 9.6, 0.85, RED);

  addBullets(slide, [
    '→ dotenv loaded in playwright.config.js (require("dotenv").config())',
    '→ config.js reads process.env and exports typed constants',
    '→ All Page Objects and helpers import from config.js — not process.env directly',
    '→ Environment switch: set ENV=staging or ENV=prod in .env',
  ], 0.2, 4.25, 9.6, 0.9, { fontSize: 10.5 });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 16 — Soft Assertions
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '✅  Soft Assertions — Non-Fatal Checks', notes: 'Explain the difference between hard and soft assertions and when to use each.' });

  const assertCode = `// src/helpers/assertions.js

// HARD assertion — test STOPS immediately if this fails
async function hardCheck(locator, expected, logger, message = '') {
  if (logger) logger.verify(message, String(expected));
  await expect(locator).toContainText(expected);  // throws on fail
}

// SOFT assertion — test CONTINUES even if this fails
// All soft failures are collected and reported at the end
async function softCheck(locator, expected, logger, message = '') {
  if (logger) logger.verify(message, String(expected));
  await expect.soft(locator).toContainText(expected);  // non-fatal
}

// Usage example in a test:
test('RMA dashboard shows all sections', async ({ page }) => {
  await softCheck(page.locator('#kpi-total'), '42', logger, 'KPI total');
  await softCheck(page.locator('#kpi-open'),  '12', logger, 'KPI open');
  await hardCheck(page.locator('h1'), 'Dashboard', logger, 'Page title');
  // If both soft checks fail, they are all reported at the end
  // The test doesn't stop mid-way — you see ALL failures at once
});`;

  addCodeBox(slide, assertCode, 0.2, 0.62, 9.6, 4.0, 'src/helpers/assertions.js');

  addInfoBox(slide, '💡  When to use Soft:  checking multiple KPIs or UI elements where you want ALL failures reported at once.\nWhen to use Hard:  critical navigation or auth checks where continuing makes no sense if they fail.', 0.2, 4.72, 9.6, 0.45, ACCENT2);
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 17 — CI/CD Integration
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '🚀  CI/CD Integration', notes: 'Walk through the CI/CD configuration files available in the repo.' });

  addBullets(slide, [
    '🔹 Jenkins (Jenkinsfile)',
    '  → Stage pipeline: Install → Lint → Auth Tests → RMA Setup → Full Suite',
    '  → Publishes JUnit XML report (reports/junit.xml) to Jenkins dashboard',
    '  → Archives Allure results as build artifacts',
    '  → Notifies Slack on failure',
    '',
    '🔹 GitHub Actions (.github/workflows/)',
    '  → Triggers on push to main/develop + pull requests',
    '  → Matrix strategy for Chrome + Firefox cross-browser runs',
    '  → Uploads test-results/ and allure-results/ as artifacts',
    '',
    '🔹 Azure Pipelines (azure-pipelines.yml)',
    '  → Publishes JUnit XML for Azure Test Plans integration',
    '',
    '🔹 GitLab CI (.gitlab-ci.yml)',
    '  → Docker-based test execution using playwright/playwright:focal image',
  ], 0.2, 0.65, 9.6, 4.45, { fontSize: 11 });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 18 — How to Run
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '▶️  How to Run', notes: 'Demo the key commands. Show npm run test in a live terminal if possible.' });

  const cmds = `# 1. Install dependencies
npm install
npx playwright install --with-deps

# 2. Configure environment
cp .env.example .env
# Fill in credentials in .env

# 3. Run all tests (Chrome)
npm test                              # → rma project (full suite)

# 4. Run specific suites
npm run test:smoke                    # → @smoke tagged tests only
npm run test:security                 # → @security tagged tests
npm run test:workflow                 # → workflow spec

# 5. Run cross-browser
npm run test:firefox
npm run test:webkit

# 6. Run in headed mode (see browser)
npm run test:headed

# 7. Generate & open reports
npm run report:show                   # Playwright HTML report
npm run allure:generate               # Build Allure report
npm run allure:open                   # Open Allure in browser

# 8. Debug a single test
npx playwright test --debug --grep "TC-AUTH-001"

# 9. Run with trace always on
PLAYWRIGHT_TRACE=on npm test`;

  addCodeBox(slide, cmds, 0.2, 0.62, 9.6, 4.55, 'terminal');
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 19 — Best Practices
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = addSlide({ titleText: '⭐  Best Practices in This Framework', notes: 'Summarize the key quality patterns used. Show how they solve common automation problems.' });

  const practices = [
    { num: '01', title: 'Session Caching', desc: 'Login once per role via auth.setup.js → saves .auth/*.json → eliminates 93+ UI logins per run' },
    { num: '02', title: 'Page Object Model', desc: 'All selectors in Page classes, never in test files → single point of maintenance' },
    { num: '03', title: 'Zero Hardcoded Waits', desc: 'Only Playwright-native waitFor, waitForLoadState, locator.waitFor() — no page.waitForTimeout()' },
    { num: '04', title: 'Fixture-Based Cleanup', desc: 'trackRma() fixture guarantees cleanup after every test, pass or fail — no leaked test data' },
    { num: '05', title: 'Structured Logging', desc: 'Every action, assertion, step logged via Winston → structured debugging without re-running tests' },
    { num: '06', title: 'Soft Assertions', desc: 'expect.soft() collects all failures → see all broken elements at once, not just the first' },
    { num: '07', title: 'Tag-Based Execution', desc: '@smoke, @security, @workflow tags enable targeted CI stages without separate spec files' },
    { num: '08', title: 'Environment Isolation', desc: 'All URLs/creds in .env → same codebase runs on qa/staging/prod without code changes' },
  ];

  practices.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.2 + col * 4.95;
    const y = 0.65 + row * 1.1;
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 4.7, h: 1.0, fill: { color: HEADER_BG }, line: { color: ACCENT2, pt: 1 }, rounding: true });
    slide.addText(`${p.num}`, { x: x + 0.1, y: y + 0.1, w: 0.45, h: 0.45, fontSize: 16, bold: true, color: ACCENT2, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    slide.addText(p.title, { x: x + 0.6, y: y + 0.08, w: 3.9, h: 0.28, fontSize: 12, bold: true, color: ACCENT2, fontFace: 'Calibri' });
    slide.addText(p.desc, { x: x + 0.6, y: y + 0.38, w: 4.0, h: 0.55, fontSize: 9.5, color: TEXT, fontFace: 'Calibri', wrap: true });
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDE 20 — Thank You
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 5.63, fill: { color: BG }, line: { color: BG } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: ACCENT }, line: { color: ACCENT } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.55, w: '100%', h: 0.08, fill: { color: ACCENT }, line: { color: ACCENT } });

  slide.addText('🙏  Thank You', { x: 0.5, y: 0.8, w: 9, h: 1.0, fontSize: 36, bold: true, color: ACCENT, fontFace: 'Calibri', align: 'center' });
  slide.addText('Playwright Automation Framework — MyConnect RMA', { x: 0.5, y: 1.8, w: 9, h: 0.5, fontSize: 16, color: TEXT, fontFace: 'Calibri', align: 'center' });
  slide.addText('Questions & Discussion', { x: 0.5, y: 2.4, w: 9, h: 0.4, fontSize: 13, color: SUBTEXT, fontFace: 'Calibri', align: 'center', italic: true });

  slide.addShape(pptx.ShapeType.rect, { x: 2.5, y: 3.1, w: 5.0, h: 1.6, fill: { color: HEADER_BG }, line: { color: ACCENT, pt: 1 }, rounding: true });
  slide.addText([
    { text: '📧  ', options: { bold: true, color: ACCENT } },
    { text: '<your-email@ekinops.com>\n', options: { color: TEXT } },
    { text: '🔗  ', options: { bold: true, color: ACCENT } },
    { text: 'github.com/<your-repo>\n', options: { color: TEXT } },
    { text: '🏢  ', options: { bold: true, color: ACCENT } },
    { text: 'Ekinops — QA Engineering', options: { color: TEXT } },
  ], { x: 2.7, y: 3.2, w: 4.6, h: 1.4, fontSize: 12, fontFace: 'Calibri', align: 'left', valign: 'middle' });

  slide.addNotes('Thank the audience. Open for questions. Share the GitHub repository link. Offer to demo trace viewer or Allure report live if time permits.');
}

// ── Save ──────────────────────────────────────────────────────────────────────
const reportsDir = path.join(ROOT, 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

pptx.writeFile({ fileName: OUT }).then(() => {
  console.log(`\n✅ PowerPoint generated: ${OUT}`);
  console.log(`   Slides: 20`);
}).catch(err => {
  console.error('❌ Failed to generate PPTX:', err);
  process.exit(1);
});
