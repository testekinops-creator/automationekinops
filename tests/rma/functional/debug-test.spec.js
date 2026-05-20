/**
 * Debug test — investigate the Repair modal DOM to fix rmaCleanup
 */
const { test } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ROUTES } = require('../../../src/helpers/Constants');

test.describe('Debug: Repair Modal Investigation', () => {
  // Use Engineer storage state — same role used by cleanup
  test.use({ storageState: getStorageStatePath('repairEngineer') });

  test('Inspect Repair modal DOM fields', async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');

    // Find an On-Hold RMA
    const onHoldRow = page.locator('tr').filter({ hasText: /On.?Hold/i }).first();
    const hasOnHold = await onHoldRow.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`On Hold RMA found: ${hasOnHold}`);

    if (!hasOnHold) {
      test.skip(true, 'No On Hold RMA available');
      return;
    }

    // Click into detail
    const viewLink = onHoldRow.locator('td:last-child a').first();
    await viewLink.click();
    await page.waitForLoadState('networkidle');
    console.log(`Detail page URL: ${page.url()}`);

    // Log all visible buttons
    const allBtns = page.locator('a.btn, button.btn');
    const btnCount = await allBtns.count();
    console.log(`Total buttons on detail page: ${btnCount}`);
    for (let i = 0; i < btnCount; i++) {
      const text = await allBtns.nth(i).textContent().catch(() => '');
      const tag = await allBtns.nth(i).evaluate(el => el.tagName).catch(() => '');
      const href = await allBtns.nth(i).getAttribute('href').catch(() => null);
      console.log(`  Button ${i}: [${tag}] "${text.trim()}" href=${href}`);
    }

    // Click the Repair button
    const repairBtn = page.locator('a.btn:has-text("Repair"), button.btn:has-text("Repair")').first();
    const repairVisible = await repairBtn.isVisible().catch(() => false);
    console.log(`\nRepair button visible: ${repairVisible}`);

    if (!repairVisible) {
      console.log('ERROR: Repair button not found on detail page');
      return;
    }

    const repairHref = await repairBtn.getAttribute('href').catch(() => null);
    console.log(`Repair button href: ${repairHref}`);

    await repairBtn.click();
    await page.waitForTimeout(2000);

    // Check if we navigated to a new page or a modal opened
    console.log(`\nAfter clicking Repair:`);
    console.log(`  Current URL: ${page.url()}`);

    // Check for modal
    const modal = page.locator('#rmaWorkflowWindow');
    const modalVisible = await modal.isVisible().catch(() => false);
    console.log(`  #rmaWorkflowWindow visible: ${modalVisible}`);

    const anyModal = page.locator('.modal.show, .modal:visible, [role="dialog"]:visible').first();
    const anyModalVisible = await anyModal.isVisible().catch(() => false);
    console.log(`  Any modal visible: ${anyModalVisible}`);

    if (!modalVisible && !anyModalVisible) {
      // Maybe it navigated to a new page
      console.log('  No modal — checking if this is a full-page workflow form');

      // Check page for form elements
      const forms = await page.locator('form').count();
      console.log(`  Forms on page: ${forms}`);

      const textareas = await page.locator('textarea').count();
      console.log(`  Textareas on page: ${textareas}`);

      // Log all textarea names
      const allTas = page.locator('textarea');
      for (let i = 0; i < textareas; i++) {
        const name = await allTas.nth(i).getAttribute('name').catch(() => 'N/A');
        const id = await allTas.nth(i).getAttribute('id').catch(() => 'N/A');
        const vis = await allTas.nth(i).isVisible().catch(() => false);
        console.log(`    textarea[${i}]: name="${name}" id="${id}" visible=${vis}`);
      }

      const select2s = await page.locator('.select2-container').count();
      console.log(`  Select2 containers: ${select2s}`);

      const summernotes = await page.locator('.note-editor').count();
      console.log(`  Summernote editors: ${summernotes}`);
      return;
    }

    // Modal found — inspect its DOM
    const ctx = modalVisible ? modal : anyModal;
    console.log('\n=== MODAL DOM INSPECTION ===');

    // Dump all textareas in modal
    const modalTas = ctx.locator('textarea');
    const taCount = await modalTas.count();
    console.log(`\nTextareas in modal: ${taCount}`);
    for (let i = 0; i < taCount; i++) {
      const name = await modalTas.nth(i).getAttribute('name').catch(() => 'N/A');
      const id = await modalTas.nth(i).getAttribute('id').catch(() => 'N/A');
      const vis = await modalTas.nth(i).isVisible().catch(() => false);
      const nextIsSummernote = await modalTas.nth(i).evaluate(el => {
        const next = el.nextElementSibling;
        return next && next.classList.contains('note-editor');
      }).catch(() => false);
      console.log(`  textarea[${i}]: name="${name}" id="${id}" visible=${vis} summernote=${nextIsSummernote}`);
    }

    // Dump all select elements
    const modalSelects = ctx.locator('select');
    const selCount = await modalSelects.count();
    console.log(`\nSelects in modal: ${selCount}`);
    for (let i = 0; i < selCount; i++) {
      const name = await modalSelects.nth(i).getAttribute('name').catch(() => 'N/A');
      const id = await modalSelects.nth(i).getAttribute('id').catch(() => 'N/A');
      const multi = await modalSelects.nth(i).getAttribute('multiple').catch(() => null);
      const optCount = await modalSelects.nth(i).locator('option').count();
      console.log(`  select[${i}]: name="${name}" id="${id}" multiple=${multi !== null} options=${optCount}`);
    }

    // Dump Select2 containers
    const s2s = ctx.locator('.select2-container');
    const s2Count = await s2s.count();
    console.log(`\nSelect2 containers in modal: ${s2Count}`);

    // Dump checkboxes
    const checkboxes = ctx.locator('input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    console.log(`\nCheckboxes in modal: ${cbCount}`);
    for (let i = 0; i < cbCount; i++) {
      const name = await checkboxes.nth(i).getAttribute('name').catch(() => 'N/A');
      const checked = await checkboxes.nth(i).isChecked().catch(() => false);
      console.log(`  checkbox[${i}]: name="${name}" checked=${checked}`);
    }

    // Find the submit button
    const submitBtns = ctx.locator('button');
    const sbCount = await submitBtns.count();
    console.log(`\nButtons in modal: ${sbCount}`);
    for (let i = 0; i < sbCount; i++) {
      const text = await submitBtns.nth(i).textContent().catch(() => '');
      const type = await submitBtns.nth(i).getAttribute('type').catch(() => 'N/A');
      const cls = await submitBtns.nth(i).getAttribute('class').catch(() => 'N/A');
      console.log(`  button[${i}]: text="${text.trim()}" type="${type}" class="${cls}"`);
    }

    // Check the form action
    const form = ctx.locator('form').first();
    const formAction = await form.getAttribute('action').catch(() => 'N/A');
    const formMethod = await form.getAttribute('method').catch(() => 'N/A');
    console.log(`\nForm: action="${formAction}" method="${formMethod}"`);

    // Close modal
    await page.keyboard.press('Escape');
  });
});
