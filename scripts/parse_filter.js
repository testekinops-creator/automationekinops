const fs = require('fs');
const html = fs.readFileSync('dom_ViewRMA.html', 'utf-8');

const regex = /<(button|a)[^>]*>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  const tag = match[0];
  if (tag.toLowerCase().includes('filter')) {
      console.log(tag);
  }
}
