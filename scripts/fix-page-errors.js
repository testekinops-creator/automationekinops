/**
 * fix-page-errors.js
 * Fixes two categories of errors found during the test run:
 * 1. test.beforeEach(async () => { ... page ... }) — missing { page } param
 * 2. ROUTES used without being imported
 * 3. `await expect(page.url()).toMatch(...)` — not valid in Playwright, use `expect(page).toHaveURL(...)`
 * 4. `await expect(value).toBeGreaterThanOrEqual(...)` — await on non-async expect
 */
const fs = require('fs');
const path = require('path');

let totalFixes = 0;

function fix(file) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${file} (not found)`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;
  let fixes = [];

  // Fix 1: beforeEach(async () => { ... page ... }) → beforeEach(async ({ page }) => { ... })
  // But ONLY if the beforeEach body actually references `page`
  const beforeEachNoPage = /test\.beforeEach\(async\s*\(\)\s*=>\s*\{([^}]*)\}\)/gs;
  content = content.replace(beforeEachNoPage, (match, body) => {
    if (/\bpage\b/.test(body)) {
      fixes.push('beforeEach: added { page } destructuring');
      return match.replace('async ()', 'async ({ page })');
    }
    return match; // No page ref in body, leave alone
  });

  // Fix 1b: Multi-line beforeEach without page param that uses page
  // Pattern: test.beforeEach(async () => {\n  ...page...\n});
  const beforeEachMultiLine = /test\.beforeEach\(async\s*\(\)\s*=>\s*\{/g;
  let tempContent = content;
  let match;
  while ((match = beforeEachMultiLine.exec(tempContent)) !== null) {
    const start = match.index;
    // Find the closing of this beforeEach
    let braceCount = 1;
    let pos = start + match[0].length;
    while (pos < tempContent.length && braceCount > 0) {
      if (tempContent[pos] === '{') braceCount++;
      if (tempContent[pos] === '}') braceCount--;
      pos++;
    }
    const body = tempContent.substring(start + match[0].length, pos - 1);
    if (/\bpage\b/.test(body)) {
      content = content.replace('test.beforeEach(async () => {' + body + '}', 
        'test.beforeEach(async ({ page }) => {' + body + '}');
      fixes.push('beforeEach (multiline): added { page } destructuring');
    }
  }

  // Fix 2: ROUTES not imported — add import if ROUTES is used but not imported
  if (/\bROUTES\./.test(content) && !/require.*Constants.*ROUTES|ROUTES.*require/.test(content) && !/\bROUTES\b/.test(content.split('\n').find(l => l.includes('require') && l.includes('Constants')) || '')) {
    // Check if Constants is already imported but ROUTES is not destructured
    const constImport = content.match(/const\s*\{([^}]+)\}\s*=\s*require\([^)]*Constants[^)]*\)/);
    if (constImport && !constImport[1].includes('ROUTES')) {
      const oldImport = constImport[0];
      const newImport = oldImport.replace('{', '{ ROUTES,');
      content = content.replace(oldImport, newImport);
      fixes.push('Added ROUTES to Constants import');
    } else if (!constImport) {
      // No Constants import at all — add one after the last require
      const lastRequire = content.lastIndexOf("require('");
      if (lastRequire !== -1) {
        const lineEnd = content.indexOf('\n', lastRequire);
        content = content.substring(0, lineEnd + 1) + 
          "const { ROUTES } = require('" + path.relative(path.dirname(fullPath), path.resolve('src/helpers/Constants')).replace(/\\/g, '/') + "');\n" +
          content.substring(lineEnd + 1);
        fixes.push('Added Constants/ROUTES import');
      }
    }
  }

  // Fix 3: await expect(page.url()).toMatch(/.../) → expect(page.url()).toMatch(/.../))
  // Playwright doesn't need await for string assertions, and toMatch works on strings
  // But actually the issue is that expect(string).toMatch is not Playwright, it's Jest
  // In Playwright: await expect(page).toHaveURL(/.../)
  content = content.replace(/await\s+expect\(page\.url\(\)\)\.toMatch\(([^)]+)\)/g, (match, pattern) => {
    fixes.push('Fixed: page.url().toMatch → expect(page).toHaveURL');
    return `await expect(page).toHaveURL(${pattern})`;
  });

  // Fix 4: await expect(value).toBeGreaterThanOrEqual — remove await (not async)
  content = content.replace(/await\s+expect\((\w+(?:\.\w+)?)\)\.toBeGreaterThanOrEqual/g, (match, val) => {
    fixes.push('Fixed: removed await from non-async expect');
    return `expect(${val}).toBeGreaterThanOrEqual`;
  });
  content = content.replace(/await\s+expect\((\w+(?:\.\w+)?)\)\.toBeGreaterThan\(/g, (match, val) => {
    fixes.push('Fixed: removed await from non-async expect');
    return `expect(${val}).toBeGreaterThan(`;
  });

  // Fix 5: await expect(true).toBe(true) → expect(true).toBe(true) (no await needed)
  content = content.replace(/await\s+expect\(true\)\.toBe\(true\)/g, () => {
    fixes.push('Fixed: removed await from expect(true)');
    return 'expect(true).toBe(true)';
  });

  // Fix 6: await expect(false).toBe(false) pattern
  content = content.replace(/await\s+expect\(await\s+([^)]+)\)\.toBe\((true|false)\)/g, (match, expr, val) => {
    fixes.push('Fixed: simplified async expect pattern');
    return `expect(await ${expr}).toBe(${val})`;
  });

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`FIXED: ${file}`);
    fixes.forEach(f => console.log(`  ✓ ${f}`));
    totalFixes += fixes.length;
  } else {
    console.log(`OK: ${file} (no changes needed)`);
  }
}

// All affected files
const files = [
  'tests/rma/functional/dashboard-kpi-workflow.spec.js',
  'tests/rma/functional/dashboard.spec.js',
  'tests/rma/functional/factory-receive-module.spec.js',
  'tests/rma/functional/integration.spec.js',
  'tests/rma/functional/manage-address.spec.js',
  'tests/rma/functional/edit-rma.spec.js',
  'tests/rma/functional/customer-reassignment.spec.js',
  'tests/rma/access/test-options.spec.js',
  'tests/rma/functional/debug-test.spec.js',
];

files.forEach(fix);

console.log(`\nTotal fixes applied: ${totalFixes}`);
