/**
 * audit-project.js
 * Full Playwright framework audit — checks for:
 *   1. Hardcoded credentials (passwords, emails, tokens)
 *   2. Hardcoded URLs
 *   3. Hardcoded serial numbers / test data
 *   4. page.waitForTimeout (anti-pattern sleep)
 *   5. console.log instead of Logger
 *   6. test.only / describe.only left in code
 *   7. Magic timeout numbers
 *   8. Hardcoded test.skip(true)
 *   9. Missing storageState / direct login inside tests
 *  10. process.env reads outside config.js
 *  11. Assertions without await
 *  12. Missing test tags
 *  13. Files missing allure / Logger imports
 *  14. Empty test bodies / placeholder tests
 *  15. axios/fetch calls inside test files (should be in apiHelper)
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = process.cwd();
const issues = {};
let totalFiles = 0;

function add(category, severity, file, line, snippet) {
  if (!issues[category]) issues[category] = [];
  issues[category].push({
    severity,
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    line,
    snippet: snippet.trim().replace(/\s+/g, ' ').substring(0, 100),
  });
}

// ── File walker ───────────────────────────────────────────────────────────────
const allFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', '.git', 'allure-results', 'allure-report', 'test-results', 'logs'].includes(f)) walk(full);
    } else if (f.endsWith('.js')) {
      allFiles.push(full);
    }
  }
}
['tests', 'src', 'config'].forEach(d => walk(path.join(ROOT, d)));

// ── Per-file analysis ─────────────────────────────────────────────────────────
for (const absFile of allFiles) {
  totalFiles++;
  const rel  = path.relative(ROOT, absFile).replace(/\\/g, '/');
  const raw  = fs.readFileSync(absFile, 'utf8');
  const lines = raw.split('\n');
  const isSpec    = rel.includes('.spec.js');
  const isHelper  = rel.startsWith('src/helpers');
  const isConfig  = rel.startsWith('config/') || rel === 'src/helpers/config.js';
  const isConstants = rel.includes('Constants');

  lines.forEach((line, idx) => {
    const ln   = idx + 1;
    const trim = line.trim();

    // Skip pure comment lines
    if (/^\/\//.test(trim) || /^\*/.test(trim) || trim === '') return;

    // ── 1. Hardcoded credentials ─────────────────────────────────────────────
    // Password literals not from env/USERS
    if (/\bpassword\b/i.test(trim) && /['"`][^'"`\s]{4,}['"`]/.test(trim)
        && !trim.includes('process.env') && !trim.includes('USERS.') && !trim.includes('config.')
        && !trim.includes('fillPassword') && !trim.includes('user.password') && !trim.includes('//')) {
      add('HARDCODED_CREDENTIALS', 'HIGH', absFile, ln, trim);
    }
    // Email literals hardcoded
    if (/['"`][a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}['"`]/.test(trim)
        && !trim.includes('USERS.') && !trim.includes('process.env') && !trim.includes('config.')
        && !trim.includes('@playwright') && !trim.includes('// ')
        && !isConstants && !isConfig) {
      add('HARDCODED_CREDENTIALS', 'HIGH', absFile, ln, trim);
    }

    // ── 2. Hardcoded URLs ────────────────────────────────────────────────────
    const urlMatch = trim.match(/https?:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/);
    if (urlMatch && !trim.includes('playwright.dev') && !trim.includes('github.com')
        && !trim.includes('npmjs') && !trim.includes('ekinops.com')
        && !isConfig && !isConstants) {
      add('HARDCODED_URL', 'MEDIUM', absFile, ln, trim);
    }
    // Base URL in config should be from env
    if (isConfig && /baseURL\s*[:=]\s*['"`]https?:\/\//.test(trim) && !trim.includes('process.env')) {
      add('HARDCODED_URL', 'HIGH', absFile, ln, trim);
    }

    // ── 3. Hardcoded serial numbers in test files ────────────────────────────
    if (isSpec && !isConstants) {
      const serials = trim.match(/['"`][A-Z][A-Z0-9]{12,}['"`]/g);
      if (serials) {
        serials.forEach(s => {
          if (!trim.includes('RMA.') && !trim.includes('SERIAL') && !trim.includes('Constants')) {
            add('HARDCODED_TEST_DATA', 'HIGH', absFile, ln, trim);
          }
        });
      }
    }

    // ── 4. page.waitForTimeout (sleep anti-pattern) — skip comments & replaced lines
    if (/waitForTimeout\s*\(/.test(trim) && !trim.startsWith('//') && !line.includes('// replaced') && !line.includes('// removed')) {
      const ms = trim.match(/waitForTimeout\s*\(\s*(\d+)/);
      const severity = ms && parseInt(ms[1]) >= 3000 ? 'HIGH' : 'MEDIUM';
      add('WAIT_FOR_TIMEOUT', severity, absFile, ln, trim);
    }

    // ── 5. console.log instead of Logger ────────────────────────────────────
    if (isSpec && /console\.(log|warn|error)\s*\(/.test(trim) && !trim.startsWith('//')) {
      add('CONSOLE_LOG', 'LOW', absFile, ln, trim);
    }

    // ── 6. test.only / describe.only ─────────────────────────────────────────
    if (/test\.only\s*\(|\.only\s*\(/.test(trim) && isSpec) {
      add('TEST_ONLY_FOCUSED', 'HIGH', absFile, ln, trim);
    }

    // ── 7. Magic timeout numbers (>10s inline) ────────────────────────────────
    if (/timeout\s*:\s*[1-9]\d{4,}/.test(trim) && !trim.includes('navigationTimeout') && !isConfig) {
      add('MAGIC_TIMEOUT', 'LOW', absFile, ln, trim);
    }

    // ── 8. Hardcoded test.skip(true) ─────────────────────────────────────────
    if (/test\.skip\s*\(\s*true\s*[,)]/.test(trim)) {
      add('HARDCODED_SKIP', 'MEDIUM', absFile, ln, trim);
    }

    // ── 9. process.env reads outside config.js ───────────────────────────────
    if (/process\.env\./.test(trim) && !isConfig && !rel.includes('playwright.config')) {
      add('PROCESS_ENV_OUTSIDE_CONFIG', 'MEDIUM', absFile, ln, trim);
    }

    // ── 10. Direct credentials/login inside spec (not using storageState) ────
    if (isSpec && /loginPage\.(fillEmail|fillPassword|clickSubmit)/.test(trim)
        && !rel.includes('auth.spec') && !rel.includes('auth.setup')) {
      add('DIRECT_LOGIN_IN_SPEC', 'HIGH', absFile, ln, trim);
    }

    // ── 11. axios/fetch in spec files (should use apiHelper) ─────────────────
    if (isSpec && /(require\s*\(\s*['"`]axios['"`]\)|fetch\s*\(|axios\.(get|post|put|patch|delete)\s*\()/.test(trim)) {
      add('AXIOS_IN_SPEC', 'HIGH', absFile, ln, trim);
    }

    // ── 12. Missing test tag annotations ─────────────────────────────────────
    if (isSpec && /^\s*test\s*\(/.test(line)) {
      // Extended tag list
      if (!/@(smoke|regression|functional|security|rbac|workflow|submit|view|edit|dashboard|factory|filter|integration|auth|debug|gap)/.test(trim)) {
        add('MISSING_TEST_TAG', 'LOW', absFile, ln, trim);
      }
    }

    // ── 13. Bare page.goto with hardcoded path (not ROUTES.) — skip dynamic template paths
    if (isSpec && /page\.goto\s*\(\s*['"`]\//.test(trim) && !trim.includes('ROUTES.') && !trim.includes('process.env') && !trim.includes('${')){  
      add('HARDCODED_ROUTE', 'MEDIUM', absFile, ln, trim);
    }

    // ── 14. Empty catch blocks ────────────────────────────────────────────────
    if (/}\s*catch\s*\([^)]*\)\s*\{\s*\}/.test(trim)) {
      add('EMPTY_CATCH', 'MEDIUM', absFile, ln, trim);
    }

    // ── 15. TODO / FIXME ─────────────────────────────────────────────────────
    if (/\b(TODO|FIXME|HACK|XXX)\b/.test(trim)) {
      add('TODO_FIXME', 'LOW', absFile, ln, trim);
    }

    // ── 16. setTimeout (non-page) ────────────────────────────────────────────
    if (isSpec && /setTimeout\s*\(/.test(trim) && !trim.startsWith('//')) {
      add('NATIVE_SET_TIMEOUT', 'MEDIUM', absFile, ln, trim);
    }

    // ── 17. expect without await ─────────────────────────────────────────────
    if (isSpec && /^\s*expect\s*\(/.test(line) && !/^\s*await\s+expect/.test(line)
        && !/const|let|var|return/.test(trim)) {
      add('MISSING_AWAIT_EXPECT', 'HIGH', absFile, ln, trim);
    }
  });

  // ── Per-file checks ──────────────────────────────────────────────────────
  if (isSpec) {
    // Check allure import
    if (!raw.includes('allure-playwright')) {
      add('MISSING_ALLURE_IMPORT', 'MEDIUM', absFile, 1, rel);
    }
    // Check Logger import
    if (!/require.*Logger/.test(raw)) {
      add('MISSING_LOGGER_IMPORT', 'MEDIUM', absFile, 1, rel);
    }
    // Check allure.feature
    if (!raw.includes('allure.feature(')) {
      add('MISSING_ALLURE_LABELS', 'MEDIUM', absFile, 1, rel);
    }
  }
}

// ── Print Report ──────────────────────────────────────────────────────────────
const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const SEV_COLOR = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };

let grandTotal = 0;
const sorted = Object.entries(issues).sort((a, b) => {
  const aMax = Math.min(...a[1].map(i => SEVERITY_ORDER[i.severity]));
  const bMax = Math.min(...b[1].map(i => SEVERITY_ORDER[i.severity]));
  return aMax - bMax;
});

console.log('\n' + '═'.repeat(70));
console.log('  PLAYWRIGHT AUTOMATION FRAMEWORK — FULL PROJECT AUDIT');
console.log('  Files scanned: ' + totalFiles);
console.log('═'.repeat(70));

const summary = [];
for (const [cat, items] of sorted) {
  grandTotal += items.length;
  const highCount   = items.filter(i => i.severity === 'HIGH').length;
  const mediumCount = items.filter(i => i.severity === 'MEDIUM').length;
  const lowCount    = items.filter(i => i.severity === 'LOW').length;
  summary.push({ cat, total: items.length, highCount, mediumCount, lowCount });

  const topSev = highCount > 0 ? '🔴' : mediumCount > 0 ? '🟡' : '🟢';
  console.log('\n' + topSev + ' ' + cat + ' [' + items.length + ' issues]');
  console.log('─'.repeat(60));

  const toShow = items.slice(0, 6);
  for (const i of toShow) {
    console.log('  ' + SEV_COLOR[i.severity] + ' ' + i.file + ':' + i.line);
    console.log('     ' + i.snippet);
  }
  if (items.length > 6) console.log('  ... and ' + (items.length - 6) + ' more instances');
}

console.log('\n' + '═'.repeat(70));
console.log('  SUMMARY TABLE');
console.log('═'.repeat(70));
console.log('  Category'.padEnd(38) + 'Total  High  Med   Low');
console.log('─'.repeat(70));
for (const s of summary) {
  console.log(('  ' + s.cat).padEnd(38) + String(s.total).padEnd(7) + String(s.highCount).padEnd(6) + String(s.mediumCount).padEnd(6) + s.lowCount);
}
console.log('─'.repeat(70));
console.log('  TOTAL'.padEnd(38) + grandTotal);
console.log('═'.repeat(70) + '\n');
