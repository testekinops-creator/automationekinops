const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'reports/results.json');
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

let output = '';

function processSuite(suite) {
  for (const s of suite.suites || []) {
    processSuite(s);
  }
  for (const spec of suite.specs || []) {
    if (spec.title.includes('EDIT-001')) {
      const rmaTest = spec.tests.find(t => t.projectName === 'rma');
      if (rmaTest) {
        const result = rmaTest.results[rmaTest.results.length - 1];
        output += `Test: ${spec.title}\n`;
        output += `Status: ${result.status}\n\n`;
        output += `Steps:\n`;
        printSteps(result.steps, 1);
        output += `\nLogs:\n`;
        if (result.stdout) {
           output += result.stdout.map(x => x.text).join('');
        }
      }
    }
  }
}

function printSteps(steps, indentLevel) {
  if (!steps) return;
  const indent = '  '.repeat(indentLevel);
  for (const step of steps) {
    const icon = step.error ? '❌' : '✅';
    output += `${indent}${icon} ${step.title} (${step.duration}ms)\n`;
    if (step.error && step.error.message) {
      output += `${indent}    Error: ${step.error.message.split('\n')[0]}\n`;
    }
    printSteps(step.steps, indentLevel + 1);
  }
}

for (const suite of data.suites) {
  processSuite(suite);
}

fs.writeFileSync('step_details_edit001.txt', output, 'utf8');
console.log('Done');
