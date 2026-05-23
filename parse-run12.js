const fs = require('fs');
const data = JSON.parse(fs.readFileSync('reports/results.json', 'utf8'));

let failed = [];
let skipped = [];
let flaky = [];

function processSuite(suite, filePath) {
  const file = suite.file || filePath || '';
  for (const s of suite.suites || []) {
    processSuite(s, file);
  }
  for (const spec of suite.specs || []) {
    const rmaTest = spec.tests.find(t => t.projectName === 'rma');
    if (!rmaTest) continue;

    const lastResult = rmaTest.results[rmaTest.results.length - 1];
    const status = rmaTest.status; // 'expected', 'unexpected', 'flaky', 'skipped'

    if (status === 'unexpected' || status === 'flaky' || status === 'skipped') {
      const entry = {
        title: spec.title,
        file: spec.file || file,
        status: status,
        error: '',
        failingStep: '',
        selector: '',
        steps: [],
        stdout: [],
      };

      if (lastResult) {
        // Extract error
        if (lastResult.errors && lastResult.errors.length > 0) {
          entry.error = lastResult.errors[0].message || '';
        } else if (lastResult.error && lastResult.error.message) {
          entry.error = lastResult.error.message;
        }

        // Extract steps
        function extractSteps(steps, depth) {
          if (!steps) return;
          for (const step of steps) {
            const icon = step.error ? '❌' : '✅';
            const prefix = '  '.repeat(depth);
            entry.steps.push(`${prefix}${icon} ${step.title} (${step.duration}ms)`);
            if (step.error && step.error.message) {
              const errLine = step.error.message.split('\n')[0];
              entry.steps.push(`${prefix}    💥 ${errLine}`);
              // Extract selector from error
              const selectorMatch = step.error.message.match(/locator\(['"]([^'"]+)['"]\)/);
              const filterMatch = step.error.message.match(/filter\(\{[^}]+\}\)/);
              if (selectorMatch) entry.selector = selectorMatch[0];
              if (filterMatch && !entry.selector) entry.selector = filterMatch[0];
              
              // Extract waiting for locator
              const waitMatch = step.error.message.match(/waiting for (locator\([^)]+\)(?:\.[^)]+\))*)/);
              if (waitMatch) entry.failingStep = waitMatch[1];
            }
            extractSteps(step.steps, depth + 1);
          }
        }
        extractSteps(lastResult.steps, 0);

        // Extract stdout logs
        if (lastResult.stdout) {
          for (const out of lastResult.stdout) {
            if (out.text) entry.stdout.push(out.text.trim());
          }
        }

        // Try to extract selector from error message
        if (!entry.selector && entry.error) {
          const sMatch = entry.error.match(/locator\([^)]+\)/g);
          if (sMatch) entry.selector = sMatch.join(' → ');
          
          const waitMatch = entry.error.match(/waiting for (locator\([^)]+\)(?:\.[^)]+\))*)/);
          if (waitMatch) entry.failingStep = waitMatch[1];
        }
      }

      if (status === 'unexpected') failed.push(entry);
      else if (status === 'flaky') flaky.push(entry);
      else if (status === 'skipped') skipped.push(entry);
    }
  }
}

for (const suite of data.suites) {
  processSuite(suite);
}

// Group failed by file
const failedByFile = {};
for (const f of failed) {
  const key = f.file || 'unknown';
  if (!failedByFile[key]) failedByFile[key] = [];
  failedByFile[key].push(f);
}

let output = `# Run 12 Detailed Report — ${new Date().toISOString().split('T')[0]}\n\n`;
output += `## Summary\n`;
output += `| Status | Count |\n|--------|-------|\n`;
output += `| ✅ Passed | ${data.stats.expected} |\n`;
output += `| ❌ Failed | ${data.stats.unexpected} |\n`;
output += `| 🔄 Flaky | ${data.stats.flaky} |\n`;
output += `| ⏭️ Skipped | ${data.stats.skipped} |\n\n`;

output += `---\n\n## ❌ Failed Tests (${failed.length})\n\n`;

for (const [file, tests] of Object.entries(failedByFile)) {
  output += `### 📁 ${file} (${tests.length} failures)\n\n`;
  for (const t of tests) {
    output += `#### ❌ ${t.title}\n`;
    if (t.failingStep) output += `- **Failing Locator:** \`${t.failingStep}\`\n`;
    if (t.selector) output += `- **Selector:** \`${t.selector}\`\n`;
    if (t.error) {
      const shortErr = t.error.split('\n').slice(0, 3).join('\n');
      output += `- **Error:**\n\`\`\`\n${shortErr}\n\`\`\`\n`;
    }
    if (t.stdout.length > 0) {
      const logs = t.stdout.slice(0, 10).join('\n');
      output += `- **Logs:**\n\`\`\`\n${logs}\n\`\`\`\n`;
    }
    if (t.steps.length > 0) {
      output += `- **Steps:**\n\`\`\`\n${t.steps.join('\n')}\n\`\`\`\n`;
    }
    output += `\n`;
  }
}

output += `---\n\n## 🔄 Flaky Tests (${flaky.length})\n\n`;
for (const t of flaky) {
  output += `#### 🔄 ${t.title}\n`;
  output += `- **File:** ${t.file}\n`;
  if (t.error) {
    const shortErr = t.error.split('\n').slice(0, 2).join('\n');
    output += `- **Error (before retry):**\n\`\`\`\n${shortErr}\n\`\`\`\n`;
  }
  output += `\n`;
}

output += `---\n\n## ⏭️ Skipped Tests (${skipped.length})\n\n`;

// Group skipped by file
const skippedByFile = {};
for (const s of skipped) {
  const key = s.file || 'unknown';
  if (!skippedByFile[key]) skippedByFile[key] = [];
  skippedByFile[key].push(s);
}
for (const [file, tests] of Object.entries(skippedByFile)) {
  output += `### 📁 ${file} (${tests.length} skipped)\n`;
  for (const t of tests) {
    output += `- ⏭️ ${t.title}\n`;
  }
  output += `\n`;
}

fs.writeFileSync('reports/run12_detailed.md', output, 'utf8');
console.log(`Done: ${failed.length} failed, ${flaky.length} flaky, ${skipped.length} skipped`);
