/**
 * fix-browser-page.js
 * Some tests use browser.newContext().newPage() to create their own page.
 * These need { browser } not { page }. But our previous fix changed all to { page }.
 * This script restores { browser } for tests that create 'const page = await context.newPage()'
 */
const fs = require('fs');

const files = [
  'tests/rma/functional/customer-reassignment.spec.js',
  'tests/rma/functional/standardized-faults.spec.js',
  'tests/rma/regression/bug-regression.spec.js',
];

let totalFixes = 0;

for (const file of files) {
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  let fixes = 0;

  for (let i = 0; i < lines.length; i++) {
    // Find test callbacks with { page }
    if (lines[i].match(/test\(['""].*async\s*\(\{\s*page\s*\}\)/)) {
      // Check if within next 10 lines there's 'const page = await context.newPage()'
      let createsOwnPage = false;
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        if (lines[j].match(/const\s+page\s*=\s*await\s+(context|browser)/)) {
          createsOwnPage = true;
          break;
        }
      }
      if (createsOwnPage) {
        lines[i] = lines[i].replace('async ({ page })', 'async ({ browser })');
        fixes++;
      }
    }
  }

  if (fixes > 0) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log(`FIXED: ${file} — restored { browser } in ${fixes} tests`);
    totalFixes += fixes;
  }
}

// Also fix customer-reassignment.spec.js line 43 which uses page without creating it
// Need to check: tests that use `page` directly but have { page } AND don't create own page
// Those are correct and should stay as { page }

console.log(`\nTotal fixes: ${totalFixes}`);
