const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'reports/results.json');
const outputPath = 'C:\\Users\\Deepak.Hegde\\.gemini\\antigravity\\brain\\f0dd2571-a463-4cf9-a4d3-3c5c3c84d59b\\failures_detailed.md';

const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

let md = '# Detailed Failure and Skip Analysis\n\n';
md += 'This document contains the exact failing steps, error messages, and test data for all Chromium failures and skipped tests.\n\n';

for (const suite of data.suites) {
  processSuite(suite, 1);
}

fs.writeFileSync(outputPath, md, 'utf8');
console.log('Done writing detailed failures to ' + outputPath);

function processSuite(suite, depth) {
  if (suite.title === 'rma-firefox') return; // Skip Firefox
  
  for (const s of suite.suites || []) {
    processSuite(s, depth + 1);
  }
  
  for (const spec of suite.specs || []) {
    const rmaTest = spec.tests.find(t => t.projectName === 'rma');
    if (!rmaTest) continue;
    
    // We only care about failures and skips
    const result = rmaTest.results[rmaTest.results.length - 1]; // last attempt
    if (result.status === 'passed') continue;
    
    md += `## ${spec.title}\n`;
    md += `**Status:** ${result.status.toUpperCase()}\n`;
    md += `**File:** ${spec.file}\n\n`;
    
    if (result.error && result.error.message) {
      md += `### Error Message\n\`\`\`\n${result.error.message}\n\`\`\`\n\n`;
    }
    
    // Look for steps that failed
    const failedSteps = findFailedSteps(result.steps || []);
    if (failedSteps.length > 0) {
      md += `### Failing Step\n`;
      for (const step of failedSteps) {
        md += `- **${step.title}** (Duration: ${step.duration}ms)\n`;
        if (step.error && step.error.message) {
           md += `  \`\`\`\n  ${step.error.message.split('\n')[0]}\n  \`\`\`\n`;
        }
      }
      md += '\n';
    }
    
    // Extract stdout/stderr which often contains test data (like S/N generated)
    if (result.stdout && result.stdout.length > 0) {
      const logs = result.stdout.map(x => x.text).join('').split('\n').filter(l => l.includes('INFO') || l.includes('S/N')).join('\n');
      if (logs) {
         md += `### Test Data / Logs\n\`\`\`\n${logs.substring(0, 500)}${logs.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
      }
    }
  }
}

function findFailedSteps(steps) {
  let failed = [];
  for (const step of steps) {
    if (step.error) {
       // if this step has child steps that failed, grab those instead (to get the most specific step)
       const childFails = findFailedSteps(step.steps || []);
       if (childFails.length > 0) {
          failed = failed.concat(childFails);
       } else {
          failed.push(step);
       }
    }
  }
  return failed;
}
