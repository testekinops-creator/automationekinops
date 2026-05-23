const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'reports/results.json');
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

let passedTests = [];

function processSuite(suite) {
  for (const s of suite.suites || []) {
    processSuite(s);
  }
  for (const spec of suite.specs || []) {
    if (spec.file && spec.file.includes('submit-rma.spec.js') || spec.file && spec.file.includes('edit-rma.spec.js')) {
      const rmaTest = spec.tests.find(t => t.projectName === 'rma');
      if (rmaTest) {
        const result = rmaTest.results[rmaTest.results.length - 1];
        if (result.status === 'passed') {
          passedTests.push(`[PASSED] ${spec.title}`);
        }
      }
    }
  }
}

for (const suite of data.suites) {
  processSuite(suite);
}

fs.writeFileSync('passed-submit.txt', passedTests.join('\n'), 'utf8');
console.log(`Found ${passedTests.length} passed tests in submit/edit suites.`);
