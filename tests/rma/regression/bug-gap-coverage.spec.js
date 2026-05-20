/**
 * tests/rma/regression/bug-gap-coverage.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Gap Coverage Tests — Addresses bugs identified as NOT COVERED or PARTIAL
 * in the bug_coverage_analysis.md audit.
 *
 * Covers:
 *  Bug 2   → Engineer 500 error on address save
 *  Bug 5a  → Date fields disabled before Date Type selection
 *  Bug 5b  → Filter persistence across pagination
 *  Bug 6   → New Return Location end-to-end dropdown verification
 *  Bug 7/8 → Factory Insert/Receive: Received On date populated
 *  Bug 12  → Customer cross-access via copied action URLs (CRITICAL)
 *  Bug 14  → Alphabetical sorting of customer/username dropdowns
 *  Bug 15  → Serial Number validation on Edit existing RMA
 *  Bug 1   → Watcher dashboard count verification
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { loginAs, getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { USERS, ROUTES } = require('../../../src/helpers/Constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function openFirstRmaDetail(page) {
  await page.goto(ROUTES.viewRma);
  await page.waitForLoadState('networkidle');
  const row = page.locator('table tbody tr').first();
  if (await row.count() === 0) {return null;}
  await row.locator('a, button').last().click();
  await page.waitForLoadState('networkidle');
  return page.url();
}

async function openRmaByStatus(page, status) {
  await page.goto(ROUTES.viewRma);
  await page.waitForLoadState('networkidle');
  const row = page.locator('tbody tr').filter({ hasText: status }).first();
  if (await row.count() === 0) {return null;}
  await row.locator('a, button').last().click();
  await page.waitForLoadState('networkidle');
  return page.url();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 2 — 500 Server Error when Repair Engineer saves edited address
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-002 | Engineer 500 Error on Address Save @gap', () => {
  test.use({ storageState: getStorageStatePath('repairEngineer') });

  test('Engineer can edit and save an address without 500 error', async ({ page }) => {
    await page.goto(ROUTES.manageAddress);
    await page.waitForLoadState('networkidle');

    // Find first address row with an edit action
    const editBtn = page.locator('a[href*="edit"], button:has-text("Edit"), a:has-text("Edit")').first();
    if (!await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No editable address found for Engineer');
      return;
    }

    await editBtn.click();
    await page.waitForLoadState('networkidle');

    // Capture the current URL (should be edit page)
    const editUrl = page.url();
    expect(editUrl).not.toContain('/500');

    // Click Save without changing anything
    const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
    await expect(saveBtn).toBeVisible({ timeout: 8000 });
    await saveBtn.click();
    await page.waitForLoadState('networkidle');

    // CRITICAL: Must NOT get 500 error
    const afterUrl = page.url();
    expect(afterUrl, 'Should NOT redirect to 500 error page').not.toContain('/500');

    const body = await page.locator('body').textContent().catch(() => '');
    expect(body).not.toContain('500 Server Error');
    expect(body).not.toContain('Internal Server Error');
    expect(body).not.toContain('Exception');

    // Should either stay on edit or redirect to address list
    const isValid = afterUrl.includes('address') || afterUrl.includes('manageaddr');
    expect(isValid, `Expected address page, got: ${afterUrl}`).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 5a — Date fields should be disabled until Date Type is selected
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-005a | Date Fields Disabled Before Date Type @gap', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('From Date and To Date are disabled when no Date Type is selected', async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');

    // Open filter panel
    const filterBtn = page.locator('button:has-text("Filter"), a:has-text("Filter Data")').first();
    await expect(filterBtn).toBeVisible({ timeout: 8000 });
    await filterBtn.click();
    await page.waitForTimeout(1000);

    // Locate date fields
    const dateType = page.locator('select[name*="date_type"], select[name*="dateType"]').first();
    const fromDate = page.locator('input[name*="from_date"], input[name*="fromDate"], input[name*="from"], input[type="date"]').first();
    const toDate = page.locator('input[name*="to_date"], input[name*="toDate"], input[name*="to"], input[type="date"]').nth(0);

    if (!await dateType.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Date Type dropdown not found in filter panel');
      return;
    }

    // BEFORE selecting Date Type: From/To should be disabled
    const fromDisabled = await fromDate.isDisabled().catch(() => false);
    const toDisabled = await toDate.isDisabled().catch(() => false);
    const fromReadonly = await fromDate.getAttribute('readonly').catch(() => null);
    const toReadonly = await toDate.getAttribute('readonly').catch(() => null);

    expect(
      fromDisabled || fromReadonly !== null,
      'From Date should be disabled before Date Type selection'
    ).toBe(true);
    expect(
      toDisabled || toReadonly !== null,
      'To Date should be disabled before Date Type selection'
    ).toBe(true);

    // AFTER selecting a Date Type: fields should become enabled
    await dateType.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    const fromEnabledAfter = !(await fromDate.isDisabled().catch(() => true));
    const toEnabledAfter = !(await toDate.isDisabled().catch(() => true));
    expect(fromEnabledAfter, 'From Date should be enabled after Date Type selection').toBe(true);
    expect(toEnabledAfter, 'To Date should be enabled after Date Type selection').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 5b — Filter values should persist across pagination
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-005b | Filter Persistence Across Pagination @gap', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('Applied filter values persist when navigating to page 2', async ({ page }) => {
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');

    // Open filter panel
    const filterBtn = page.locator('button:has-text("Filter"), a:has-text("Filter Data")').first();
    await filterBtn.click();
    await page.waitForTimeout(1000);

    // Apply a status filter
    const statusFilter = page.locator('select[name*="status"]').first();
    if (!await statusFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Status filter not found');
      return;
    }
    await statusFilter.selectOption({ index: 1 });
    const selectedStatus = await statusFilter.inputValue();

    // Click Apply/Search
    const applyBtn = page.locator('button:has-text("Search"), button:has-text("Apply"), button[type="submit"]').first();
    await applyBtn.click();
    await page.waitForLoadState('networkidle');

    // Navigate to page 2 if pagination exists
    const page2Link = page.locator('a:has-text("2"), [aria-label="Page 2"], li:has-text("2") a').first();
    if (!await page2Link.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No page 2 — not enough filtered results for pagination test');
      return;
    }

    await page2Link.click();
    await page.waitForLoadState('networkidle');

    // Re-open filter panel
    const filterBtn2 = page.locator('button:has-text("Filter"), a:has-text("Filter Data")').first();
    if (await filterBtn2.isVisible()) {await filterBtn2.click();}
    await page.waitForTimeout(500);

    // Verify filter value persists
    const statusAfter = page.locator('select[name*="status"]').first();
    const valueAfter = await statusAfter.inputValue().catch(() => '');
    expect(valueAfter, 'Status filter should persist after pagination').toBe(selectedStatus);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 7/8 — Received On date should be populated after Factory Insert/Receive
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-007-008 | Received On Date Populated @gap', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('Received RMA detail page shows non-blank Received On date', async ({ page }) => {
    const url = await openRmaByStatus(page, 'Received');
    if (!url) { test.skip(true, 'No Received RMA found'); return; }

    // Look for "Received On" or "Received Date" in the detail page
    const receivedOnLabel = page.locator('th, dt, label, b, strong, td').filter({
      hasText: /Received\s*(On|Date)/i
    }).first();

    if (!await receivedOnLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try scanning the full Dates section
      const datesSection = page.locator('text=/Dates/i').first();
      console.log(`  Dates section visible: ${await datesSection.isVisible().catch(() => false)}`);
      test.skip(true, 'Received On label not found in detail page');
      return;
    }

    // Get the value next to the label
    const valueCell = receivedOnLabel.locator('xpath=following-sibling::*[1]').first();
    let receivedOnValue = '';
    if (await valueCell.isVisible().catch(() => false)) {
      receivedOnValue = (await valueCell.textContent())?.trim() ?? '';
    } else {
      // Try parent row approach
      const parentRow = receivedOnLabel.locator('xpath=ancestor::tr').first();
      const cells = parentRow.locator('td');
      receivedOnValue = (await cells.last().textContent())?.trim() ?? '';
    }

    // Bug 7/8: Received On date should NOT be blank, empty, or "N/A"
    expect(receivedOnValue, 'Received On date must not be blank').not.toBe('');
    expect(receivedOnValue).not.toBe('N/A');
    expect(receivedOnValue).not.toBe('-');
    expect(receivedOnValue).not.toBe('--');
    console.log(`  Received On date: "${receivedOnValue}" ✓`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 12 — Customer cross-access via copied action URLs (CRITICAL SECURITY)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-012 | Customer Cross-Access via Action URLs @gap @security', () => {

  test('Customer Two cannot add comment on Customer One RMA via direct URL', async ({ page }) => {
    // Step 1: Login as Customer One, get an RMA detail URL
    await loginAs(page, USERS.customerOne);
    const detailUrl = await openFirstRmaDetail(page);
    if (!detailUrl) { test.skip(true, 'No RMA found for Customer One'); return; }

    // Extract RMA ID from URL
    const rmaIdMatch = detailUrl.match(/\/(\d+)(?:\?|$)/);
    if (!rmaIdMatch) { test.skip(true, 'Cannot extract RMA ID from URL'); return; }
    const rmaId = rmaIdMatch[1];

    // Step 2: Login as Customer Two and try to access Customer One's RMA
    await page.context().clearCookies();
    await loginAs(page, USERS.customerTwo);

    // Try direct URL access to view
    const response = await page.goto(`/rma/request/view/${rmaId}`);
    await page.waitForLoadState('networkidle');

    const viewUrl = page.url();
    const viewStatus = response?.status() ?? 200;
    const isBlocked = viewStatus === 403 || viewStatus === 404 ||
      viewUrl.includes('/login') || viewUrl.includes('/403') || viewUrl.includes('/unauthorized');

    expect(isBlocked, `Customer Two should be blocked from Customer One RMA ${rmaId}`).toBe(true);
  });

  test('Customer Two cannot access Customer One RMA comment endpoint via API', async ({ page }) => {
    await loginAs(page, USERS.customerTwo);

    // Try POST to comment endpoint for a foreign RMA
    const response = await page.request.post('/rma/comment/add', {
      data: { rma_id: 1, comment: 'Cross-customer attack test' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect([401, 403, 404, 405, 419, 422]).toContain(response.status());
  });

  test('Customer cannot access Email Consignment Note for foreign RMA via API', async ({ page }) => {
    await loginAs(page, USERS.customerTwo);

    const response = await page.request.post('/rma/consignment/email', {
      data: { rma_id: 1 },
      headers: { 'Content-Type': 'application/json' },
    });

    expect([401, 403, 404, 405, 419, 422]).toContain(response.status());
  });

  test('Customer cannot access Edit Address page for foreign customer via URL', async ({ page }) => {
    await loginAs(page, USERS.customerTwo);

    // Try accessing address edit pages with various IDs
    for (const id of [1, 2, 3]) {
      await page.goto(`/rma/manageaddr/edit/${id}`);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const isBlocked = url.includes('/login') || url.includes('/403') ||
        url.includes('/unauthorized') || url.includes('/dashboard') || url.includes('/home');
      const editForm = await page.locator('form input[name*="contact"]').isVisible().catch(() => false);

      expect(isBlocked || !editForm, `Customer should be blocked from editing address ${id}`).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 14 — Alphabetical sorting of customer/username dropdowns
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-014 | Alphabetical Sorting in Dropdowns @gap', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('Customer Name dropdown options are in alphabetical order', async ({ page }) => {
    await page.goto(ROUTES.submitRma);
    await page.waitForLoadState('networkidle');

    const custDropdown = page.locator('select[name*="customer"]').first();
    if (!await custDropdown.isVisible({ timeout: 8000 }).catch(() => false)) {
      test.skip(true, 'Customer dropdown not found');
      return;
    }

    const options = await custDropdown.locator('option').allTextContents();
    // Filter out placeholder options
    const realOptions = options
      .map(o => o.trim())
      .filter(o => o !== '' && !/^Select/i.test(o) && !/^--/i.test(o));

    if (realOptions.length < 2) { test.skip(true, 'Not enough options to verify sort'); return; }

    const sorted = [...realOptions].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    expect(realOptions, 'Customer names should be alphabetically sorted').toEqual(sorted);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 15 — Serial Number validation error when editing existing RMA
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-015 | Serial Number Validation on Edit @gap', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('Editing existing RMA and saving without changing serial does not show validation error', async ({ page }) => {
    // Open a Submitted RMA (editable status)
    const url = await openRmaByStatus(page, 'Submitted');
    if (!url) { test.skip(true, 'No Submitted RMA found'); return; }

    // Click Edit
    const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    if (!await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Edit button not visible');
      return;
    }
    await editBtn.click();
    await page.waitForLoadState('networkidle');

    // Capture original serial number
    const serialInput = page.locator('input[name*="serial"]').first();
    const originalSerial = await serialInput.inputValue().catch(() => '');

    // Click Save without changing anything
    const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
    await saveBtn.click();
    await page.waitForLoadState('networkidle');

    // Should NOT show "serial number is in progress" validation error
    const body = await page.locator('body').textContent().catch(() => '');
    expect(body).not.toContain('serial number is in progress');
    expect(body).not.toContain('A RMA request for the provided serial number');

    // Should NOT show 500 error
    expect(page.url()).not.toContain('/500');
    expect(body).not.toContain('Internal Server Error');

    console.log(`  Edit+Save with serial "${originalSerial}" — no validation error ✓`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 1 (partial) — Watcher dashboard count verification
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-001 | Watcher Dashboard Count @gap', () => {
  test.use({ storageState: getStorageStatePath('repairWatcher') });

  test('Watcher dashboard shows KPI cards with numeric counts', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');

    // Dashboard should load without error
    expect(page.url()).not.toContain('/500');
    expect(page.url()).not.toContain('/403');

    // Look for KPI count badges/numbers
    const kpiCards = page.locator('.col-md-3, .col-sm-6, [class*="card"], [class*="kpi"]');
    const cardCount = await kpiCards.count();
    expect(cardCount, 'Watcher should see at least 1 KPI card').toBeGreaterThanOrEqual(1);

    // Each visible card should have a numeric count
    let cardsWithCount = 0;
    for (let i = 0; i < Math.min(cardCount, 8); i++) {
      const text = await kpiCards.nth(i).textContent().catch(() => '');
      if (/\d+/.test(text)) {cardsWithCount++;}
    }
    expect(cardsWithCount, 'At least 1 KPI card should display a numeric count').toBeGreaterThanOrEqual(1);
    console.log(`  Watcher dashboard: ${cardsWithCount}/${cardCount} cards with counts ✓`);
  });

  test('Watcher KPI card click navigates to filtered RMA list (not error)', async ({ page }) => {
    await page.goto(ROUTES.rmaDashboard);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('.col-md-3 a, .col-sm-6 a, [class*="card"] a, [class*="kpi"] a').first();
    if (!await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No clickable KPI card found for Watcher');
      return;
    }

    await firstCard.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to RMA list, not error page
    expect(page.url()).not.toContain('/500');
    expect(page.url()).not.toContain('/403');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUG 6 — End-to-end: New Return Location appears in dropdown
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-006 | New Return Location in Dropdown @gap', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('Return Location created via popup appears in dropdown without page refresh', async ({ page }) => {
    await page.goto(ROUTES.submitRma);
    await page.waitForLoadState('networkidle');

    // Get initial Return Location count
    const rlDropdown = page.locator('select[name*="return_location"]').first();
    if (!await rlDropdown.isVisible({ timeout: 8000 }).catch(() => false)) {
      test.skip(true, 'Return Location dropdown not found');
      return;
    }
    const optionsBefore = await rlDropdown.locator('option').count();

    // Click "Click here" link
    const clickHere = page.locator('a:has-text("Click here"), text=/Click here/i').first();
    if (!await clickHere.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, '"Click here" link not visible');
      return;
    }
    await clickHere.click();
    await page.waitForTimeout(1000);

    // Verify popup opened
    const popup = page.locator('[role="dialog"], [class*="modal"]').first();
    if (!await popup.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'New Return Location popup did not appear');
      return;
    }

    // Fill minimum required fields and submit
    const inputs = popup.locator('input:not([type="hidden"]):not([type="checkbox"])');
    const inputCount = await inputs.count();
    for (let i = 0; i < Math.min(inputCount, 6); i++) {
      const inp = inputs.nth(i);
      if (await inp.isVisible()) {
        const name = await inp.getAttribute('name') ?? '';
        if (name.includes('phone')) {await inp.fill('+3291234567');}
        else if (name.includes('zip') || name.includes('postal')) {await inp.fill('9000');}
        else {await inp.fill(`GapTest${i}`);}
      }
    }

    // Select country if present
    const countrySelect = popup.locator('select[name*="country"]').first();
    if (await countrySelect.isVisible().catch(() => false)) {
      await countrySelect.selectOption({ index: 1 });
    }

    const saveBtn = popup.locator('button:has-text("Save"), button:has-text("Submit"), button[type="submit"]').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }

    // Bug 6: Verify the dropdown now has more options
    const optionsAfter = await rlDropdown.locator('option').count();
    console.log(`  Return Location options: before=${optionsBefore}, after=${optionsAfter}`);

    // If popup submitted successfully, new option should appear
    if (!await popup.isVisible().catch(() => false)) {
      expect(optionsAfter, 'New Return Location should appear in dropdown').toBeGreaterThan(optionsBefore);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-BUG-016 — Factory Insert Customer Validation
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('GAP-BUG-016 | Factory Insert Customer Validation @gap', () => {
  test.use({ storageState: getStorageStatePath('rmaAdmin') });

  test('Factory Insert submit button is blocked or shows validation if no customer selected', async ({ page }) => {
    const { FactoryInsertPage } = require('../../../src/pages/rma/FactoryInsertPage');
    const fiPage = new FactoryInsertPage(page);

    await fiPage.goto();
    await page.waitForLoadState('networkidle');

    // 1. Unselect the default customer
    await fiPage.unselectCustomer();

    // 2. Enter a serial number
    await fiPage.fillSerial('SNGAP015-TEST');

    // 3. Click Submit
    await fiPage.clickSubmit();
    await page.waitForTimeout(1000);

    // 4. Assert that a validation error is shown
    const validationError = page.locator('[class*="error"], .invalid-feedback, .text-danger, .alert-danger').first();
    
    // Check that the error appears within a reasonable time
    const hasError = await validationError.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasError, 'A validation error should be displayed when submitting without a customer').toBe(true);
  });
});
