/**
 * generate-excel-report.js
 * Generates test-case-report.xlsx from actual framework test files + results.json
 * Extracts REAL test steps from actual spec files.
 * Run: node scripts/generate-excel-report.js
 */
'use strict';
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'reports', 'test-case-report.xlsx');

// ── 1. Parse test results JSON ────────────────────────────────────────────────
let resultsData = { suites: [], stats: {} };
const resultsJson = path.join(ROOT, 'reports', 'results.json');
if (fs.existsSync(resultsJson)) {
  try { resultsData = JSON.parse(fs.readFileSync(resultsJson, 'utf8')); } catch (_) {}
}

const resultMap = {};
function flattenSuites(suites = []) {
  for (const suite of suites) {
    for (const spec of (suite.specs || [])) {
      for (const test of (spec.tests || [])) {
        const key = (spec.title || '').trim();
        // Use the LAST result's status (handles retries correctly)
        const results = test.results || [];
        const lastResult = results[results.length - 1] || {};
        const rawStatus = lastResult.status || test.status || '';
        const status = rawStatus === 'passed'   ? 'Pass'
                     : (rawStatus === 'failed' || rawStatus === 'timedOut') ? 'Fail'
                     : 'Skip';
        const screenshot = (lastResult.attachments || []).find(a => a.contentType === 'image/png')?.path || '';
        const trace = (lastResult.attachments || []).find(a => a.contentType === 'application/zip')?.path || '';
        resultMap[key] = { status, screenshot, trace };
      }
    }
    // Recurse into nested suites (Playwright JSON can be 3-4 levels deep)
    flattenSuites(suite.suites || []);
  }
}
flattenSuites(resultsData.suites || []);

// ── 2. Step extractor — parses actual test body ────────────────────────────────
/**
 * Given the full source code of a spec file and a test title,
 * extract the body of that test() function and convert await calls
 * into human-readable numbered step descriptions.
 */
function extractTestSteps(fileContent, testTitle) {
  // Escape special regex chars in title
  const escaped = testTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find the test() block by title — support both ' and `
  const testBlockRe = new RegExp(
    `test\\s*\\(\\s*[\`'"]${escaped}[\`'"]\\s*,\\s*async\\s*\\(([^)]+)\\)\\s*=>\\s*\\{`,
    's'
  );
  const matchStart = testBlockRe.exec(fileContent);
  if (!matchStart) return null;

  // Extract balanced braces block
  let depth = 0;
  let start = matchStart.index + matchStart[0].length - 1; // position of opening {
  let end = start;
  for (let i = start; i < fileContent.length; i++) {
    if (fileContent[i] === '{') depth++;
    else if (fileContent[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = fileContent.slice(start + 1, end);

  // Convert code lines → human-readable steps
  const lines = body.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('const ') && !l.startsWith('let ') && !l.startsWith('var '))
    .filter(l => l.startsWith('await ') || l.startsWith('expect(') || l.startsWith('test.skip') || l.includes('expect(') || l.startsWith('for '));

  const steps = [];
  let stepNum = 1;

  for (const line of lines) {
    const step = translateLineToStep(line, stepNum);
    if (step) { steps.push(`${stepNum}. ${step}`); stepNum++; }
    if (stepNum > 12) break; // cap at 12 steps
  }

  return steps.length > 0 ? steps.join('\n') : null;
}

function translateLineToStep(line, num) {
  const l = line.trim();

  // page.goto
  if (/page\.goto\(/.test(l)) {
    const urlMatch = l.match(/page\.goto\(\s*(['"`]?)([^'"`),]+)(['"`]?)/);
    const url = urlMatch ? urlMatch[2].replace(/ROUTES\./,'').replace(/['"]/g,'') : 'application URL';
    return `Navigate to ${url}`;
  }
  // filterRmaList
  if (/filterRmaList/.test(l)) {
    const statusM = l.match(/status:\s*['"`]([^'"`]+)['"`]/);
    const kwM = l.match(/keyword:\s*['"`]([^'"`]+)['"`]/);
    const parts = [];
    if (statusM) parts.push(`status="${statusM[1]}"`);
    if (kwM) parts.push(`keyword="${kwM[1]}"`);
    return parts.length > 0 ? `Apply RMA list filters (${parts.join(', ')})` : 'Apply RMA list filters';
  }
  // login / loginAs
  if (/loginPage\.login\(|loginAs\(|\.login\(/.test(l)) {
    const userM = l.match(/USERS\.(\w+)|loginAs\(\s*([^,)]+)/);
    const user = userM ? (userM[1] || userM[2]).replace('page,','').trim() : 'user';
    return `Login as ${user}`;
  }
  // fillEmail
  if (/fillEmail\(/.test(l)) {
    const emailM = l.match(/fillEmail\(\s*(['"`])([^'"`]+)\1/);
    return `Enter email: ${emailM ? emailM[2] : 'test email'}`;
  }
  // fillPassword
  if (/fillPassword\(/.test(l)) {
    return `Enter password`;
  }
  // clickSubmit / click login
  if (/clickSubmit\(|loginPage\.click/.test(l)) {
    return `Click Submit / Login button`;
  }
  // logout
  if (/\.logout\(/.test(l)) {
    return `Click Logout and end session`;
  }
  // page.reload
  if (/page\.reload\(/.test(l)) {
    return `Reload the page`;
  }
  // click
  if (/\.click\(/.test(l)) {
    const elM = l.match(/locator\((['"`])([^'"`]+)\1\)\.click|(\w+Btn|link|row|tab|icon|button)\.click/);
    const el = elM ? (elM[2] || elM[3] || 'element') : 'element';
    return `Click "${el.replace(/['"]/g,'').replace(/\n/g,'').substring(0, 60)}"`;
  }
  // fill
  if (/\.fill\(/.test(l)) {
    const fieldM = l.match(/locator\((['"`])([^'"`]+)\1\)\.fill|input\[name=['"`]([^'"`]+)['"`]\]/);
    const valM = l.match(/\.fill\(\s*(['"`])([^'"`]+)\1/);
    const field = fieldM ? (fieldM[2] || fieldM[3] || 'field') : 'field';
    const val = valM ? valM[2] : 'value';
    return `Fill "${field.substring(0,40)}" with "${val.substring(0,40)}"`;
  }
  // selectOption
  if (/\.selectOption\(/.test(l)) {
    const valM = l.match(/selectOption\(\s*(['"`])([^'"`]+)\1/);
    return `Select option: "${valM ? valM[2] : 'value'}"`;
  }
  // waitForLoadState
  if (/waitForLoadState\(/.test(l)) {
    return `Wait for page to fully load`;
  }
  // waitFor
  if (/\.waitFor\(/.test(l)) {
    return `Wait for element to become visible`;
  }
  // expect toBeVisible
  if (/expect.*toBeVisible/.test(l)) {
    const elM = l.match(/locator\((['"`])([^'"`]+)\1\)|(\w+Btn|\w+Row|\w+Cell|\w+El)/);
    const el = elM ? (elM[2] || elM[3] || 'element') : 'element';
    return `Verify "${el.substring(0,50)}" is visible`;
  }
  // expect toHaveURL
  if (/toHaveURL/.test(l)) {
    const urlM = l.match(/toHaveURL\(\/([^/]+)\//);
    return `Verify page URL matches "${urlM ? urlM[1] : 'expected route'}"`;
  }
  // expect not toHaveURL
  if (/not\.toHaveURL/.test(l)) {
    return `Verify user has navigated away from login page`;
  }
  // expect toContainText
  if (/toContainText\(/.test(l)) {
    const txtM = l.match(/toContainText\(\s*(['"`])([^'"`]+)\1/);
    return `Verify page contains text: "${txtM ? txtM[2].substring(0,50) : 'expected text'}"`;
  }
  // expect not toContainText
  if (/not\.toContainText/.test(l)) {
    const txtM = l.match(/not\.toContainText\(\s*(['"`])([^'"`]+)\1/);
    return `Verify page does NOT contain: "${txtM ? txtM[2].substring(0,50) : 'error text'}"`;
  }
  // expect toHaveValue
  if (/toHaveValue/.test(l)) {
    const valM = l.match(/toHaveValue\(\s*(['"`])([^'"`]+)\1/);
    return `Verify field value is "${valM ? valM[2] : 'expected'}"`;
  }
  // expect count / toBe
  if (/\.count\(\)|toBeGreaterThan|toBeGreaterThanOrEqual/.test(l)) {
    return `Verify result count is within expected range`;
  }
  // test.skip
  if (/test\.skip/.test(l)) {
    const reasonM = l.match(/test\.skip\([^,]+,\s*(['"`])([^'"`]+)\1/);
    return `Skip if pre-condition not met: ${reasonM ? reasonM[2].substring(0,60) : '(data not available)'}`;
  }
  // page.request (API call)
  if (/page\.request\.(get|post|patch|put|delete)/.test(l)) {
    const methodM = l.match(/page\.request\.(get|post|patch|put|delete)\(\s*(['"`])([^'"`]+)\1/);
    const method = methodM ? methodM[1].toUpperCase() : 'HTTP';
    const url = methodM ? methodM[3] : 'API endpoint';
    return `Send ${method} request to "${url}"`;
  }
  // filterByStatus
  if (/filterByStatus/.test(l)) {
    const statusM = l.match(/filterByStatus\(\s*(['"`])([^'"`]+)\1/);
    return `Filter list by status: "${statusM ? statusM[2] : 'status'}"`;
  }
  // goToRmaDetailByStatus
  if (/goToRmaDetailByStatus/.test(l)) {
    const statusM = l.match(/goToRmaDetailByStatus\(\s*(['"`])([^'"`]+)\1/);
    return `Navigate to first RMA with status: "${statusM ? statusM[2] : 'status'}"`;
  }
  // getDetailAllActionButtons
  if (/getDetailAllActionButtons/.test(l)) {
    return `Capture all visible action buttons on RMA detail page`;
  }
  // expect.soft
  if (/expect\.soft/.test(l)) {
    return `Soft-assert element state (non-fatal check)`;
  }
  return null;
}

// ── 3. Module and priority maps ───────────────────────────────────────────────
const MODULE_MAP = {
  'auth.spec.js': 'Authentication',
  'rbac.spec.js': 'RBAC / Access Control',
  'dashboard.spec.js': 'Dashboard',
  'submit-rma.spec.js': 'Submit RMA',
  'view-rma.spec.js': 'View RMA',
  'workflow.spec.js': 'Workflow',
  'rma-list-filter.spec.js': 'RMA List & Filter',
  'edit-rma.spec.js': 'Edit RMA',
  'factory-receive-module.spec.js': 'Factory Receive',
  'view-screen-actions.spec.js': 'View Screen Actions',
  'integration.spec.js': 'Integration',
  'dashboard-kpi-workflow.spec.js': 'Dashboard KPI',
  'manage-address.spec.js': 'Manage Address',
  'rma-history.spec.js': 'RMA History',
  'return-location.spec.js': 'Return Location',
  'customer-reassignment.spec.js': 'Customer Reassignment',
  'standardized-faults.spec.js': 'Standardized Faults',
  'rma-print-consignment.spec.js': 'Print Consignment',
  'workflow-popup-validation.spec.js': 'Workflow Popup Validation',
  'debug-test.spec.js': 'Debug / Investigation',
};

const PRIORITY_MAP = {
  'auth': 'High', 'smoke': 'High', 'security': 'High',
  'workflow': 'High', 'rbac': 'High', 'submit': 'High',
  'filter': 'Medium', 'view': 'Medium', 'edit': 'Medium',
  'dashboard': 'Medium', 'factory': 'Medium',
  'history': 'Low', 'address': 'Low', 'debug': 'Low',
};

function getPriority(id, module) {
  const idLower = (id || '').toLowerCase();
  const modLower = (module || '').toLowerCase();
  for (const [key, prio] of Object.entries(PRIORITY_MAP)) {
    if (idLower.includes(key) || modLower.includes(key)) return prio;
  }
  return 'Medium';
}

// ── 4. Scan spec files ────────────────────────────────────────────────────────
const TEST_DIRS = [
  path.join(ROOT, 'tests', 'rma'),
  path.join(ROOT, 'tests', 'rma', 'functional'),
  path.join(ROOT, 'tests', 'rma', 'access'),
  path.join(ROOT, 'tests', 'rma', 'regression'),
  path.join(ROOT, 'tests', 'rma', 'security'),
];

const testCases = [];
const testPattern = /test\s*\(\s*['"`]([^'"`]+)['"`]/g;
const descPattern = /test\.describe\s*\(\s*['"`]([^'"`]+)['"`]/g;

// Preconditions mapped by module
const PRECONDITIONS = {
  'Authentication': 'Application is accessible. No active session.',
  'RBAC / Access Control': 'User accounts for all roles are configured. Application is accessible.',
  'Submit RMA': 'User is logged in. Valid serial number available: T1138004504037566.',
  'View RMA': 'User is logged in. At least one RMA exists in the system.',
  'Workflow': 'User is logged in as rmaAdmin. A Submitted RMA (S2513008343588978) is available.',
  'RMA List & Filter': 'User is logged in. RMA list has data to filter.',
  'Factory Receive': 'User is logged in as rmaAdmin. An Accepted RMA with serial number is available.',
  'Edit RMA': 'User is logged in. A Submitted RMA exists and is editable.',
  'Dashboard': 'User is logged in. Dashboard is accessible.',
  'Dashboard KPI': 'User is logged in. KPI data is available on the dashboard.',
  'View Screen Actions': 'User is logged in with appropriate role. RMAs in various statuses exist.',
  'Integration': 'Full workflow RMA cycle is possible. All roles configured.',
  'Manage Address': 'User is logged in as rmaAdmin. Address management section is accessible.',
  'RMA History': 'User is logged in. At least one closed/completed RMA exists.',
  'Return Location': 'User is logged in. Return location dropdown data is populated.',
  'Customer Reassignment': 'User is logged in as rmaAdmin. Customer data is available.',
  'Standardized Faults': 'User is logged in. Standardized faults list is populated.',
  'Print Consignment': 'User is logged in. An Accepted RMA with consignment note is available.',
  'Workflow Popup Validation': 'User is logged in. Workflow action popups are accessible.',
  'Debug / Investigation': 'Developer access. Debug mode enabled.',
};

function extractTestsFromFile(filePath) {
  const fileName = path.basename(filePath);
  const module = MODULE_MAP[fileName] || fileName.replace('.spec.js', '');
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch (_) { return; }

  let currentDescribe = module;
  const descMatches = [...content.matchAll(descPattern)];
  if (descMatches.length > 0) currentDescribe = descMatches[0][1];

  const testMatches = [...content.matchAll(testPattern)];
  for (const m of testMatches) {
    const fullTitle = m[1];
    const tcIdMatch = fullTitle.match(/^(TC[-\s][A-Z0-9-]+)\s*\|?\s*/i);
    const tcId = tcIdMatch ? tcIdMatch[1].trim() : '';
    const testName = fullTitle.replace(/^TC[-\s][A-Z0-9-]+\s*\|\s*/i, '').replace(/@\w+/g,'').trim();

    const result = resultMap[fullTitle] || resultMap[testName] || {};
    const status = result.status || 'Skip';
    const priority = getPriority(tcId, module);

    // Extract real steps from the test body
    const extractedSteps = extractTestSteps(content, fullTitle);
    const steps = extractedSteps || `1. Navigate to the ${module} section.\n2. Perform: ${testName.substring(0,80)}\n3. Verify the expected result.`;

    // Build expected result from test name
    const expectedResult = buildExpectedResult(testName, module);

    testCases.push({
      tcId: tcId || `TC-${module.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}-${String(testCases.length+1).padStart(3,'0')}`,
      module,
      describe: currentDescribe,
      testName,
      fullTitle,
      status,
      priority,
      preconditions: PRECONDITIONS[module] || 'User is logged in. Application is accessible.',
      steps,
      expectedResult,
      screenshot: result.screenshot || (status === 'Fail' ? 'See test-results/ folder' : ''),
      trace: result.trace || (status === 'Fail' ? 'See test-results/ folder' : ''),
    });
  }
}

function buildExpectedResult(testName, module) {
  const n = testName.toLowerCase();
  if (n.includes('should be visible') || n.includes('is visible')) return 'Element is visible on the page';
  if (n.includes('pass') || n.includes('success')) return 'Operation completes successfully';
  if (n.includes('error') || n.includes('invalid') || n.includes('blocked')) return 'Error/validation message is displayed. Access is denied.';
  if (n.includes('login') || n.includes('log in')) return 'User is authenticated and redirected to dashboard';
  if (n.includes('logout')) return 'Session is cleared and user is redirected to login page';
  if (n.includes('filter')) return 'RMA list is filtered and shows only matching results';
  if (n.includes('submit') || n.includes('create')) return 'RMA is created successfully and appears in the list';
  if (n.includes('status')) return 'Correct status badge/label is displayed';
  if (n.includes('count') || n.includes('total')) return 'Count matches the expected value';
  if (n.includes('redirect')) return 'User is redirected to the correct page';
  if (n.includes('navigate')) return 'Navigation succeeds and page loads correctly';
  if (n.includes('badge') || n.includes('colour') || n.includes('color')) return 'Status badge displays with correct color styling';
  if (n.includes('accept')) return 'Accept action button is visible and functional';
  if (n.includes('reject')) return 'Reject action button is visible. Rejection workflow completes.';
  if (n.includes('edit')) return 'Edit form is accessible and changes are saved';
  if (n.includes('table') || n.includes('row')) return 'Data table displays correct rows with expected content';
  return `${module} functionality operates as expected per specification`;
}

for (const dir of TEST_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.js'));
  for (const f of files) extractTestsFromFile(path.join(dir, f));
}

// ── 5. Stats ──────────────────────────────────────────────────────────────────
const totalPass = testCases.filter(t => t.status === 'Pass').length;
const totalFail = testCases.filter(t => t.status === 'Fail').length;
const totalSkip = testCases.filter(t => t.status === 'Skip').length;
const totalTests = testCases.length;

const moduleStats = {};
for (const tc of testCases) {
  if (!moduleStats[tc.module]) moduleStats[tc.module] = { pass: 0, fail: 0, skip: 0, total: 0 };
  moduleStats[tc.module].total++;
  if (tc.status === 'Pass') moduleStats[tc.module].pass++;
  else if (tc.status === 'Fail') moduleStats[tc.module].fail++;
  else moduleStats[tc.module].skip++;
}

// ── 6. Build Workbook ─────────────────────────────────────────────────────────
const wb = new ExcelJS.Workbook();
wb.creator = 'QA Engineering Team';
wb.created = new Date();
wb.modified = new Date();

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 1 — Test Case Template (with real steps)
// ═══════════════════════════════════════════════════════════════════════════════
const ws1 = wb.addWorksheet('Test Case Template', { views: [{ state: 'frozen', ySplit: 1 }] });

ws1.columns = [
  { header: 'TC ID',           key: 'tcId',          width: 22 },
  { header: 'Module',          key: 'module',         width: 26 },
  { header: 'Test Case Name',  key: 'testName',       width: 46 },
  { header: 'Description',     key: 'description',    width: 50 },
  { header: 'Pre-conditions',  key: 'preconditions',  width: 38 },
  { header: 'Test Steps',      key: 'steps',          width: 60 },
  { header: 'Expected Result', key: 'expected',       width: 40 },
  { header: 'Actual Result',   key: 'actual',         width: 40 },
  { header: 'Status',          key: 'status',         width: 12 },
  { header: 'Priority',        key: 'priority',       width: 12 },
  { header: 'Executed By',     key: 'executedBy',     width: 22 },
  { header: 'Execution Date',  key: 'execDate',       width: 18 },
  { header: 'Screenshot Path', key: 'screenshot',     width: 50 },
  { header: 'Trace Path',      key: 'trace',          width: 50 },
  { header: 'Remarks',         key: 'remarks',        width: 32 },
];

// Header styling
const headerRow = ws1.getRow(1);
headerRow.height = 24;
ws1.columns.forEach((_, idx) => {
  const cell = headerRow.getCell(idx + 1);
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = { top: { style: 'thin', color: { argb: 'FF9DC3E6' } }, bottom: { style: 'thin', color: { argb: 'FF9DC3E6' } }, left: { style: 'thin', color: { argb: 'FF9DC3E6' } }, right: { style: 'thin', color: { argb: 'FF9DC3E6' } } };
});

const today = new Date().toLocaleDateString('en-GB');

for (const tc of testCases) {
  const row = ws1.addRow({
    tcId:         tc.tcId,
    module:       tc.module,
    testName:     tc.testName || tc.fullTitle,
    description:  `Validates: ${tc.testName}`,
    preconditions: tc.preconditions,
    steps:        tc.steps,
    expected:     tc.expectedResult,
    actual:       tc.status === 'Pass' ? 'As expected — test passed'
                : tc.status === 'Fail' ? 'Assertion failed — see trace/screenshot in test-results/'
                : 'Not executed — precondition not met or data not available',
    status:       tc.status,
    priority:     tc.priority,
    executedBy:   'QA Engineering Team',
    execDate:     today,
    screenshot:   tc.screenshot,
    trace:        tc.trace,
    remarks:      tc.status === 'Skip' ? 'Skipped: required RMA status/data not available in QA env'
                : tc.status === 'Fail' ? 'Defect logged — see Defect Log sheet'
                : '',
  });

  const fillColor = tc.status === 'Pass' ? 'FFE2EFDA'
                  : tc.status === 'Fail' ? 'FFFFC7CE'
                  : 'FFFFFFEB';
  const fontColor = tc.status === 'Pass' ? 'FF375623'
                  : tc.status === 'Fail' ? 'FF9C0006'
                  : 'FF7D6608';

  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.border = { top: { style: 'hair', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } }, left: { style: 'hair', color: { argb: 'FFCCCCCC' } }, right: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
  });

  const statusCell = row.getCell(9);
  statusCell.font = { bold: true, color: { argb: fontColor }, name: 'Calibri' };

  // Auto-height based on steps length (approx 15px per step line)
  const stepLines = (tc.steps || '').split('\n').length;
  row.height = Math.max(18, Math.min(180, stepLines * 15));
}

ws1.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 15 } };

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 2 — Summary Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
const ws2 = wb.addWorksheet('Summary Dashboard');
ws2.getColumn(1).width = 38; ws2.getColumn(2).width = 22;
ws2.getColumn(3).width = 28; ws2.getColumn(4).width = 15;
ws2.getColumn(5).width = 15; ws2.getColumn(6).width = 15; ws2.getColumn(7).width = 15;

function mergedHeader(ws, row, col, text, span, bgColor = 'FF1F3864') {
  ws.mergeCells(row, col, row, col + span - 1);
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 26;
}

function dataRow(ws, row, col, label, value, bold = false, fillColor = 'FFF2F7FF') {
  const lc = ws.getCell(row, col);
  lc.value = label; lc.font = { bold: true, name: 'Calibri', size: 11 };
  lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
  lc.alignment = { horizontal: 'left', vertical: 'middle' };
  lc.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  const vc = ws.getCell(row, col + 1);
  vc.value = value; vc.font = { bold, name: 'Calibri', size: 11 };
  vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  vc.alignment = { horizontal: 'center', vertical: 'middle' };
  vc.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
}

const titleCell2 = ws2.getCell('A1');
ws2.mergeCells('A1:G1');
titleCell2.value = '📊  MyConnect RMA — Test Execution Summary Dashboard';
titleCell2.font = { bold: true, size: 15, name: 'Calibri', color: { argb: 'FF1F3864' } };
titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
ws2.getRow(1).height = 32;

mergedHeader(ws2, 3, 1, '📈  OVERALL EXECUTION STATS', 4);
dataRow(ws2, 4,  1, 'Total Test Cases',   totalTests, true);
dataRow(ws2, 5,  1, '✅  Total Pass',      totalPass, true, 'FFE2EFDA');
dataRow(ws2, 6,  1, '❌  Total Fail',      totalFail, true, 'FFFFC7CE');
dataRow(ws2, 7,  1, '⏭️  Total Skip',      totalSkip, true, 'FFFFFFEB');
dataRow(ws2, 8,  1, '📊  Pass Percentage', totalTests > 0 ? `${Math.round(totalPass / totalTests * 100)}%` : '0%', true, 'FFE2EFDA');
dataRow(ws2, 9,  1, '📅  Execution Date',  today);
dataRow(ws2, 10, 1, '🔧  Environment',     'QA (myconnect-acc.ekinops.com)');
dataRow(ws2, 11, 1, '🌐  Browser',         'Chromium (Desktop Chrome 1440x900)');
dataRow(ws2, 12, 1, '⚙️  Framework',       '@playwright/test v1.44 | Winston v3.19 | Allure v2.15');
dataRow(ws2, 13, 1, '📋  Executed By',     'QA Engineering Team');

mergedHeader(ws2, 15, 1, '📦  MODULE-WISE BREAKDOWN', 7, 'FF2E75B6');
['Module','Total','Pass','Fail','Skip','Pass %','Status'].forEach((h, i) => {
  const cell = ws2.getRow(16).getCell(i + 1);
  cell.value = h; cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
});
ws2.getRow(16).height = 22;

let mr = 17;
for (const [mod, s] of Object.entries(moduleStats)) {
  const pct = s.total > 0 ? Math.round(s.pass / s.total * 100) : 0;
  const statusTxt = s.fail > 0 ? '❌ Has Failures' : s.skip === s.total ? '⏭️ All Skipped' : '✅ All Pass';
  const rf = s.fail > 0 ? 'FFFFC7CE' : s.skip === s.total ? 'FFFFFFEB' : 'FFE2EFDA';
  [mod, s.total, s.pass, s.fail, s.skip, `${pct}%`, statusTxt].forEach((v, i) => {
    const cell = ws2.getRow(mr).getCell(i + 1);
    cell.value = v; cell.font = { name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rf } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
  });
  ws2.getRow(mr).height = 18; mr++;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 3 — Defect Log
// ═══════════════════════════════════════════════════════════════════════════════
const ws3 = wb.addWorksheet('Defect Log', { views: [{ state: 'frozen', ySplit: 1 }] });
ws3.columns = [
  { header: 'Defect ID',          key: 'defectId',  width: 16 },
  { header: 'Linked TC ID',       key: 'tcId',      width: 22 },
  { header: 'Module',             key: 'module',    width: 26 },
  { header: 'Defect Title',       key: 'title',     width: 52 },
  { header: 'Steps to Reproduce', key: 'steps',     width: 58 },
  { header: 'Expected',           key: 'expected',  width: 38 },
  { header: 'Actual',             key: 'actual',    width: 38 },
  { header: 'Severity',           key: 'severity',  width: 14 },
  { header: 'Status',             key: 'status',    width: 16 },
  { header: 'Reported Date',      key: 'date',      width: 18 },
];

ws3.getRow(1).height = 22;
ws3.columns.forEach((_, idx) => {
  const cell = ws3.getRow(1).getCell(idx + 1);
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B0000' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
});

const failedTests = testCases.filter(t => t.status === 'Fail');
if (failedTests.length === 0) {
  ws3.addRow({ defectId: '—', tcId: '—', module: '—', title: '✅ No failures detected in this run', steps: '', expected: '', actual: '', severity: '—', status: 'N/A', date: today });
} else {
  failedTests.forEach((tc, idx) => {
    const row = ws3.addRow({
      defectId: `DEF-${String(idx + 1).padStart(3, '0')}`,
      tcId:     tc.tcId,
      module:   tc.module,
      title:    `[${tc.module}] ${tc.testName} — assertion failed`,
      steps:    tc.steps,
      expected: tc.expectedResult,
      actual:   'Assertion failed — check trace/screenshot in test-results/',
      severity: tc.priority === 'High' ? 'Critical' : tc.priority === 'Medium' ? 'Major' : 'Minor',
      status:   'Open',
      date:     today,
    });
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
    });
    row.height = 20;
  });
}

ws3.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };

// ── Save ──────────────────────────────────────────────────────────────────────
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
wb.xlsx.writeFile(OUT).then(() => {
  console.log(`\n✅ Excel report generated: ${OUT}`);
  console.log(`   Total TCs : ${totalTests}`);
  console.log(`   Pass      : ${totalPass}`);
  console.log(`   Fail      : ${totalFail}`);
  console.log(`   Skip      : ${totalSkip}`);
  console.log(`\n   📋 Test Steps: Extracted from actual spec files`);
  console.log(`   📁 Output: ${OUT}`);
}).catch(err => {
  console.error('❌ Failed to generate Excel:', err);
  process.exit(1);
});
