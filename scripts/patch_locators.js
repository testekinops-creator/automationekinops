const fs = require('fs');
let content = fs.readFileSync('tests/rma/factory-receive-module.spec.js', 'utf8');

// Fix dynamic locators
content = content.replace(/this\.page\.locator\(`table tbody tr:nth-child\(\$\{rowIndex \+ 1\}\) input`\)\.first\(\)/g, "this.page.locator(`table tbody tr:nth-child(${rowIndex + 1}) input[name='serial_number[]']`).first()");
content = content.replace(/this\.page\.locator\(`table tbody tr:nth-child\(\$\{rowIndex \+ 1\}\) input`\)\.nth\(1\)/g, "this.page.locator(`table tbody tr:nth-child(${rowIndex + 1}) input[name='product_name[]']`).first()");
content = content.replace(/this\.page\.locator\(`table tbody tr:nth-child\(\$\{rowIndex \+ 1\}\) input`\)\.nth\(2\)/g, "this.page.locator(`table tbody tr:nth-child(${rowIndex + 1}) input[name='product_code[]']`).first()");
content = content.replace(/this\.page\.locator\(`table tbody tr:nth-child\(\$\{rowIndex \+ 1\}\) select`\)\.first\(\)/g, "this.page.locator(`table tbody tr:nth-child(${rowIndex + 1}) select[name='rma_id[]']`).first()");

// Also fix the FactoryInsert locators inside the same file (since FactoryInsertPage is also there!)
content = content.replace(/page\.locator\('select\[name\*="customer"\]'\)\.first\(\)/g, "page.locator('select[name=`customer_id`]').first()");
content = content.replace(/page\.locator\('select\[name\*="user"\], select\[name\*="username"\]'\)\.first\(\)/g, "page.locator('select[name=`user_id`]').first()");
content = content.replace(/page\.locator\('select\[name\*="return"\], select\[name\*="location"\]'\)\.first\(\)/g, "page.locator('select[name=`return_location_id`]').first()");
content = content.replace(/page\.locator\('input\[name\*="serial"\], input\[placeholder\*="serial" i\]'\)\.first\(\)/g, "page.locator('input[name=`serial_number`]').first()");
content = content.replace(/page\.locator\('select\[name\*="rma_type"\], select\[name\*="type"\]'\)\.first\(\)/g, "page.locator('select[name=`rma_type`]').first()");
content = content.replace(/page\.locator\('input\[name\*="product_code"\], input\[placeholder\*="Product Code" i\]'\)\.first\(\)/g, "page.locator('input[name=`product_code`]').first()");
content = content.replace(/page\.locator\('input\[name\*="product_name"\], input\[placeholder\*="Product Name" i\]'\)\.first\(\)/g, "page.locator('input[name=`product_name`]').first()");
content = content.replace(/page\.locator\('textarea'\)\.first\(\)/g, "page.locator('textarea[name=`comments`]').first()");
content = content.replace(/page\.locator\('input\[type="checkbox"\]'\)\.first\(\)/g, "page.locator('input[name=`send_email_to_customer`]').first()");
content = content.replace(/page\.locator\('button:has-text\("Submit"\)'\)\.first\(\)/g, "page.locator('button[name=`submitForm`]').first()");

fs.writeFileSync('tests/rma/factory-receive-module.spec.js', content);
console.log("Patched dynamic locators in factory-receive-module.spec.js");
