/**
 * scripts/replace-networkidle.js
 * Replace waitForLoadState('networkidle') with 'domcontentloaded' in spec files.
 * networkidle waits for ALL network activity to stop which is very slow.
 * domcontentloaded is sufficient for most tests.
 * 
 * Exception: keep networkidle in integration.spec.js where it's used for
 * critical form submissions that need AJAX to complete.
 */
const fs = require('fs');
const path = require('path');

function findFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.spec.js')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

const specFiles = findFiles('tests/rma');
let totalReplacements = 0;

for (const file of specFiles) {
  const basename = path.basename(file);
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace networkidle with domcontentloaded
  const matches = (content.match(/networkidle/g) || []).length;
  if (matches > 0) {
    content = content.replace(/'networkidle'/g, "'domcontentloaded'");
    content = content.replace(/"networkidle"/g, "'domcontentloaded'");
    fs.writeFileSync(file, content, 'utf8');
    console.log(`FIXED: ${basename} — ${matches} networkidle → domcontentloaded`);
    totalReplacements += matches;
  }
}

console.log(`\nTotal: ${totalReplacements} replacements`);
