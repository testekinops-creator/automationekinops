/**
 * add-allure-logger.js  v2
 * Adds Allure feature/story labels + Logger.step() calls to all spec files.
 * Run: node scripts/add-allure-logger.js
 *
 * Fixes over v1:
 *  - Only injects allure.feature/story into the FIRST (outermost) test.describe
 *  - Handles template literal test titles gracefully
 *  - Idempotent: checks for existing injection before adding
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── File → feature/story map ──────────────────────────────────────────────────
const FILE_META = {
  'tests/rma/auth.spec.js':                               { feature: 'Authentication',         story: 'Login & Session Management' },
  'tests/rma/dashboard.spec.js':                          { feature: 'Dashboard',              story: 'KPI Overview' },
  'tests/rma/rbac.spec.js':                               { feature: 'RBAC',                   story: 'Role-Based Access Control' },
  'tests/rma/submit-rma.spec.js':                         { feature: 'Submit RMA',             story: 'Create RMA Request' },
  'tests/rma/view-rma.spec.js':                           { feature: 'View RMA',               story: 'RMA List & Detail' },
  'tests/rma/workflow.spec.js':                           { feature: 'Workflow',               story: 'RMA Status Transitions' },
  'tests/rma/access/rbac.spec.js':                        { feature: 'RBAC',                   story: 'Page Access Control' },
  'tests/rma/access/submitRmaAccess.spec.js':             { feature: 'Submit RMA',             story: 'Role Access to Submit' },
  'tests/rma/access/test-options.spec.js':                { feature: 'Test Options',           story: 'Test Configuration' },
  'tests/rma/functional/customer-reassignment.spec.js':   { feature: 'Customer Reassignment',  story: 'Reassign RMA Owner' },
  'tests/rma/functional/dashboard-kpi-workflow.spec.js':  { feature: 'Dashboard',              story: 'KPI Workflow Integration' },
  'tests/rma/functional/dashboard.spec.js':               { feature: 'Dashboard',              story: 'Dashboard Metrics' },
  'tests/rma/functional/debug-test.spec.js':              { feature: 'Debug',                  story: 'Developer Investigation' },
  'tests/rma/functional/edit-rma.spec.js':                { feature: 'Edit RMA',               story: 'Modify RMA Details' },
  'tests/rma/functional/factory-receive-module.spec.js':  { feature: 'Factory Receive',        story: 'Warehouse Receive & Insert' },
  'tests/rma/functional/integration.spec.js':             { feature: 'Integration',            story: 'Full RMA Lifecycle' },
  'tests/rma/functional/manage-address.spec.js':          { feature: 'Manage Address',         story: 'Address CRUD Operations' },
  'tests/rma/functional/return-location.spec.js':         { feature: 'Return Location',        story: 'Return Location Selection' },
  'tests/rma/functional/rma-history.spec.js':             { feature: 'RMA History',            story: 'Audit & History Log' },
  'tests/rma/functional/rma-list-filter.spec.js':         { feature: 'RMA List & Filter',      story: 'Filter Panel Interactions' },
  'tests/rma/functional/rma-print-consignment.spec.js':   { feature: 'Print Consignment',      story: 'Consignment Note Generation' },
  'tests/rma/functional/standardized-faults.spec.js':     { feature: 'Standardized Faults',    story: 'Fault Code Management' },
  'tests/rma/functional/submit-rma.spec.js':              { feature: 'Submit RMA',             story: 'RMA Submission Flow' },
  'tests/rma/functional/view-rma.spec.js':                { feature: 'View RMA',               story: 'View Screen Validation' },
  'tests/rma/functional/view-screen-actions.spec.js':     { feature: 'View Screen Actions',    story: 'Action Buttons & Popups' },
  'tests/rma/functional/workflow-popup-validation.spec.js':{ feature: 'Workflow',              story: 'Popup Validation' },
  'tests/rma/functional/workflow.spec.js':                { feature: 'Workflow',               story: 'Status Transition Validation' },
  'tests/rma/regression/bug-gap-coverage.spec.js':        { feature: 'Regression',             story: 'Gap Coverage Tests' },
  'tests/rma/regression/bug-regression.spec.js':          { feature: 'Regression',             story: 'Bug Regression Suite' },
  'tests/rma/security/security.spec.js':                  { feature: 'Security',               story: 'OWASP & Auth Security' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLoggerRelPath(relSpecPath) {
  const parts = relSpecPath.replace(/\\/g, '/').split('/');
  const depth = parts.length - 1; // directories above filename
  const ups = depth - 1;          // how many '../' to reach project root
  return '../'.repeat(ups) + '../src/helpers/Logger';
}

function hasAllure(content)  { return content.includes("require('allure-playwright')") || content.includes('allure.feature('); }
function hasLogger(content)  { return content.includes("require('") && content.includes('Logger'); }

/**
 * Insert lines after the last top-level require() line.
 */
function injectImports(content, loggerRelPath, skipAllure, skipLogger) {
  const lines = content.split('\n');
  let lastReqIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/require\(/.test(lines[i])) lastReqIdx = i;
  }
  if (lastReqIdx === -1) lastReqIdx = 0;

  const toAdd = [];
  if (!skipAllure) toAdd.push(`const { allure } = require('allure-playwright');`);
  if (!skipLogger) toAdd.push(`const Logger = require('${loggerRelPath}');`);

  if (toAdd.length === 0) return content;
  lines.splice(lastReqIdx + 1, 0, ...toAdd);
  return lines.join('\n');
}

/**
 * Inject allure.feature/story ONLY into the FIRST test.describe block found.
 * Uses a one-shot approach — stops after first describe.
 */
function injectFirstDescribeLabel(content, feature, story) {
  // Already injected?
  if (content.includes(`allure.feature('${feature}')`)) return content;

  // Find the first `test.describe(...)  => {`
  const re = /(test\.describe\s*\([^)]+\)\s*=>\s*\{)/;
  const m  = re.exec(content);
  if (!m) return content;

  const insertPos  = m.index + m[0].length;
  const beforePart = content.slice(0, insertPos);
  const afterPart  = content.slice(insertPos);

  const injection = `
  // ── Allure labels ──
  test.beforeEach(async () => {
    await allure.feature('${feature}');
    await allure.story('${story}');
  });
`;

  return beforePart + injection + afterPart;
}

/**
 * Inject Logger.step() as first line inside each `test(...)` body.
 * Skips template-literal titles (dynamic titles use a generic label).
 * Skips tests that already have Logger.step.
 */
function injectLoggerSteps(content) {
  // Match: test(`...` | '...' | "...", async (...) => {
  // Capture group 1 = full test() opener; group 2/3/4 = title variant
  const re = /(test\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")\s*,\s*async\s*\([^)]*\)\s*=>\s*\{)/g;
  let result = content;
  let extraOffset = 0;

  let m;
  while ((m = re.exec(content)) !== null) {
    const rawTitle = m[2]; // includes surrounding quotes/backticks
    const isTemplate = rawTitle.startsWith('`');
    let cleanTitle;

    if (isTemplate) {
      // For template literals, use a placeholder — we can't evaluate at AST-patch time
      cleanTitle = rawTitle.slice(1, -1)
        .replace(/\$\{[^}]+\}/g, '...')       // replace ${expr} with ...
        .replace(/^TC[-\s][A-Z0-9-]+\s*\|\s*/i, '')
        .replace(/@\w+/g, '')
        .trim()
        .substring(0, 80);
    } else {
      cleanTitle = rawTitle.slice(1, -1)       // strip outer quotes
        .replace(/^TC[-\s][A-Z0-9-]+\s*\|\s*/i, '')
        .replace(/@\w+/g, '')
        .trim()
        .substring(0, 80);
    }

    const insertPos = m.index + m[0].length + extraOffset;

    // Skip if already injected right here
    const peek = result.slice(insertPos, insertPos + 80);
    if (peek.includes('Logger.step(')) continue;

    const injection = `\n    Logger.step('${cleanTitle.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');`;
    result = result.slice(0, insertPos) + injection + result.slice(insertPos);
    extraOffset += injection.length;
  }
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────
let processed = 0;
let skipped   = 0;
const errors  = [];

for (const [relPath, meta] of Object.entries(FILE_META)) {
  const absPath = path.join(ROOT, relPath.replace(/\//g, path.sep));

  if (!fs.existsSync(absPath)) {
    console.warn(`  ⚠  Not found: ${relPath}`);
    skipped++;
    continue;
  }

  let content;
  try { content = fs.readFileSync(absPath, 'utf8'); } catch (e) {
    errors.push(`${relPath}: ${e.message}`); continue;
  }

  try {
    const alreadyAllure = hasAllure(content);
    const alreadyLogger = hasLogger(content);

    // Reset file to clean state if previous v1 run already patched it (strip v1 injections)
    // v1 injected: const { allure } = require(...) AND duplicate beforeEach blocks
    // v2 is idempotent via the checks inside each function.

    content = injectImports(content, getLoggerRelPath(relPath), alreadyAllure, alreadyLogger);
    content = injectFirstDescribeLabel(content, meta.feature, meta.story);
    content = injectLoggerSteps(content);

    fs.writeFileSync(absPath, content, 'utf8');
    console.log(`  ✅  ${relPath}`);
    processed++;
  } catch (e) {
    errors.push(`${relPath}: ${e.message}`);
    console.error(`  ❌  ${relPath}: ${e.message}`);
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`  Processed : ${processed}`);
console.log(`  Skipped   : ${skipped}`);
console.log(`  Errors    : ${errors.length}`);
if (errors.length > 0) errors.forEach(e => console.error('    ' + e));
console.log(`${'─'.repeat(60)}\n`);
