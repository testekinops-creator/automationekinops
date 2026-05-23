const d = JSON.parse(require('fs').readFileSync('reports/results.json', 'utf8'));
function scan(s) {
  for (const c of s.suites || []) scan(c);
  for (const sp of s.specs || []) {
    const t = sp.tests.find(t => t.projectName === 'rma');
    if (t && sp.file && sp.file.includes('workflow-popup')) {
      console.log(t.status.padEnd(12) + ' | ' + sp.title);
    }
  }
}
d.suites.forEach(scan);
