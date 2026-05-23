/**
 * generate-workflow-diagram.js
 * Generates a premium SVG framework workflow diagram.
 * Run: node scripts/generate-workflow-diagram.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'reports', 'framework-workflow.svg');
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:       '#0D1117',
  panel:    '#161B22',
  border:   '#30363D',
  accent:   '#58A6FF',
  green:    '#3FB950',
  yellow:   '#F0883E',
  red:      '#FF7B72',
  purple:   '#BC8CFF',
  teal:     '#39D3F2',
  text:     '#E6EDF3',
  subtext:  '#8B949E',
  white:    '#FFFFFF',
};

// ── SVG helpers ───────────────────────────────────────────────────────────────
function rect({ x, y, w, h, rx = 8, fill = C.panel, stroke = C.border, strokeW = 1.5 }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>`;
}

function text({ x, y, txt, size = 13, weight = 'normal', fill = C.text, anchor = 'middle', dy = 0 }) {
  return `<text x="${x}" y="${y + dy}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="'Segoe UI', Consolas, sans-serif">${txt}</text>`;
}

function arrow({ x1, y1, x2, y2, color = C.subtext, dashed = false }) {
  const dash = dashed ? 'stroke-dasharray="6,4"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" marker-end="url(#arrow-${color.replace('#','')})" ${dash}/>`;
}

function arrowDef(color) {
  const id = color.replace('#','');
  return `<marker id="arrow-${id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
    <polygon points="0 0, 10 3.5, 0 7" fill="${color}"/>
  </marker>`;
}

function box({ x, y, w, h, label, sublabel = '', fill = C.panel, stroke = C.accent, icon = '', labelSize = 13, rx = 8 }) {
  const iconPart = icon ? text({ x: x + w / 2, y: y + h / 2 - (sublabel ? 14 : 8), txt: icon, size: 18, anchor: 'middle' }) : '';
  const labelY   = icon ? y + h / 2 + (sublabel ? 4 : 8) : y + h / 2 + (sublabel ? -4 : 5);
  const subY     = labelY + 18;
  return `
  ${rect({ x, y, w, h, rx, fill, stroke, strokeW: 2 })}
  ${iconPart}
  ${text({ x: x + w / 2, y: labelY, txt: label, size: labelSize, weight: 'bold', fill: stroke, anchor: 'middle' })}
  ${sublabel ? text({ x: x + w / 2, y: subY, txt: sublabel, size: 9.5, fill: C.subtext, anchor: 'middle' }) : ''}`;
}

function badge({ x, y, w, h, txt: t, fill = C.accent }) {
  return `
  ${rect({ x, y, w, h, rx: h / 2, fill, stroke: fill })}
  ${text({ x: x + w / 2, y: y + h / 2 + 4, txt: t, size: 9, weight: 'bold', fill: C.bg, anchor: 'middle' })}`;
}

// ── SVG document ──────────────────────────────────────────────────────────────
const W = 1400, H = 1050;

const arrowColors = [C.accent, C.green, C.yellow, C.red, C.purple, C.teal, C.subtext];

const svgParts = [];

// ─ Background ─────────────────────────────────────────────────────────────────
svgParts.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

// ─ Top accent bar ─────────────────────────────────────────────────────────────
svgParts.push(`<rect x="0" y="0" width="${W}" height="5" fill="${C.accent}"/>`);

// ─ Title ─────────────────────────────────────────────────────────────────────
svgParts.push(text({ x: W/2, y: 42, txt: '🎭  Playwright Automation Framework — Complete Workflow', size: 22, weight: 'bold', fill: C.accent }));
svgParts.push(text({ x: W/2, y: 68, txt: 'MyConnect RMA Module  ·  JavaScript  ·  Page Object Model  ·  CI/CD', size: 12, fill: C.subtext }));

// ─ LAYER ROW 1: Developer → Spec File → Fixtures/Config ───────────────────────
// Dev box
svgParts.push(box({ x: 30, y: 100, w: 160, h: 80, label: '👤 Developer', sublabel: 'writes / runs tests', stroke: C.teal, rx: 40 }));
// Arrow: Dev → Spec
svgParts.push(`<line x1="190" y1="140" x2="240" y2="140" stroke="${C.teal}" stroke-width="1.5" marker-end="url(#arrow-${C.teal.replace('#','')})"/>`);

// Spec File
svgParts.push(box({ x: 240, y: 100, w: 200, h: 80, label: '📄 Test Spec File', sublabel: 'tests/rma/**/*.spec.js', stroke: C.accent }));

// Arrow: Spec → Fixture
svgParts.push(`<line x1="440" y1="140" x2="490" y2="140" stroke="${C.accent}" stroke-width="1.5" marker-end="url(#arrow-${C.accent.replace('#','')})"/>`);

// Fixtures box
svgParts.push(box({ x: 490, y: 100, w: 200, h: 80, label: '🔩 Fixtures', sublabel: 'rmaFixtures.js · trackRma()', stroke: C.purple }));

// Arrow: Fixtures → Config
svgParts.push(`<line x1="690" y1="140" x2="740" y2="140" stroke="${C.purple}" stroke-width="1.5" marker-end="url(#arrow-${C.purple.replace('#','')})"/>`);

// Config/dotenv
svgParts.push(box({ x: 740, y: 100, w: 200, h: 80, label: '⚙️ Config + dotenv', sublabel: 'config.js · .env · Constants.js', stroke: C.yellow }));

// Arrow: Config → playwright.config
svgParts.push(`<line x1="940" y1="140" x2="990" y2="140" stroke="${C.yellow}" stroke-width="1.5" marker-end="url(#arrow-${C.yellow.replace('#','')})"/>`);

// playwright.config.js
svgParts.push(box({ x: 990, y: 100, w: 210, h: 80, label: '🛠 playwright.config.js', sublabel: 'projects · reporters · timeout', stroke: C.green }));

// Arrow: config → CI/CD
svgParts.push(`<line x1="1200" y1="140" x2="1250" y2="140" stroke="${C.green}" stroke-width="1.5" marker-end="url(#arrow-${C.green.replace('#','')})"/>`);

// CI/CD
svgParts.push(box({ x: 1250, y: 100, w: 130, h: 80, label: '🚀 CI/CD', sublabel: 'Jenkins · GH Actions', stroke: C.red }));

// ─ LAYER ROW 2: Global Setup → Auth Setup → Page Objects → Browser → Assertions ──
svgParts.push(text({ x: W/2, y: 230, txt: '──────────────────────  TEST EXECUTION PHASE  ──────────────────────', size: 10, fill: C.border }));

// Global Setup
svgParts.push(box({ x: 30, y: 250, w: 190, h: 90, label: '🌐 Global Setup', sublabel: 'global-setup.js\nRMA cleanup · stale data', stroke: C.teal }));

// Down arrow from playwright.config → Global Setup
svgParts.push(`<line x1="1095" y1="180" x2="1095" y2="210" stroke="${C.green}" stroke-width="1" stroke-dasharray="4,3"/>`);
svgParts.push(`<line x1="1095" y1="210" x2="125" y2="210" stroke="${C.green}" stroke-width="1" stroke-dasharray="4,3"/>`);
svgParts.push(`<line x1="125" y1="210" x2="125" y2="250" stroke="${C.green}" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow-${C.green.replace('#','')})"/>`);

// Auth Setup
svgParts.push(box({ x: 260, y: 250, w: 200, h: 90, label: '🔑 Auth Setup Project', sublabel: 'auth.setup.js\nlogin 9 roles → .auth/*.json', stroke: C.yellow }));
svgParts.push(`<line x1="220" y1="295" x2="260" y2="295" stroke="${C.yellow}" stroke-width="1.5" marker-end="url(#arrow-${C.yellow.replace('#','')})"/>`);

// Page Objects
svgParts.push(box({ x: 500, y: 250, w: 220, h: 90, label: '📄 Page Objects', sublabel: 'BasePage · ViewRMAPage\nSubmitRMAPage · LoginPage +4', stroke: C.accent }));
svgParts.push(`<line x1="460" y1="295" x2="500" y2="295" stroke="${C.accent}" stroke-width="1.5" marker-end="url(#arrow-${C.accent.replace('#','')})"/>`);

// Logger
svgParts.push(box({ x: 760, y: 250, w: 190, h: 90, label: '📝 Winston Logger', sublabel: 'Logger.js\nstep · action · verify', stroke: C.purple }));
svgParts.push(`<line x1="720" y1="295" x2="760" y2="295" stroke="${C.purple}" stroke-width="1.5" marker-end="url(#arrow-${C.purple.replace('#','')})"/>`);

// API Helper
svgParts.push(box({ x: 990, y: 250, w: 190, h: 90, label: '🔌 API Helper', sublabel: 'apiHelper.js · Axios\ncleanup · test data', stroke: C.red }));
svgParts.push(`<line x1="950" y1="295" x2="990" y2="295" stroke="${C.red}" stroke-width="1.5" marker-end="url(#arrow-${C.red.replace('#','')})"/>`);

// Browser
svgParts.push(box({ x: 1220, y: 250, w: 165, h: 90, label: '🌐 Browser', sublabel: 'Chromium · Firefox\nWebKit', stroke: C.green }));
svgParts.push(`<line x1="1180" y1="295" x2="1220" y2="295" stroke="${C.green}" stroke-width="1.5" marker-end="url(#arrow-${C.green.replace('#','')})"/>`);

// ─ LAYER ROW 3: RMA Workflow States ───────────────────────────────────────────
svgParts.push(text({ x: W/2, y: 400, txt: '──────────────────────  RMA WORKFLOW STATES TESTED  ──────────────────────', size: 10, fill: C.border }));

const statuses = [
  { label: 'Submitted',  color: C.accent,  x: 30  },
  { label: 'Accepted',   color: C.green,   x: 240 },
  { label: 'Received',   color: C.yellow,  x: 450 },
  { label: 'Diagnosing', color: C.purple,  x: 660 },
  { label: 'Repaired',   color: C.teal,    x: 870 },
  { label: 'Shipping',   color: C.yellow,  x: 1080 },
  { label: 'Closed',     color: C.subtext, x: 1290 },
];

statuses.forEach((s, i) => {
  svgParts.push(box({ x: s.x, y: 415, w: 190, h: 60, label: s.label, stroke: s.color, rx: 30, labelSize: 12 }));
  if (i < statuses.length - 1) {
    svgParts.push(`<line x1="${s.x + 190}" y1="445" x2="${s.x + 240}" y2="445" stroke="${s.color}" stroke-width="2" marker-end="url(#arrow-${s.color.replace('#','')})"/>`);
  }
});

// Rejected box (special case)
svgParts.push(box({ x: 240, y: 510, w: 190, h: 50, label: 'Rejected', stroke: C.red, rx: 25 }));
svgParts.push(`<line x1="335" y1="475" x2="335" y2="510" stroke="${C.red}" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arrow-${C.red.replace('#','')})"/>`);

// ─ LAYER ROW 4: Reporter outputs ─────────────────────────────────────────────
svgParts.push(text({ x: W/2, y: 595, txt: '──────────────────────  REPORTER OUTPUTS  ──────────────────────', size: 10, fill: C.border }));

const reporters = [
  { label: '📊 HTML Report',     sub: 'reports/html-report/', color: C.accent,  x: 30  },
  { label: '📋 JUnit XML',       sub: 'reports/junit.xml',    color: C.green,   x: 260 },
  { label: '📄 JSON Results',    sub: 'reports/results.json', color: C.yellow,  x: 490 },
  { label: '🌟 Allure Report',   sub: 'allure-report/',        color: C.purple,  x: 720 },
  { label: '🔍 Trace Viewer',    sub: 'test-results/**',       color: C.teal,    x: 950 },
  { label: '📝 Winston Logs',    sub: 'logs/test-run.log',     color: C.red,     x: 1180 },
];

reporters.forEach(r => {
  svgParts.push(box({ x: r.x, y: 610, w: 210, h: 75, label: r.label, sublabel: r.sub, stroke: r.color, labelSize: 11 }));
  svgParts.push(`<line x1="${r.x + 105}" y1="580" x2="${r.x + 105}" y2="610" stroke="${r.color}" stroke-width="1.5" marker-end="url(#arrow-${r.color.replace('#','')})"/>`);
});

// connect browser layer to reporters
svgParts.push(`<line x1="700" y1="340" x2="700" y2="580" stroke="${C.subtext}" stroke-width="1" stroke-dasharray="4,3"/>`);
svgParts.push(`<line x1="700" y1="580" x2="${30+105}" y2="580" stroke="${C.subtext}" stroke-width="1" stroke-dasharray="4,3"/>`);
svgParts.push(`<line x1="700" y1="580" x2="${1180+105}" y2="580" stroke="${C.subtext}" stroke-width="1" stroke-dasharray="4,3"/>`);

// ─ LAYER ROW 5: Framework Feature Badges ─────────────────────────────────────
svgParts.push(text({ x: W/2, y: 728, txt: '──────────────────────  FRAMEWORK FEATURES  ──────────────────────', size: 10, fill: C.border }));

const features = [
  { txt: '✅ Session Caching',         fill: C.green  },
  { txt: '🔐 RBAC — 9 Roles',          fill: C.accent },
  { txt: '🧹 Auto-Cleanup Fixtures',   fill: C.purple },
  { txt: '📸 Screenshot on Failure',   fill: C.yellow },
  { txt: '🔁 Retry: 1x in CI',         fill: C.red    },
  { txt: '⚡ Zero UI Logins',          fill: C.teal   },
  { txt: '🌐 Cross-Browser',           fill: C.green  },
  { txt: '📊 5 Report Formats',        fill: C.accent },
  { txt: '🔌 API-Level Cleanup',       fill: C.purple },
  { txt: '🏷 Tag-Based Execution',     fill: C.yellow },
  { txt: '🛡 Soft Assertions',         fill: C.teal   },
  { txt: '🗄 Global Teardown',         fill: C.subtext },
];

const fStartX = 30, fY = 740, fW = 160, fH = 36, fGap = 17;
const totalFW = features.length * (fW + fGap) - fGap;
const fOffsetX = (W - totalFW) / 2;

features.forEach((f, i) => {
  const fx = fOffsetX + i * (fW + fGap);
  svgParts.push(rect({ x: fx, y: fY, w: fW, h: fH, rx: fH/2, fill: f.fill + '22', stroke: f.fill }));
  svgParts.push(text({ x: fx + fW/2, y: fY + fH/2 + 5, txt: f.txt, size: 9, weight: 'bold', fill: f.fill, anchor: 'middle' }));
});

// ─ LAYER ROW 6: Execution Flow labels ────────────────────────────────────────
svgParts.push(text({ x: W/2, y: 820, txt: '──────────────────────  TEST EXECUTION ORDER  ──────────────────────', size: 10, fill: C.border }));

const phases = [
  { n: '1', label: 'npm test',           sub: 'trigger', color: C.teal,   x: 80  },
  { n: '2', label: 'globalSetup',        sub: 'cleanup stale data', color: C.yellow, x: 280 },
  { n: '3', label: 'auth-tests project', sub: 'run login specs', color: C.accent, x: 480 },
  { n: '4', label: 'rma-setup project',  sub: 'cache 9 sessions', color: C.purple, x: 680 },
  { n: '5', label: 'rma project',        sub: 'run 644 test cases', color: C.green,  x: 880 },
  { n: '6', label: 'globalTeardown',     sub: 'archive · cleanup', color: C.red,    x: 1080 },
  { n: '7', label: 'Reports',            sub: 'HTML · Allure · JUnit', color: C.teal,  x: 1280 },
];

phases.forEach((p, i) => {
  const cx = p.x + 90;
  // Circle
  svgParts.push(`<circle cx="${cx}" cy="860" r="22" fill="${p.color}22" stroke="${p.color}" stroke-width="2"/>`);
  svgParts.push(text({ x: cx, y: 865, txt: p.n, size: 15, weight: 'bold', fill: p.color }));
  // Labels
  svgParts.push(text({ x: cx, y: 897, txt: p.label, size: 9.5, weight: 'bold', fill: p.color }));
  svgParts.push(text({ x: cx, y: 912, txt: p.sub, size: 8, fill: C.subtext }));
  // Arrow between phases
  if (i < phases.length - 1) {
    const nx = phases[i+1].x + 90;
    svgParts.push(`<line x1="${cx+22}" y1="860" x2="${nx-22}" y2="860" stroke="${p.color}" stroke-width="1.5" marker-end="url(#arrow-${p.color.replace('#','')})"/>`);
  }
});

// ─ Bottom border ─────────────────────────────────────────────────────────────
svgParts.push(`<rect x="0" y="${H - 5}" width="${W}" height="5" fill="${C.accent}"/>`);
svgParts.push(text({ x: W/2, y: H - 15, txt: 'QA Engineering Team  ·  Ekinops — MyConnect RMA  ·  Playwright Automation Framework', size: 9, fill: C.subtext }));

// ─ Assemble SVG ──────────────────────────────────────────────────────────────
const defsColors = [...new Set([...arrowColors, C.teal, C.subtext])];
const defs = `<defs>
  ${defsColors.map(arrowDef).join('\n  ')}
  <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs}
${svgParts.join('\n')}
</svg>`;

fs.writeFileSync(OUT, svg, 'utf8');
console.log(`\n✅ SVG Workflow Diagram generated: ${OUT}`);
console.log(`   Dimensions: ${W}x${H}px`);
console.log(`   Layers: 6 (Developer flow, Execution, RMA States, Reporters, Features, Order)`);
console.log(`   📁 Output: ${OUT}`);
