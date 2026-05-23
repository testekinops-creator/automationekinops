/**
 * scripts/replace-loginAs.js
 * Replace all loginAs() calls with switchRole() in spec files.
 * Exceptions:
 *   - auth.spec.js — tests the actual login flow
 *   - auth.setup.js — needs real UI login to cache sessions
 *   - security.spec.js SEC-1 tests — test actual auth bypass (keep loginAs for those)
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob') || { sync: null };

function findFiles(dir, pattern) {
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

const specFiles = findFiles('tests/rma', '.spec.js');
const SKIP_FILES = ['auth.spec.js'];

let totalReplacements = 0;

for (const file of specFiles) {
  const basename = path.basename(file);
  if (SKIP_FILES.includes(basename)) {
    console.log(`SKIP: ${basename} (tests login flow)`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 1. Replace import: add switchRole to the destructure
  if (content.includes('loginAs') && !content.includes('switchRole')) {
    // Add switchRole to the import
    content = content.replace(
      /const\s*\{([^}]*)\bloginAs\b([^}]*)\}\s*=\s*require\([^)]*rmaAuthHelper[^)]*\)/g,
      (match, before, after) => {
        return match.replace('loginAs', 'loginAs, switchRole');
      }
    );
  }

  // 2. Replace all loginAs( calls with switchRole(
  // EXCEPT in comments
  const lines = content.split('\n');
  let replacements = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Replace loginAs( with switchRole(
    if (line.includes('loginAs(') && !line.includes('switchRole')) {
      lines[i] = line.replace(/\bloginAs\(/g, 'switchRole(');
      replacements++;
    }
  }

  if (replacements > 0) {
    content = lines.join('\n');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`FIXED: ${basename} — ${replacements} loginAs → switchRole`);
    totalReplacements += replacements;
  }
}

console.log(`\nTotal: ${totalReplacements} replacements across ${specFiles.length} files`);
