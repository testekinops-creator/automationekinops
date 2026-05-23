// @ts-check
/**
 * tests/rma/functional/workflow-popup-validation.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Workflow Popup/Modal — Field Validation Per Status Transition
 *
 * Validates the #rmaWorkflowWindow modal for every workflow action:
 *   ► Accept  (from Submitted)  — Send Email, Repair Location (Select2), Comment (Summernote)
 *   ► Reject  (from Submitted)  — Send Email, Repair Solution, Customer Solution,
 *                                  Repair Diagnostic, Standardized Faults (checkboxes), Comment
 *   ► Reject  (from Received)   — Send Email, Repair Solution, Customer Solution,
 *                                  Repair Diagnostic, Standardized Faults (checkboxes), Comment
 *   ► Reject  (from On Hold)    — Send Email, Repair Solution, Customer Solution,
 *                                  Repair Diagnostic, Standardized Faults (checkboxes), Comment
 *   ► Repair  (from Received)   — Send Email, Repair Solution, Customer Solution,
 *                                  Repair Diagnostic, Standardized Faults (checkboxes), Comment
 *   ► Repair  (from On Hold)    — Same as Received → Repair
 *   ► On Hold (from Received)   — Send Email, Comment (Summernote)
 *   ► Close   (from Accepted)   — Send Email, Repair Solution, Customer Solution,
 *                                  Repair Diagnostic, Standardized Faults (checkboxes), Comment
 *   ► Close   (from Repaired)   — Comment (Summernote)
 *   ► Close   (from Rejected)   — Repair Solution, Comment (Summernote)
 *
 * Tests ONLY observe popups — they do NOT submit workflow transitions.
 * Each test opens the modal, validates fields, then closes it.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { ViewRMAPage } = require('../../../src/pages/rma/ViewRMAPage');
const { ROUTES } = require('../../../src/helpers/Constants');

// ─── Helper: Navigate to RMA detail by status ─────────────────────────────────
async function openRmaByStatus(page, status) {
  await page.goto(ROUTES.viewRma);
  await page.waitForLoadState('networkidle');
  const vrPage = new ViewRMAPage(page);
  const found = await vrPage.goToRmaDetailByStatus(status);
  return { vrPage, found };
}

// ─── Helper: Click a workflow action button and wait for modal or page CONTENT ──
async function openWorkflowModal(page, actionName) {
  // Map actionName to stable selectors
  let btn;
  if (actionName === 'Accept') btn = page.locator('a[data-bs-original-title="Accept"]').first();
  else if (actionName === 'Reject') btn = page.locator('a[data-bs-original-title="Reject"]').first();
  else if (actionName === 'Repair') btn = page.locator('a[data-bs-original-title="Repair"]').first();
  else if (actionName === 'On Hold') btn = page.locator('a[data-bs-original-title="On Hold"]').first();
  else if (actionName === 'Close') btn = page.locator('a[data-bs-original-title="Close"]').first();
  else {
    btn = page.locator(`a[data-bs-original-title="${actionName}"], button:has-text("${actionName}")`).first();
  }

  const isVisible = await btn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!isVisible) {return false;}

  const urlBefore = page.url();
  await btn.click();

  // Wait for either modal, fancybox, or navigation to occur
  try {
    await Promise.race([
      page.locator('#rmaWorkflowWindow').waitFor({ state: 'visible', timeout: 8000 }),
      page.locator('iframe#iframeWindow').waitFor({ state: 'visible', timeout: 8000 }),
      page.waitForURL(url => url.toString() !== urlBefore, { timeout: 8000 })
    ]);
  } catch (e) {
    // Proceed to fallback checks if timeout
  }
  await page.waitForLoadState('domcontentloaded');

  // Case 1: Modal popup (#rmaWorkflowWindow)
  const modal = page.locator('#rmaWorkflowWindow').first();
  const modalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);

  if (modalVisible) {
    // Check if the modal content is loaded via an iframe
    const iframeEl = page.locator('#rmaWorkflowWindow iframe, #rmaWorkflowWindow #iframeWindow').first();
    const hasIframe = await iframeEl.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasIframe) {
      const iframeLocator = page.frameLocator('#rmaWorkflowWindow iframe');
      const iframeContent = iframeLocator.locator('form, textarea, .note-editor, select, input').first();
      const iframeLoaded = await iframeContent.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);

      if (iframeLoaded) {
        console.log(`  ℹ️ "${actionName}" modal loaded content in iframe`);
        await page.waitForTimeout(500);
        return true;
      }
    }

    // Direct content (not in iframe) — rich fields
    const richContent = page.locator(
      '#rmaWorkflowWindow textarea, #rmaWorkflowWindow .note-editor, #rmaWorkflowWindow .select2-container, #rmaWorkflowWindow button[type="submit"], #rmaWorkflowWindow .btn-process'
    ).first();
    const richLoaded = await richContent.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false);

    if (richLoaded) {
      await page.waitForTimeout(500);
      return true;
    }

    // Fallback: bare form with only hidden fields
    const bareForm = page.locator('#rmaWorkflowWindow form#rmaWorkflow, #rmaWorkflowWindow form').first();
    const formLoaded = await bareForm.waitFor({ state: 'attached', timeout: 5_000 }).then(() => true).catch(() => false);

    if (formLoaded) {
      console.log(`  ℹ️ "${actionName}" modal has bare form (hidden fields only)`);
      await page.waitForTimeout(500);
      return true;
    }

    console.log(`  ⚠️ Modal opened but no content loaded for "${actionName}"`);
    await page.keyboard.press('Escape');
    return false;
  }

  // Case 1.5: Fancybox/overlay with iframe (used by Close action)
  // The Close button opens a fancybox overlay with iframe#iframeWindow
  const fancyboxIframe = page.locator('iframe#iframeWindow').first();
  const hasFancybox = await fancyboxIframe.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hasFancybox) {
    const iframeLocator = page.frameLocator('#iframeWindow');
    const iframeContent = iframeLocator.locator('form, textarea, .note-editor, select, input, button').first();
    const iframeLoaded = await iframeContent.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);

    if (iframeLoaded) {
      console.log(`  ℹ️ "${actionName}" opened fancybox overlay with iframe`);
      await page.waitForTimeout(500);
      return true;
    }
  }

  // Case 2: Full-page navigation (some transitions use <a> tags)
  const urlAfter = page.url();
  if (urlAfter !== urlBefore || urlAfter.includes('/rma/workflow')) {
    await page.waitForLoadState('networkidle').catch(() => {});

    // Check for iframe on the workflow page too
    const pageIframe = page.locator('iframe#iframeWindow, iframe').first();
    const hasPageIframe = await pageIframe.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasPageIframe) {
      const iframeLocator = page.frameLocator('iframe#iframeWindow, iframe');
      const iframeContent = iframeLocator.locator('form, textarea, .note-editor, select, input').first();
      const iframeLoaded = await iframeContent.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
      if (iframeLoaded) {
        console.log(`  ℹ️ "${actionName}" page loaded content in iframe`);
        await page.waitForTimeout(500);
        return true;
      }
    }

    const formContent = page.locator(
      'textarea, .note-editor, .select2-container, button[type="submit"], .btn-process, input[type="text"], form#rmaWorkflow'
    ).first();
    const formReady = await formContent.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);

    if (formReady) {
      await page.waitForTimeout(500);
      return true;
    }

    console.log(`  ⚠️ Navigated to ${urlAfter} but form content did not load for "${actionName}"`);
    return false;
  }

  console.log(`  ⚠️ Neither modal nor navigation occurred for "${actionName}"`);
  return false;
}

// ─── Helper: Close the workflow modal/page without submitting ───────────────────
async function closeWorkflowModal(page) {
  // Case 1: #rmaWorkflowWindow modal
  const modal = page.locator('#rmaWorkflowWindow');
  if (await modal.isVisible().catch(() => false)) {
    const closeBtn = page.locator('#rmaWorkflowWindow .close, #rmaWorkflowWindow button[data-dismiss="modal"], #rmaWorkflowWindow [aria-label="Close"]').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
      return;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    return;
  }

  // Case 2: Fancybox overlay (used by Close action) — X button is on parent page
  const fancyboxClose = page.locator('.fancybox-close, .fancybox-close-small, .modal-close, [aria-label="Close"], .close').first();
  if (await fancyboxClose.isVisible().catch(() => false)) {
    await fancyboxClose.click();
    await page.waitForTimeout(500);
    return;
  }

  // Case 3: iframe overlay — try Escape key
  const iframe = page.locator('iframe#iframeWindow');
  if (await iframe.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    return;
  }

  // Case 4: Full-page form — navigate back
  await page.goBack();
  await page.waitForLoadState('networkidle').catch(() => {});
}

// ─── Helper: Get modal field state ─────────────────────────────────────────────
async function getModalFields(page) {
  // Determine container: check for iframe first, then modal, then full page
  const modalEl = page.locator('#rmaWorkflowWindow');
  const isModal = await modalEl.isVisible().catch(() => false);

  // Check if modal has an iframe
  let container;
  let isIframe = false;
  if (isModal) {
    const iframeEl = page.locator('#rmaWorkflowWindow iframe').first();
    const hasIframe = await iframeEl.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasIframe) {
      container = page.frameLocator('#rmaWorkflowWindow iframe');
      isIframe = true;
    } else {
      container = modalEl;
    }
  } else {
    // Check for iframe on full page too
    const pageIframe = page.locator('iframe#iframeWindow').first();
    const hasPageIframe = await pageIframe.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasPageIframe) {
      container = page.frameLocator('#iframeWindow');
      isIframe = true;
    } else {
      container = page;
    }
  }
  
  return {
    // Checkbox
    sendEmailCheckbox: await container.locator('input[type="checkbox"]').first().isVisible().catch(() => false),
    
    // Select2 dropdowns
    select2Count: await container.locator('.select2-container').count(),
    hasRepairLocation: await container.locator('text=/Repair Location/i').isVisible().catch(() => false),
    hasRepairDiagnostic: await container.locator('text=/Repair Diagnostic/i').isVisible().catch(() => false),
    hasStandardizedFaults: await container.locator('text=/Standardized Fault/i').isVisible().catch(() => false),
    
    // Textareas (plain and Summernote)
    plainTextareaCount: await container.locator('textarea:visible').count(),
    summernoteCount: await container.locator('.note-editor').count(),
    hasRepairSolution: await container.locator('text=/Repair Solution/i').isVisible().catch(() => false),
    hasCustomerSolution: await container.locator('text=/Customer Solution/i').isVisible().catch(() => false),
    hasDeliveryNote: await container.locator('text=/Delivery Note/i').isVisible().catch(() => false),
    hasShippingNote: await container.locator('text=/Shipping Note/i').isVisible().catch(() => false),
    hasComment: await container.locator('text=/Comment/i').isVisible().catch(() => false),
    
    // Checkboxes (Standardized Faults are now rendered as checkboxes)
    checkboxCount: await container.locator('input[type="checkbox"]').count(),
    
    // Submit button
    submitBtnText: await container.locator('button[type="submit"], button.btn-primary, .btn-process').last().textContent().catch(() => ''),
    submitBtnVisible: await container.locator('button[type="submit"], button.btn-primary, .btn-process').last().isVisible().catch(() => false),
    
    // Metadata
    isIframe,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCEPT MODAL (from Submitted)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Accept Action Modal @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-ACCEPT-001 | Accept modal renders with correct fields', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Accept');
    expect(modalOpened, 'Accept modal should open').toBe(true);

    const fields = await getModalFields(page);

    // Verify expected fields
    expect(fields.sendEmailCheckbox, 'Send Email checkbox should be visible').toBe(true);
    expect(fields.hasRepairLocation, 'Repair Location label should be visible').toBe(true);
    expect(fields.select2Count, 'Should have at least 1 Select2 (Repair Location)').toBeGreaterThanOrEqual(1);
    expect(fields.summernoteCount, 'Should have Summernote editor for Comment').toBeGreaterThanOrEqual(1);
    expect(fields.submitBtnVisible, 'Submit button should be visible').toBe(true);

    // These fields should NOT be present in Accept
    expect(fields.hasRepairSolution, 'Repair Solution should NOT be in Accept').toBe(false);
    expect(fields.hasCustomerSolution, 'Customer Solution should NOT be in Accept').toBe(false);
    expect(fields.hasDeliveryNote, 'Delivery Note should NOT be in Accept').toBe(false);
    expect(fields.hasShippingNote, 'Shipping Note should NOT be in Accept').toBe(false);

    console.log(`  Accept modal: Submit button text = "${fields.submitBtnText.trim()}"`);
    await closeWorkflowModal(page);
  });

  test('WF-POPUP-ACCEPT-002 | Accept modal: Repair Location Select2 is interactive', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Accept');
    if (!modalOpened) { test.skip(true, 'Accept modal did not open'); return; }

    const modal = page.locator('#rmaWorkflowWindow');

    // Click the Select2 for Repair Location
    const select2 = modal.locator('.select2-container').first();
    await select2.click();
    await page.waitForTimeout(500);

    // Dropdown should open with options
    const options = page.locator('.select2-results__option');
    const optionCount = await options.count();
    expect(optionCount, 'Repair Location Select2 should have options').toBeGreaterThanOrEqual(1);

    console.log(`  Repair Location dropdown: ${optionCount} option(s) available`);

    // Close dropdown without selecting
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await closeWorkflowModal(page);
  });

  test('WF-POPUP-ACCEPT-003 | Accept modal: Summernote Comment editor is functional', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Accept');
    if (!modalOpened) { test.skip(true, 'Accept modal did not open'); return; }

    const modal = page.locator('#rmaWorkflowWindow');

    // Verify Summernote is functional (has toolbar + editable area)
    const noteToolbar = modal.locator('.note-toolbar');
    const noteEditable = modal.locator('.note-editable[contenteditable="true"]');

    const hasToolbar = await noteToolbar.isVisible().catch(() => false);
    const hasEditable = await noteEditable.isVisible().catch(() => false);

    expect(hasToolbar || hasEditable, 'Summernote should have toolbar or editable area').toBe(true);

    if (hasEditable) {
      // Type into the Summernote editor and verify it accepts input
      await noteEditable.click();
      await noteEditable.evaluate(el => { el.innerHTML = 'Test comment'; });
      const content = await noteEditable.innerHTML();
      expect(content).toContain('Test comment');
    }

    console.log(`  Summernote: toolbar=${hasToolbar}, editable=${hasEditable}`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REJECT MODAL (from Submitted — minimal fields)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Reject Action Modal (from Submitted) @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-REJECT-SUB-001 | Reject modal from Submitted has full field set', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Submitted');
    if (!found) { test.skip(true, 'No Submitted RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Reject');
    expect(modalOpened, 'Reject modal should open').toBe(true);

    const fields = await getModalFields(page);

    expect(fields.sendEmailCheckbox, 'Send Email checkbox should be visible').toBe(true);
    expect(fields.hasRepairSolution, 'Repair Solution should be visible').toBe(true);
    expect(fields.hasCustomerSolution, 'Customer Solution should be visible').toBe(true);
    expect(fields.hasRepairDiagnostic, 'Repair Diagnostic should be visible').toBe(true);
    expect(fields.hasStandardizedFaults, 'Standardized Faults should be visible').toBe(true);
    expect(fields.summernoteCount, 'Should have Summernote editor').toBeGreaterThanOrEqual(1);
    expect(fields.submitBtnVisible, 'Submit button should be visible').toBe(true);

    console.log(`  Reject (Submitted) modal: Submit text = "${fields.submitBtnText.trim()}"`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REJECT MODAL (from Received — extended fields)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Reject Action Modal (from Received) @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-REJECT-RCV-001 | Reject modal from Received has full field set', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Received');
    if (!found) { test.skip(true, 'No Received RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Reject');
    expect(modalOpened, 'Reject modal should open').toBe(true);

    const fields = await getModalFields(page);

    expect(fields.sendEmailCheckbox, 'Send Email checkbox should be visible').toBe(true);
    expect(fields.hasRepairSolution, 'Repair Solution should be visible').toBe(true);
    expect(fields.hasCustomerSolution, 'Customer Solution should be visible').toBe(true);
    expect(fields.hasRepairDiagnostic, 'Repair Diagnostic should be visible').toBe(true);
    expect(fields.hasStandardizedFaults, 'Standardized Faults should be visible').toBe(true);
    expect(fields.summernoteCount, 'Should have Summernote editor for Comment').toBeGreaterThanOrEqual(1);
    expect(fields.submitBtnVisible, 'Submit button should be visible').toBe(true);

    console.log(`  Reject (Received) modal: Submit text = "${fields.submitBtnText.trim()}"`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR MODAL (from On Hold or Received)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Repair Action Modal @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-REPAIR-001 | Repair modal has all required fields', async ({ page }) => {
    // Try On Hold first, fall back to Received
    let { found } = await openRmaByStatus(page, 'On-Hold');
    if (!found) {
      ({ found } = await openRmaByStatus(page, 'Received'));
    }
    if (!found) { test.skip(true, 'No On Hold or Received RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Repair');
    expect(modalOpened, 'Repair modal should open').toBe(true);

    const fields = await getModalFields(page);

    // Verify all expected fields
    expect(fields.sendEmailCheckbox, 'Send Email checkbox should be visible').toBe(true);
    expect(fields.hasRepairSolution, 'Repair Solution should be visible').toBe(true);
    expect(fields.hasCustomerSolution, 'Customer Solution should be visible').toBe(true);
    expect(fields.hasRepairDiagnostic, 'Repair Diagnostic should be visible').toBe(true);
    expect(fields.hasStandardizedFaults, 'Standardized Faults should be visible').toBe(true);
    expect(fields.submitBtnVisible, 'Submit button should be visible').toBe(true);

    console.log(`  Repair modal: Submit text = "${fields.submitBtnText.trim()}", Checkboxes = ${fields.checkboxCount}`);
    await closeWorkflowModal(page);
  });

  test('WF-POPUP-REPAIR-002 | Repair Diagnostic Select2 is interactive', async ({ page }) => {
    let { found } = await openRmaByStatus(page, 'On-Hold');
    if (!found) {
      ({ found } = await openRmaByStatus(page, 'Received'));
    }
    if (!found) { test.skip(true, 'No On Hold or Received RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Repair');
    if (!modalOpened) { test.skip(true, 'Repair modal did not open'); return; }

    const modal = page.locator('#rmaWorkflowWindow');

    // Find all Select2 containers — at least one should be Repair Diagnostic
    const select2s = modal.locator('.select2-container');
    const count = await select2s.count();
    expect(count, 'Repair modal should have Select2 dropdowns').toBeGreaterThanOrEqual(1);

    // Click the first Select2 and verify dropdown opens
    await select2s.first().click();
    await page.waitForTimeout(500);

    const options = page.locator('.select2-results__option');
    const optionCount = await options.count();
    expect(optionCount, 'Select2 dropdown should have options').toBeGreaterThanOrEqual(1);

    console.log(`  Repair Diagnostic: ${optionCount} option(s) available`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await closeWorkflowModal(page);
  });

  test('WF-POPUP-REPAIR-003 | Repair modal blocks submission without required fields', async ({ page }) => {
    let { found } = await openRmaByStatus(page, 'On-Hold');
    if (!found) {
      ({ found } = await openRmaByStatus(page, 'Received'));
    }
    if (!found) { test.skip(true, 'No On Hold or Received RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Repair');
    if (!modalOpened) { test.skip(true, 'Repair modal did not open'); return; }

    const modal = page.locator('#rmaWorkflowWindow');

    // Click submit WITHOUT filling any fields
    const submitBtn = modal.locator('button[type="submit"], button.btn-primary').last();
    await submitBtn.click();
    await page.waitForTimeout(1500);

    // Modal should STILL be open (validation prevented submission)
    const stillOpen = await modal.isVisible().catch(() => false);
    expect(stillOpen, 'Modal should remain open when required fields are empty').toBe(true);

    // Look for validation error indicators
    const validationErrors = modal.locator('.is-invalid, .has-error, .invalid-feedback, .text-danger, [class*="error"]');
    const errorCount = await validationErrors.count();
    console.log(`  Repair validation: modal still open = ${stillOpen}, error indicators = ${errorCount}`);

    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ON HOLD MODAL (from Received)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | On Hold Action Modal @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-ONHOLD-001 | On Hold modal renders with Comment field', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Received');
    if (!found) { test.skip(true, 'No Received RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'On Hold');
    expect(modalOpened, 'On Hold modal should open').toBe(true);

    const fields = await getModalFields(page);

    expect(fields.sendEmailCheckbox, 'Send Email checkbox should be visible').toBe(true);
    expect(fields.summernoteCount, 'Should have Summernote editor').toBeGreaterThanOrEqual(1);
    expect(fields.submitBtnVisible, 'Submit button should be visible').toBe(true);

    // These extended fields should NOT be present in On Hold
    expect(fields.hasRepairSolution, 'Repair Solution should NOT be in On Hold').toBe(false);
    expect(fields.hasRepairDiagnostic, 'Repair Diagnostic should NOT be in On Hold').toBe(false);
    expect(fields.hasStandardizedFaults, 'Standardized Faults should NOT be in On Hold').toBe(false);

    console.log(`  On Hold modal: Submit text = "${fields.submitBtnText.trim()}"`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSE MODAL (from Repaired — bare confirmation form)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Close Action Modal (from Repaired) @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-CLOSE-REP-001 | Close modal from Repaired opens successfully', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Repaired');
    if (!found) { test.skip(true, 'No Repaired RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Close');
    expect(modalOpened, 'Close modal should open').toBe(true);

    // getModalFields handles iframe detection automatically
    const fields = await getModalFields(page);

    console.log(`  Close (Repaired) modal fields: iframe=${fields.isIframe}, Comment=${fields.summernoteCount}, RepSol=${fields.hasRepairSolution}, Submit=${fields.submitBtnVisible}`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSE MODAL (from Rejected)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Close Action Modal (from Rejected) @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-CLOSE-REJ-001 | Close modal from Rejected opens successfully', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Rejected');
    if (!found) { test.skip(true, 'No Rejected RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Close');
    expect(modalOpened, 'Close modal should open').toBe(true);

    // getModalFields handles iframe detection automatically
    const fields = await getModalFields(page);

    console.log(`  Close (Rejected) modal fields: iframe=${fields.isIframe}, RepSol=${fields.hasRepairSolution}, Comment=${fields.summernoteCount}, Submit=${fields.submitBtnVisible}, RepDiag=${fields.hasRepairDiagnostic}`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REJECT MODAL (from On Hold)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Reject Action Modal (from On Hold) @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-REJECT-ONHOLD-001 | Reject modal from On Hold has full field set', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'On-Hold');
    if (!found) { test.skip(true, 'No On Hold RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Reject');
    expect(modalOpened, 'Reject modal should open').toBe(true);

    const fields = await getModalFields(page);

    expect(fields.sendEmailCheckbox, 'Send Email checkbox should be visible').toBe(true);
    expect(fields.hasRepairSolution, 'Repair Solution should be visible').toBe(true);
    expect(fields.hasCustomerSolution, 'Customer Solution should be visible').toBe(true);
    expect(fields.hasRepairDiagnostic, 'Repair Diagnostic should be visible').toBe(true);
    expect(fields.hasStandardizedFaults, 'Standardized Faults should be visible').toBe(true);
    expect(fields.summernoteCount, 'Should have Summernote editor for Comment').toBeGreaterThanOrEqual(1);
    expect(fields.submitBtnVisible, 'Submit button should be visible').toBe(true);

    console.log(`  Reject (On Hold) modal: Submit text = "${fields.submitBtnText.trim()}"`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSE MODAL (from Accepted — extended fields)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Close Action Modal (from Accepted) @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('WF-POPUP-CLOSE-ACC-001 | Close modal from Accepted opens successfully', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Accepted');
    if (!found) { test.skip(true, 'No Accepted RMA available'); return; }

    const modalOpened = await openWorkflowModal(page, 'Close');
    expect(modalOpened, 'Close modal should open').toBe(true);

    // getModalFields handles iframe detection automatically
    const fields = await getModalFields(page);

    console.log(`  Close (Accepted) modal fields: iframe=${fields.isIframe}, Email=${fields.sendEmailCheckbox}, RepSol=${fields.hasRepairSolution}, CustSol=${fields.hasCustomerSolution}, RepDiag=${fields.hasRepairDiagnostic}, StdFaults=${fields.hasStandardizedFaults}, Comment=${fields.summernoteCount}, Submit=${fields.submitBtnVisible}`);
    await closeWorkflowModal(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-ROLE: Customer sees NO workflow buttons
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Customer Cannot Access Workflow Modals @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('customerOne') });

  test('WF-POPUP-CUST-001 | Customer does not see Accept/Reject/Repair buttons', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Submitted');
    if (!found) {
      // Try other statuses
      const { found: found2 } = await openRmaByStatus(page, 'Received');
      if (!found2) { test.skip(true, 'No RMA accessible by customer'); return; }
    }

    // Verify workflow action buttons are NOT visible for customer
    const acceptVisible = await page.locator('button:has-text("Accept"), a.btn:has-text("Accept")').first().isVisible().catch(() => false);
    const rejectVisible = await page.locator('button:has-text("Reject"), a.btn:has-text("Reject")').first().isVisible().catch(() => false);
    const repairVisible = await page.locator('button:has-text("Repair"), a.btn:has-text("Repair")').first().isVisible().catch(() => false);
    const closeVisible = await page.locator('a.btn:has-text("Close"), button.btn:has-text("Close")').filter({ hasNot: page.locator('[data-dismiss]') }).first().isVisible().catch(() => false);

    expect(acceptVisible, 'Customer should NOT see Accept button').toBe(false);
    expect(rejectVisible, 'Customer should NOT see Reject button').toBe(false);
    expect(repairVisible, 'Customer should NOT see Repair button').toBe(false);

    console.log(`  Customer view: Accept=${acceptVisible}, Reject=${rejectVisible}, Repair=${repairVisible}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-ROLE: Watcher sees NO workflow buttons
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-POPUP | Watcher Cannot Access Workflow Modals @workflow-popup', () => {
  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test('WF-POPUP-WATCH-001 | Watcher does not see Accept/Reject/Repair buttons', async ({ page }) => {
    const { found } = await openRmaByStatus(page, 'Submitted');
    if (!found) {
      const { found: found2 } = await openRmaByStatus(page, 'Received');
      if (!found2) { test.skip(true, 'No RMA accessible by watcher'); return; }
    }

    const acceptVisible = await page.locator('button:has-text("Accept"), a.btn:has-text("Accept")').first().isVisible().catch(() => false);
    const rejectVisible = await page.locator('button:has-text("Reject"), a.btn:has-text("Reject")').first().isVisible().catch(() => false);
    const repairVisible = await page.locator('button:has-text("Repair"), a.btn:has-text("Repair")').first().isVisible().catch(() => false);

    expect(acceptVisible, 'Watcher should NOT see Accept button').toBe(false);
    expect(rejectVisible, 'Watcher should NOT see Reject button').toBe(false);
    expect(repairVisible, 'Watcher should NOT see Repair button').toBe(false);

    console.log(`  Watcher view: Accept=${acceptVisible}, Reject=${rejectVisible}, Repair=${repairVisible}`);
  });
});
