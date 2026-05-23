/**
 * src/helpers/rmaCleanup.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Shared RMA Cleanup Engine
 *
 * Reusable module used by:
 *   • Global Setup  (Layer 1 — crash recovery)
 *   • Per-test fixture teardown (Layer 2 — primary cleanup)
 *   • Global Teardown (Layer 3 — safety net)
 *
 * Launches a headless browser, logs in as Admin (and optionally Engineer),
 * finds active RMAs for the given serial numbers, and walks them through
 * the appropriate workflow transitions until they reach Closed status.
 *
 * Status-aware cleanup paths:
 *   Admin:    Submitted/Received → Reject → Close
 *             Repaired → Close
 *             Rejected → Close
 *   Engineer: On Hold → Repair (modal with Select2 + textareas)
 *             Accepted → Factory Receive
 *
 * Fully idempotent: safe to call even when no active RMAs exist.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const { chromium } = require('@playwright/test');
require('dotenv').config();

const baseUrl          = process.env.RMA_BASE_URL          || 'https://myconnect-acc.ekinops.com';
const adminEmail       = process.env.RMA_ADMIN_EMAIL       || 'administrator.test@rma.com';
const adminPassword    = process.env.RMA_ADMIN_PASSWORD    || '';
const engineerEmail    = process.env.RMA_ENGINEER_EMAIL    || 'rma.engineer@rma.com';
const engineerPassword = process.env.RMA_ENGINEER_PASSWORD || '';

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Set cookie consent to bypass the banner.
 */
async function setCookieConsent(context) {
  const url = new URL(baseUrl);
  await context.addCookies([{
    name: 'cookieconsent_status',
    value: 'dismiss',
    domain: url.hostname,
    path: '/',
    httpOnly: false,
    secure: url.protocol === 'https:',
    sameSite: 'Lax',
  }]);
}

/**
 * Login to the application with retry logic.
 * Clears cookies first to ensure a fresh session.
 */
async function login(page, email, password) {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Clear cookies to avoid stale session interference
      await page.context().clearCookies();
      await setCookieConsent(page.context());

      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      // Wait for the login form to be ready
      const emailInput = page.locator('#email');
      await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
      await emailInput.fill(email);
      await page.locator('#password').fill(password);
      await page.locator('button.btn-submit').click();
      await page.waitForLoadState('domcontentloaded', { timeout: 20_000 });

      // Verify we're past the login page
      if (!page.url().includes('/login')) {
        return; // Success
      }

      // Check for error messages on the page
      const errorMsg = await page.locator('.alert-danger, .error').textContent().catch(() => '');
      throw new Error(`Login page still shown after submit. Error: ${errorMsg}`);
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        throw new Error(`Login failed for ${email} after ${MAX_RETRIES} attempts: ${err.message}`);
      }
      console.log(`   ⚠️  Login attempt ${attempt} failed for ${email} — waiting 25s for lockout to clear`);
      await page.waitForTimeout(25000);
    }
  }
}

/**
 * Navigate to the RMA list, apply serial + "Not Closed" filter.
 * @returns {number} Number of matching rows
 */
async function filterBySerial(page, serial) {
  await page.goto(`${baseUrl}/rma/list`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(500);

  const filterBtn = page.locator('a:has-text("Filter Data"), button:has-text("Filter Data")').first();
  if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await filterBtn.click();
    await page.waitForTimeout(300);

    const serialInput = page.locator('textarea[name="serial_number"]').first();
    if (await serialInput.isVisible().catch(() => false)) {
      await serialInput.fill(serial);
    }

    const showOnly = page.locator('select[name="show_only"]').first();
    if (await showOnly.isVisible().catch(() => false)) {
      await showOnly.selectOption({ label: 'Not Closed' });
    }

    const applyBtn = page.locator('#filterSubmit').first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  return page.locator('table tbody tr').count();
}

/**
 * Detect the status of the first visible RMA row.
 */
async function detectStatus(page) {
  const rows = page.locator('table tbody tr');
  if (await rows.count() === 0) {return null;}

  const rowText = await rows.first().textContent().catch(() => '');
  const statuses = ['Submitted', 'Accepted', 'Received', 'On Hold', 'On-Hold', 'Repaired', 'Rejected'];
  return statuses.find(s => rowText.includes(s)) || 'Unknown';
}

/**
 * Click into the first RMA detail view from the filtered list.
 */
async function openFirstRma(page) {
  const rows = page.locator('table tbody tr');
  const actionLink = rows.first().locator('a').last();
  if (await actionLink.isVisible().catch(() => false)) {
    await actionLink.click();
    await page.waitForLoadState('networkidle');
    console.log(`      [openFirstRma] Now at: ${page.url()}`);
    return true;
  }
  return false;
}

/**
 * Click a workflow action button and fill the modal dialog fields.
 *
 * The application uses a single modal (#rmaWorkflowWindow) for all workflow
 * transitions. The modal content is loaded via AJAX and submitted via
 * the .btn-process button class. The modal fields vary by action:
 *
 *   Accept:  Repair Location (Select2), Comment (Summernote)
 *   Reject:  Repair Solution, Customer Solution, Delivery Note, Shipping Note, Comment (Summernote)
 *   Repair:  Repair Solution (textarea[name="repair_solution"]),
 *            Customer Solution (textarea[name="customer_solution"]),
 *            Delivery Note (textarea[name="delivery_note"]),
 *            Shipping Note (textarea[name="shipping_note"]),
 *            Repair Diagnostic (Select2 → select[name="repair_diagnostic_id"]),
 *            Standardized Faults (Select2 multi → select[name="standardized_fault_id"]),
 *            Comment (Summernote)
 *   On Hold: Comment (Summernote)
 *   Close:   Comment (Summernote)
 */
async function executeAction(page, actionName, commentText) {
  const btn = page.locator(
    `button.btn:has-text("${actionName}"), a.btn:has-text("${actionName}"), a[href*="closeview"]:has-text("${actionName}"), a[href*="workflow"]:has-text("${actionName}")`
  ).first();
  if (!await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`      [executeAction] "${actionName}" button not visible`);
    return false;
  }

  // Get the href from the button/link — workflow actions are <a> tags
  const href = await btn.getAttribute('href').catch(() => null);
  console.log(`      [executeAction] "${actionName}" href: ${href ? href.substring(0, 80) + '...' : 'null (button)'}`);

  if (href) {
    // Navigate directly to the workflow URL — this ensures cookies are sent properly
    await page.goto(href, { waitUntil: 'networkidle', timeout: 30_000 });
  } else {
    // It's a button (not a link) — click it directly
    await btn.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1500);
  }

  console.log(`      [executeAction] Now at: ${page.url()}`);

  // Check if we were redirected to profile (session issue)
  if (page.url().includes('/user/profile') || page.url().includes('/login')) {
    console.log(`      [executeAction] Redirected to profile/login — session issue`);
    return false;
  }

  // Check for "not in sync" error (stale status version conflict)
  const syncError = page.locator('text=/not in sync with the current status/i').first();
  if (await syncError.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`      [executeAction] "not in sync" error — status changed since page was loaded`);
    return false;
  }

  // Also check for the error page: "We've got a problem!"
  const errorPage = page.locator('text=/We\'ve got a problem/i, text=/Error Code/i').first();
  if (await errorPage.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log(`      [executeAction] Error page detected — returning false to retry`);
    return false;
  }

  // The workflow page is now a FULL PAGE form — use the page as container
  const container = page;

  // ── Wait for form fields to be ready ──────────────────────────────────────
  // First check for visible form fields (rich forms with textareas, editors, etc.)
  const formField = container.locator('textarea, .note-editor, .select2-container, input[type="text"], button[type="submit"], .btn-process').first();
  const fieldsReady = await formField.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);

  // If no visible fields found, check for a bare form (e.g., Close action)
  // which only has hidden inputs and needs direct form submission
  if (!fieldsReady) {
    const bareForm = container.locator('form#rmaWorkflow, form[action*="/rma/workflow"]').first();
    const formExists = await bareForm.waitFor({ state: 'attached', timeout: 5_000 }).then(() => true).catch(() => false);
    
    if (formExists) {
      console.log(`      [executeAction] Bare form found (hidden fields only) — submitting directly`);
      // Submit the bare form via JavaScript safely
      const submitted = await bareForm.evaluate(form => {
        try {
          HTMLFormElement.prototype.submit.call(form);
          return true;
        } catch (err) {
          console.error("Form submit error:", err);
          return false;
        }
      }).catch(err => {
        console.log(`      [executeAction] Evaluate error: ${err.message}`);
        return false;
      });
      
      if (submitted) {
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle').catch(() => {});
        const urlAfterSubmit = page.url();
        console.log(`      [executeAction] Bare form submitted, now at: ${urlAfterSubmit}`);
        return !urlAfterSubmit.includes('/rma/workflow');
      }
    }
    
    console.log(`      [executeAction] No form fields found on workflow page`);
    return false;
  }
  await page.waitForTimeout(500); // Settle time

  // ── Fill known required textareas by name ─────────────────────────────────
  const knownTextareas = [
    'repair_solution', 'customer_solution', 'delivery_note', 'shipping_note',
  ];
  let filledCount = 0;
  for (const name of knownTextareas) {
    const ta = container.locator(`textarea[name="${name}"]`).first();
    if (await ta.count() > 0) {
      await ta.fill(commentText).catch(() => {});
      filledCount++;
    }
  }
  console.log(`      [executeAction] Filled ${filledCount} named textareas`);

  // ── Fill Summernote Comment editors ────────────────────────────────────────
  const noteEditables = container.locator('.note-editable[contenteditable="true"]');
  const noteCount = await noteEditables.count();
  for (let i = 0; i < noteCount; i++) {
    const el = noteEditables.nth(i);
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      await el.evaluate((node, val) => {
        node.innerHTML = val;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        const ta = node.closest('.note-editor')?.previousElementSibling;
        if (ta) { ta.value = val; ta.dispatchEvent(new Event('change', { bubbles: true })); }
      }, commentText).catch(() => {});
    }
  }

  // ── Fill any remaining unfilled textareas ─────────────────────────────────
  const allTextareas = container.locator('textarea');
  const taCount = await allTextareas.count();
  for (let i = 0; i < taCount; i++) {
    const ta = allTextareas.nth(i);
    const isHidden = await ta.evaluate(el => {
      const next = el.nextElementSibling;
      return next && next.classList.contains('note-editor');
    }).catch(() => false);
    if (isHidden) {continue;}

    const currentVal = await ta.inputValue().catch(() => '');
    if (!currentVal || currentVal.trim() === '') {
      await ta.fill(commentText).catch(() => {});
    }
  }
  console.log(`      [executeAction] Total textareas: ${taCount}, Summernotes: ${noteCount}`);

  // ── Handle Select2 dropdowns ──────────────────────────────────────────────
  const select2s = container.locator('.select2-container');
  const select2Count = await select2s.count();
  console.log(`      [executeAction] Select2 containers: ${select2Count}`);
  for (let i = 0; i < select2Count; i++) {
    const select2 = select2s.nth(i);
    if (!await select2.isVisible().catch(() => false)) {continue;}

    const renderedText = await select2.locator('.select2-selection__rendered').textContent().catch(() => '');
    if (renderedText && renderedText.trim() !== '' && !renderedText.includes('Select') && renderedText.trim() !== '×') {
      continue;
    }

    await select2.locator('.select2-selection').click().catch(() => {});
    await page.waitForTimeout(600);

    // Try to find "Not identified" first (for Repair Diagnostics)
    let option = page.locator('.select2-results__option:not([aria-disabled="true"])').filter({ hasText: /^Not identified$/i }).first();
    
    if (!await option.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Fallback: pick the last valid option
      option = page.locator('.select2-results__option:not([aria-disabled="true"])').filter({ hasText: /[a-zA-Z0-9]/ }).last();
    }

    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      const optText = await option.textContent().catch(() => 'unknown');
      await option.click().catch(() => {});
      await page.waitForTimeout(1500); // Wait for dependent AJAX fields (like checkboxes) to load
      console.log(`      [executeAction] Select2[${i}]: selected "${optText.trim()}"`);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      console.log(`      [executeAction] Select2[${i}]: no options`);
    }
  }

  // ── Handle Checkboxes (Standardized Faults) ───────────────────────────────
  const checkboxes = container.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count();
  for (let i = 0; i < cbCount; i++) {
    const cb = checkboxes.nth(i);
    if (!await cb.isVisible().catch(() => false)) {continue;}
    
    const isChecked = await cb.isChecked().catch(() => false);
    if (!isChecked) {
      const name = await cb.getAttribute('name').catch(() => '') || '';
      // Only check Standardized Fault checkboxes (ignore "Send E-Mail")
      if (!name.toLowerCase().includes('email')) {
        await cb.check().catch(() => {});
        console.log(`      [executeAction] Checked checkbox: name="${name}"`);
        break; // We only need to check one fault to satisfy validation
      }
    }
  }

  // ── Submit the form ───────────────────────────────────────────────────────
  const submitBtn = container.locator(
    `.btn-process, button:has-text("${actionName}"), a.btn:has-text("${actionName}"), button:has-text("${actionName} RMA"), a.btn:has-text("${actionName} RMA"), button[type="submit"], input[type="submit"]`
  ).first();
  const submitVisible = await submitBtn.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`      [executeAction] Submit button visible: ${submitVisible}`);

  if (submitVisible) {
    const urlBeforeSubmit = page.url();
    await submitBtn.click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Check if submit succeeded: page should navigate away from workflow
    const urlAfterSubmit = page.url();
    const submitSucceeded = urlAfterSubmit !== urlBeforeSubmit || !urlAfterSubmit.includes('/rma/workflow');
    
    // Check for any visible error messages
    const errorMsg = await page.locator('.alert-danger, .error-message, .has-error, .help-block').first().textContent().catch(() => null);
    
    console.log(`      [executeAction] Submit result: ${submitSucceeded ? 'SUCCESS' : 'STAYED ON PAGE (validation failed?)'}`);
    console.log(`      [executeAction] Landed on URL: ${urlAfterSubmit}`);
    if (errorMsg) {console.log(`      [executeAction] Error on page: ${errorMsg.trim()}`);}
    
    return submitSucceeded;
  }

  return false;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Clean up active RMAs for the given serial numbers.
 *
 * Three-phase approach:
 *   Phase 1 — Admin: Reject Submitted/Received, Close Rejected/Repaired
 *             Defers Accepted and On Hold to Engineer phase.
 *   Phase 2 — Engineer: Repair On-Hold RMAs, Factory-Receive Accepted RMAs
 *   Phase 3 — Admin: Reject/Close anything remaining from Phase 2
 *
 * @param {string[]} serials - Serial numbers to clean up
 * @param {object} [options]
 * @param {string} [options.prefix='[Cleanup]'] - Log prefix for context
 * @param {boolean} [options.includeEngineerPhase=true] - Whether to run Phase 2
 */
async function cleanupSerials(serials, { prefix = '[Cleanup]', includeEngineerPhase = true } = {}) {
  if (!serials || serials.length === 0) {return;}

  let browser;
  try {
    console.log(`   🔄 ${prefix} Cleaning up active RMAs for: ${serials.join(', ')}`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await setCookieConsent(context);

    // ── Phase 1: Admin cleanup ──────────────────────────────────────────────
    console.log(`   ${prefix} Phase 1 — Admin login...`);
    await login(page, adminEmail, adminPassword);

    for (const serial of serials) {
      let iterations = 0;
      const MAX_ITERATIONS = 10;
      let consecutiveFailures = 0;

      while (iterations++ < MAX_ITERATIONS) {
        const rowCount = await filterBySerial(page, serial);
        if (rowCount === 0) {
          console.log(`   ✅ ${prefix} S/N ${serial}: clean (no active RMAs)`);
          break;
        }

        const status = await detectStatus(page);
        if (!status) {break;}

        console.log(`   🔧 ${prefix} S/N ${serial}: found in status "${status}"`);

        // Admin CANNOT act on Accepted or On Hold — defer to Engineer
        if (status === 'Accepted' || status.includes('Hold')) {
          console.log(`   ⏩ ${prefix} S/N ${serial}: ${status} — deferring to Engineer phase`);
          break;
        }

        if (!await openFirstRma(page)) {break;}

        if (status === 'Submitted' || status === 'Received') {
          const ok = await executeAction(page, 'Reject', `${prefix} Auto-rejected for test cleanup.`);
          if (ok) {
            console.log(`      ↳ Rejected S/N ${serial}`);
            consecutiveFailures = 0;
          } else {
            consecutiveFailures++;
            console.log(`      ↳ Reject action failed for S/N ${serial} — attempt ${consecutiveFailures}/3`);
            if (consecutiveFailures >= 3) {
              console.log(`      ↳ Giving up on S/N ${serial} after ${consecutiveFailures} consecutive failures`);
              break;
            }
            continue;
          }
        } else if (status === 'Rejected' || status === 'Repaired') {
          const ok = await executeAction(page, 'Close', `${prefix} Auto-closed for test cleanup.`);
          if (!ok) {
            const ok2 = await executeAction(page, 'Close RMA', `${prefix} Auto-closed for test cleanup.`);
            if (!ok2) {
              consecutiveFailures++;
              console.log(`      ↳ Close action failed for S/N ${serial} — attempt ${consecutiveFailures}/3`);
              if (consecutiveFailures >= 3) {
                console.log(`      ↳ Giving up on S/N ${serial} after ${consecutiveFailures} consecutive failures`);
                break;
              }
              continue;
            }
          }
          console.log(`      ↳ Closed S/N ${serial}`);
          consecutiveFailures = 0;
        } else {
          console.log(`      ↳ Unknown status "${status}" — skipping`);
          break;
        }
      }
    }

    // ── Phase 2: Engineer handles Accepted + On Hold ────────────────────────
    if (includeEngineerPhase) {
      let needsEngineer = false;

      for (const serial of serials) {
        const rowCount = await filterBySerial(page, serial);
        if (rowCount > 0) {
          const status = await detectStatus(page);
          if (status === 'Accepted' || status === 'On Hold' || status === 'On-Hold') {
            needsEngineer = true;
            break;
          }
        }
      }

      if (needsEngineer) {
        console.log(`   ${prefix} Phase 2 — Engineer login...`);
        await login(page, engineerEmail, engineerPassword);
        console.log(`      [Phase 2] Logged in as Engineer, now at: ${page.url()}`);

        for (const serial of serials) {
          let iterations = 0;
          const MAX_ITERATIONS = 50;

          while (iterations++ < MAX_ITERATIONS) {
            const rowCount = await filterBySerial(page, serial);
            console.log(`      [Phase 2] Filtered S/N ${serial}: ${rowCount} rows, iteration: ${iterations}`);
            if (rowCount === 0) {break;}

            const status = await detectStatus(page);

            if (status === 'On Hold' || status === 'On-Hold') {
              // Engineer repairs On-Hold RMAs via the Repair modal
              console.log(`   🔧 ${prefix} S/N ${serial}: Engineer Repairing (On Hold → Repaired)...`);
              if (!await openFirstRma(page)) {
                console.log(`      ↳ Could not open RMA detail for S/N ${serial}`);
                continue;
              }
              const ok = await executeAction(page, 'Repair', `${prefix} Auto-repaired for test cleanup.`);
              if (ok) {
                console.log(`      ↳ Repaired S/N ${serial} (was On Hold)`);
              } else {
                console.log(`      ↳ Repair action failed for S/N ${serial} (On Hold)`);
              }
            } else if (status === 'Accepted') {
              // Engineer uses Factory Receive for Accepted RMAs
              console.log(`   🔧 ${prefix} S/N ${serial}: Engineer Factory Receiving (Accepted → Received)...`);
              await page.goto(`${baseUrl}/rma/factory/receive/`, { waitUntil: 'networkidle', timeout: 30_000 });

              // The serial input uses array notation: serial_number[]
              const serialInput = page.locator('input[name="serial_number[]"]').first();
              await serialInput.waitFor({ state: 'visible', timeout: 10_000 });
              await serialInput.clear();
              await serialInput.fill(serial);

              // Click the "+ Add Row" button to register the serial
              const addBtn = page.locator('#factory-receive-add-row, button:has-text("Add Row"), a:has-text("Add Row")').first();
              if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await addBtn.click();
                await page.waitForTimeout(2000);
              }

              const hasError = await page.locator('.alert-danger, [class*="errorMessage"]:not(.d-none), .text-danger').first().isVisible().catch(() => false);
              if (hasError) {
                const errText = await page.locator('.alert-danger, [class*="errorMessage"]:not(.d-none), .text-danger').first().textContent().catch(() => '');
                console.log(`      ↳ Factory Receive error for S/N ${serial}: ${errText.trim()} — skipping`);
                break;
              }

              // CRITICAL: Select the RMA from the "RMA ID/Status" dropdown
              // After Add Row, each populated row has a <select> dropdown to choose the specific Accepted RMA
              const rmaDropdown = page.locator('table tbody tr select').first();
              if (await rmaDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
                const optCount = await rmaDropdown.locator('option').count();
                if (optCount > 1) {
                  await rmaDropdown.selectOption({ index: 1 });
                  await page.waitForTimeout(500);
                  console.log(`      ↳ Selected RMA from dropdown (${optCount} options)`);
                } else {
                  console.log(`      ↳ RMA dropdown has no selectable options — skipping`);
                  break;
                }
              } else {
                console.log(`      ↳ RMA dropdown not visible — skipping`);
                break;
              }

              // Submit button is button[name="submitForm"] with text "Submit"
              const submitBtn = page.locator('button[name="submitForm"], button:has-text("Submit")').first();
              if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await submitBtn.click();
                await page.waitForLoadState('networkidle').catch(() => {});
                await page.waitForTimeout(2000);
                
                // Verify we don't still have an error after submit
                const postSubmitError = await page.locator('.alert-danger').first().isVisible().catch(() => false);
                if (postSubmitError) {
                  const postErrText = await page.locator('.alert-danger').first().textContent().catch(() => '');
                  console.log(`      ↳ Factory Receive post-submit error: ${postErrText.trim()} — breaking`);
                  break;
                }
                console.log(`      ↳ Factory Received S/N ${serial}`);
              } else {
                console.log(`      ↳ Submit button not visible for Factory Receive — skipping`);
                break;
              }
            } else {
              // If status is not On Hold or Accepted, Phase 2 cannot handle it. Break to let Phase 3 handle or skip.
              break;
            }
          }
        }

        // ── Phase 3: Admin finishes cleanup ─────────────────────────────────
        console.log(`   ${prefix} Phase 3 — Admin re-login (final cleanup)...`);
        await login(page, adminEmail, adminPassword);

        for (const serial of serials) {
          let iterations = 0;
          const MAX_ITERATIONS = 5;

          while (iterations++ < MAX_ITERATIONS) {
            const rowCount = await filterBySerial(page, serial);
            if (rowCount === 0) {break;}

            const status = await detectStatus(page);
            if (!status) {break;}

            if (!await openFirstRma(page)) {break;}

            if (status === 'Received' || status === 'Submitted') {
              const ok = await executeAction(page, 'Reject', `${prefix} Auto-rejected for test cleanup.`);
              if (ok) {
                console.log(`      ↳ Rejected S/N ${serial}`);
              } else {
                console.log(`      ↳ Reject failed for S/N ${serial} — breaking`);
                break;
              }
            } else if (status === 'Rejected' || status === 'Repaired') {
              const ok = await executeAction(page, 'Close', `${prefix} Auto-closed for test cleanup.`);
              if (!ok) {
                const ok2 = await executeAction(page, 'Close RMA', `${prefix} Auto-closed for test cleanup.`);
                if (!ok2) {
                  console.log(`      ↳ Close action failed for S/N ${serial} — breaking`);
                  break;
                }
              }
              console.log(`      ↳ Closed S/N ${serial}`);
            } else {
              console.log(`      ↳ Unexpected status "${status}" in Phase 3 — breaking`);
              break;
            }
          }
        }
      }
    }

    await browser.close();
    console.log(`   ✅ ${prefix} RMA cleanup completed`);
  } catch (err) {
    // Cleanup is best-effort — log but don't fail the suite
    console.warn(`   ⚠️  ${prefix} RMA cleanup error: ${err.message.split('\n')[0]}`);
    if (browser) {await browser.close().catch(() => {});}
  }
}

module.exports = { cleanupSerials };
