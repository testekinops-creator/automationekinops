const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
function getFiles(dir) {
  let r = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) r.push(...getFiles(f));
    else if (d.name.endsWith('.spec.js')) r.push(f);
  }
  return r;
}
const files = getFiles('tests');
let ok = 0, bad = 0;
for (const f of files) {
  try {
    execSync('node --check "' + f + '"', { stdio: 'pipe' });
    ok++;
  } catch (e) {
    bad++;
    console.log('ERR: ' + path.relative('.', f));
  }
}
console.log(ok + ' OK, ' + bad + ' errors');
