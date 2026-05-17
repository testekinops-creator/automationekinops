const fs = require('fs');
const cheerio = require('cheerio');

const files = [
  'dom_LoginPage.html',
  'dom_Dashboard.html',
  'dom_SubmitRMA.html',
  'dom_ViewRMA.html',
  'dom_FactoryInsert.html',
  'dom_FactoryReceive.html'
];

let report = '# RMA Locators Reference\n\n';

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);
  
  report += `## ${file.replace('dom_', '').replace('.html', '')}\n\n`;
  report += `| Type | Label/Name | ID | CSS Selector | XPath |\n`;
  report += `|---|---|---|---|---|\n`;

  // Extract inputs, selects, textareas, and buttons
  $('input, select, textarea, button, a.btn').each((i, el) => {
    const $el = $(el);
    if ($el.attr('type') === 'hidden') return; // skip hidden fields
    
    const tag = el.tagName.toLowerCase();
    const type = $el.attr('type') ? `${tag}[type=${$el.attr('type')}]` : tag;
    const id = $el.attr('id') || '';
    const name = $el.attr('name') || '';
    let label = '';
    
    if (tag === 'button' || tag === 'a') {
      label = $el.text().trim().substring(0, 30).replace(/\n/g, ' ');
    } else {
      label = name || id;
      // try to find associated label
      if (id) {
        const $lbl = $(`label[for="${id}"]`);
        if ($lbl.length) label = $lbl.text().trim();
      }
    }
    if (!label) label = '(no label)';
    
    const css = id ? `#${id}` : (name ? `${tag}[name="${name}"]` : tag);
    const xpath = id ? `//*[@id="${id}"]` : (name ? `//${tag}[@name="${name}"]` : `//${tag}`);
    
    report += `| ${type} | ${label} | ${id} | \`${css}\` | \`${xpath}\` |\n`;
  });
  
  report += '\n';
}

fs.writeFileSync('rma_locators_reference.md', report);
console.log('Generated rma_locators_reference.md');
