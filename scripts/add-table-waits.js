/**
 * scripts/add-table-waits.js
 * Adds explicit AJAX table waits after domcontentloaded waits in spec files
 * that access table data. This fixes the issue where domcontentloaded fires
 * before DataTable AJAX loads the rows.
 */
const fs = require('fs');
const path = require('path');

function findSpecFiles(dir) {
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

const specFiles = findSpecFiles('tests/rma');
let totalAdded = 0;

for (const file of specFiles) {
  const basename = path.basename(file);
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Add AJAX table wait after beforeEach that goes to viewRma/list and waits
  // Pattern: page.goto(ROUTES.viewRma) ... waitForLoadState('domcontentloaded')
  // but NOT followed by a table wait
  const pattern = /(await page\.waitForLoadState\('domcontentloaded'\);)(\s*\n)(\s*}\);)/g;
  
  // Only add table waits in beforeEach blocks that navigate to list pages
  const lines = content.split('\n');
  let modified = false;
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    
    // After a line with waitForLoadState('domcontentloaded')
    // that's inside a beforeEach and preceded by a goto to a list page
    if (lines[i].match(/waitForLoadState\('domcontentloaded'\)/) && 
        !lines[i].match(/\/\/.*wait/i)) {
      
      // Look back up to 5 lines for a goto to a list/table page
      let hasListGoto = false;
      for (let j = Math.max(0, i-5); j < i; j++) {
        if (lines[j].match(/goto\(ROUTES\.(viewRma|factoryReceive|manageAddress|standardizedFaults)/)) {
          hasListGoto = true;
          break;
        }
      }
      
      // Look forward to check if there's already a table wait
      let alreadyHasWait = false;
      for (let j = i+1; j < Math.min(lines.length, i+3); j++) {
        if (lines[j] && lines[j].match(/table tbody tr|waitFor.*visible/)) {
          alreadyHasWait = true;
          break;
        }
      }
      
      if (hasListGoto && !alreadyHasWait) {
        const indent = lines[i].match(/^(\s*)/)[1];
        newLines.push(`${indent}// Wait for AJAX DataTable to populate`);
        newLines.push(`${indent}await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});`);
        modified = true;
        totalAdded++;
      }
    }
  }
  
  if (modified) {
    content = newLines.join('\n');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`FIXED: ${basename}`);
  }
}

console.log(`\nTotal table waits added: ${totalAdded}`);
