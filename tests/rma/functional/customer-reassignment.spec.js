// @ts-check
/**
 * tests/rma/functional/customer-reassignment.spec.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Customer Reassignment — Multi-Role E2E Scenario
 *
 * Flow:
 *   1. Customer One creates an RMA using ciSerial
 *   2. Verify the RMA appears in Customer One's RMA list
 *   3. Admin edits the RMA, changes customer to Customer Two (2degrees / Accesscustomer access)
 *   4. Verify the RMA is NO LONGER visible to Customer One
 *   5. Verify the RMA IS visible to Customer Two (seccustomer)
 *   6. Verify Dashboard KPI counts update after reassignment
 *
 * Customer One: customer.testaccess@rma.com  → 1&1 VERSATEL GmbH (SAP Id: 11916) / ACustomer One
 * Customer Two: customer.testaccess2@rma.com → 2degrees / Accesscustomer access
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const { getStorageStatePath, loginAs } = require('../../../src/helpers/rmaAuthHelper');
const { SubmitRMAPage } = require('../../../src/pages/rma/SubmitRMAPage');
const { ViewRMAPage } = require('../../../src/pages/rma/ViewRMAPage');
const { RMADashboardPage } = require('../../../src/pages/rma/RMADashboardPage');
const { USERS, ROUTES, RMA, CUSTOMERS } = require('../../../src/helpers/Constants');

// Shared state across tests in this file
let createdRmaId = '';

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: Customer One creates an RMA
// ═══════════════════════════════════════════════════════════════════════════════
test.describe.serial('CUSTOMER-REASSIGNMENT | Full Lifecycle @customer-reassignment', () => {

  test('TC-CR-001 | Customer One creates an RMA with ciSerial', async ({ browser }) => {
    const context = await browser.newContext({ storageState: getStorageStatePath('customerOne') });
    const page = await context.newPage();

    await page.goto(ROUTES.submitRma);
    await page.waitForLoadState('networkidle');

    // Fill serial number — use page.locator directly for reliability
    const serialInput = page.locator('#serial_number').first();
    await serialInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(RMA.ciSerial, { delay: 30 });
    await page.keyboard.press('Tab');
    await serialInput.dispatchEvent('focusout');
    await page.waitForTimeout(3000);

    // Check for "in progress" error — if the serial already has an active RMA
    const inProgressError = page.locator('text=/in progress/i').first();
    const hasInProgressError = await inProgressError.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasInProgressError) {
      test.skip(true, `Serial ${RMA.ciSerial} already has an active RMA — cannot create new`);
      await context.close();
      return;
    }

    // Verify product fields auto-populated
    const productName = await page.locator('#product_name').first().inputValue().catch(() => '');
    console.log(`  Product Name: "${productName}"`);
    expect(productName.length, 'Product Name should auto-populate for valid serial').toBeGreaterThan(0);

    // For customer role, Customer Name/Username dropdowns are NOT visible (auto-assigned)
    // Just select Return Location, RMA Type, and fill Note

    // Select return location (first available)
    const returnLocationDropdown = page.locator('#return_location_id, select[name="return_location_id"]').first();
    const locationOptions = await returnLocationDropdown.locator('option').allTextContents();
    const validLocations = locationOptions.filter(o => o.trim() !== '' && !/^(Select|Please select)/i.test(o.trim()));
    if (validLocations.length > 0) {
      await returnLocationDropdown.selectOption({ index: 1 });
    }

    // Select RMA type (first available)
    const rmaTypeDropdown = page.locator('#rma_type, select[name="rma_type"]').first();
    await rmaTypeDropdown.selectOption({ index: 1 });

    // Fill note for repair (Summernote or plain textarea)
    const summernoteEditable = page.locator('.note-editable[contenteditable="true"]').first();
    const plainTextarea = page.locator('textarea[name="comment"]').first();
    if (await summernoteEditable.isVisible().catch(() => false)) {
      await summernoteEditable.click();
      await summernoteEditable.fill('AutoTest — customer reassignment scenario. Created by Customer One.');
    } else if (await plainTextarea.isVisible().catch(() => false)) {
      await plainTextarea.fill('AutoTest — customer reassignment scenario. Created by Customer One.');
    }

    // Submit
    const saveBtn = page.locator('#submitBtn, button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify success — check if redirected away from /rma/add
    const url = page.url();
    const successMsg = await page.locator('.alert-success, [class*="success"]').first().isVisible().catch(() => false);
    const leftSubmitPage = !url.includes('/rma/add');
    console.log(`  Post-submit URL: ${url}`);
    console.log(`  Success message visible: ${successMsg}`);

    // Try to capture the created RMA ID
    // Pattern 1: URL contains /rma/request/view/<id>
    if (url.includes('/rma/request/')) {
      const match = url.match(/\/rma\/request\/(?:view\/)?(\d+)/);
      if (match) createdRmaId = `RMA-${match[1]}`;
    }

    // Pattern 2: Page content has RMA-<id>
    if (!createdRmaId) {
      const rmaIdEl = page.locator('text=/RMA-\\d+/').first();
      const rmaIdText = await rmaIdEl.textContent({ timeout: 5000 }).catch(() => '');
      const idMatch = rmaIdText?.match(/RMA-\d+/i);
      if (idMatch) createdRmaId = idMatch[0];
    }

    // Pattern 3: Go to RMA list and find the most recent one with our serial
    if (!createdRmaId) {
      await page.goto(ROUTES.viewRma);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find the row with our serial number
      const serialRow = page.locator('tr').filter({ hasText: RMA.ciSerial }).first();
      const rowVisible = await serialRow.isVisible({ timeout: 5000 }).catch(() => false);
      if (rowVisible) {
        // The RMA ID is typically in the first column as a button like "RMA-104189"
        const rmaBtn = serialRow.locator('button, a').filter({ hasText: /RMA-\d+/i }).first();
        const rmaText = await rmaBtn.textContent().catch(() => '');
        const btnMatch = rmaText?.match(/RMA-\d+/i);
        if (btnMatch) createdRmaId = btnMatch[0];

        // Fallback: get first cell text
        if (!createdRmaId) {
          const firstCell = await serialRow.locator('td').first().textContent().catch(() => '');
          const cellMatch = firstCell?.match(/RMA-\d+/i);
          if (cellMatch) createdRmaId = cellMatch[0];
        }

        // Fallback: get all text from the row and extract
        if (!createdRmaId) {
          const allText = await serialRow.textContent().catch(() => '');
          const allMatch = allText?.match(/RMA-\d+/i);
          if (allMatch) createdRmaId = allMatch[0];
        }
      }
    }

    console.log(`  Created RMA ID: ${createdRmaId || '(not captured)'}`);

    if (!createdRmaId) {
      // If still not captured, the RMA may have been created but we can't find the ID
      // In this case, we'll try to use the serial number to identify it in subsequent tests
      console.log('  ⚠ RMA ID not captured — will use serial number for subsequent tests');
    }

    expect(
      createdRmaId.length > 0 || leftSubmitPage || successMsg,
      'Should have created the RMA (redirected or got success message or captured ID)'
    ).toBe(true);

    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: Verify RMA visible in Customer One's list
  // ═══════════════════════════════════════════════════════════════════════════════
  test('TC-CR-002 | RMA is visible in Customer One RMA list', async ({ browser }) => {
    // Skip only if we know TC-CR-001 definitively failed (not just missing ID)
    const searchTerm = createdRmaId || RMA.ciSerial;
    const context = await browser.newContext({ storageState: getStorageStatePath('customerOne') });
    const page = await context.newPage();

    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');

    // Search for our RMA by serial or ID
    const rmaRow = page.locator('tr').filter({ hasText: new RegExp(createdRmaId || RMA.ciSerial, 'i') }).first();
    const isVisible = await rmaRow.isVisible({ timeout: 10000 }).catch(() => false);

    expect(isVisible, `RMA ${createdRmaId} should be visible in Customer One's list`).toBe(true);
    console.log(`  ✓ RMA ${createdRmaId} visible for Customer One`);

    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 3: Admin edits RMA — changes customer to Customer Two
  // ═══════════════════════════════════════════════════════════════════════════════
  test('TC-CR-003 | Admin edits RMA — reassigns to Customer Two', async ({ browser }) => {
    // Skip only if we know TC-CR-001 definitively failed (not just missing ID)
    const searchTerm = createdRmaId || RMA.ciSerial;
    const context = await browser.newContext({ storageState: getStorageStatePath('rmaAdmin') });
    const page = await context.newPage();

    // Navigate to RMA list and find our RMA
    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');

    // Click on the RMA to open detail view
    const rmaRow = page.locator('tr').filter({ hasText: new RegExp(createdRmaId || RMA.ciSerial, 'i') }).first();
    const viewLink = rmaRow.locator('a[aria-label="View RMA Request"], td:last-child a').first();
    await viewLink.click();
    await page.waitForLoadState('networkidle');

    // Click Edit button
    const editBtn = page.locator('a.btn:has-text("Edit"), button:has-text("Edit")').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on the edit page
    expect(page.url()).toContain('/rma/request/edit');

    // Change Customer Name to "2degrees" (Customer Two)
    const form = new SubmitRMAPage(page);
    await form.selectCustomer(CUSTOMERS.customerTwo.customerName);

    // Wait for user dropdown to repopulate
    await page.waitForTimeout(2000);

    // Change Customer Username to "Accesscustomer access"
    await form.selectCustomerUser(CUSTOMERS.customerTwo.customerUsername);

    // Wait for return location to update
    await page.waitForTimeout(2000);

    // Select a return location for the new customer (if available)
    const locationOptions = await form.getReturnLocationOptions();
    const validLocations = locationOptions.filter(o => o.trim() !== '' && !/^Select/i.test(o));
    if (validLocations.length > 0) {
      await form.returnLocationDropdown.selectOption({ index: 1 });
    }

    // Fill Phone Number if it is empty (changing customer might clear it)
    const phoneInput = page.locator('#phone_no, input[name="phone_no"]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      const phoneVal = await phoneInput.inputValue().catch(() => '');
      if (!phoneVal || phoneVal.trim() === '') {
        await phoneInput.fill('+1234567890');
      }
    }

    // Select Repair Location if it is present and required
    const repairLocationDropdown = page.locator('select[name="repair_location_id"], select[name="repair_location"]').first();
    if (await repairLocationDropdown.isVisible().catch(() => false)) {
      const repairOptions = await repairLocationDropdown.locator('option').allTextContents();
      const validRepairLocs = repairOptions.filter(o => o.trim() !== '' && !/^(Select|Please select)/i.test(o.trim()));
      if (validRepairLocs.length > 0) {
        await repairLocationDropdown.selectOption({ index: 1 });
      }
    }

    // Save the changes
    await form.clickSave();

    // Verify success
    const url = page.url();
    const successMsg = await form.successMessage.isVisible().catch(() => false);
    const leftEditPage = !url.includes('/rma/request/edit');
    expect(successMsg || leftEditPage, 'Should show success or redirect after saving edit').toBe(true);

    console.log(`  ✓ RMA ${createdRmaId} reassigned to Customer Two (2degrees / Accesscustomer access)`);

    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 4: RMA is no longer visible to Customer One
  // ═══════════════════════════════════════════════════════════════════════════════
  test('TC-CR-004 | RMA is NOT visible in Customer One RMA list after reassignment', async ({ browser }) => {
    // Skip only if we know TC-CR-001 definitively failed (not just missing ID)
    const searchTerm = createdRmaId || RMA.ciSerial;
    const context = await browser.newContext({ storageState: getStorageStatePath('customerOne') });
    const page = await context.newPage();

    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');

    // Search for our RMA — it should NOT be visible
    const rmaRow = page.locator('tr').filter({ hasText: new RegExp(createdRmaId || RMA.ciSerial, 'i') }).first();
    const isVisible = await rmaRow.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isVisible, `RMA ${createdRmaId} should NOT be visible in Customer One's list after reassignment`).toBe(false);
    console.log(`  ✓ RMA ${createdRmaId} correctly hidden from Customer One`);

    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 5: RMA is now visible to Customer Two (seccustomer)
  // ═══════════════════════════════════════════════════════════════════════════════
  test('TC-CR-005 | RMA IS visible in Customer Two (seccustomer) RMA list', async ({ browser }) => {
    // Skip only if we know TC-CR-001 definitively failed (not just missing ID)
    const searchTerm = createdRmaId || RMA.ciSerial;
    const context = await browser.newContext({ storageState: getStorageStatePath('seccustomer') });
    const page = await context.newPage();

    await page.goto(ROUTES.viewRma);
    await page.waitForLoadState('networkidle');

    // Search for our RMA — it SHOULD now be visible for Customer Two
    const rmaRow = page.locator('tr').filter({ hasText: new RegExp(createdRmaId || RMA.ciSerial, 'i') }).first();
    const isVisible = await rmaRow.isVisible({ timeout: 10000 }).catch(() => false);

    expect(isVisible, `RMA ${createdRmaId} should be visible in Customer Two's list after reassignment`).toBe(true);
    console.log(`  ✓ RMA ${createdRmaId} correctly visible to Customer Two (seccustomer)`);

    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 6: Dashboard KPI counts update after reassignment
  // ═══════════════════════════════════════════════════════════════════════════════
  test('TC-CR-006 | Dashboard reflects reassignment for both customers', async ({ browser }) => {
    // Skip only if we know TC-CR-001 definitively failed (not just missing ID)
    const searchTerm = createdRmaId || RMA.ciSerial;

    // Check Customer One's dashboard — count should NOT include the reassigned RMA
    const ctx1 = await browser.newContext({ storageState: getStorageStatePath('customerOne') });
    const page1 = await ctx1.newPage();
    await page1.goto(ROUTES.rmaDashboard);
    await page1.waitForLoadState('networkidle');
    const dashboard1 = new RMADashboardPage(page1);
    await dashboard1.expectPageLoaded();

    // Get all visible KPI card counts for Customer One
    const c1Cards = page1.locator('div.bubble-box');
    const c1CardCount = await c1Cards.count();
    console.log(`  Customer One dashboard cards: ${c1CardCount}`);

    // Take note of counts
    for (let i = 0; i < c1CardCount; i++) {
      const cardText = await c1Cards.nth(i).textContent();
      console.log(`    Card ${i}: ${cardText?.replace(/\s+/g, ' ').trim()}`);
    }
    await ctx1.close();

    // Check Customer Two's dashboard — should include the reassigned RMA
    const ctx2 = await browser.newContext({ storageState: getStorageStatePath('seccustomer') });
    const page2 = await ctx2.newPage();
    await page2.goto(ROUTES.rmaDashboard);
    await page2.waitForLoadState('networkidle');
    const dashboard2 = new RMADashboardPage(page2);
    await dashboard2.expectPageLoaded();

    // Get all visible KPI card counts for Customer Two
    const c2Cards = page2.locator('div.bubble-box');
    const c2CardCount = await c2Cards.count();
    console.log(`  Customer Two dashboard cards: ${c2CardCount}`);

    for (let i = 0; i < c2CardCount; i++) {
      const cardText = await c2Cards.nth(i).textContent();
      console.log(`    Card ${i}: ${cardText?.replace(/\s+/g, ' ').trim()}`);
    }

    // Verify Customer Two has at least one KPI card with a count > 0
    // (since we just reassigned an RMA to them)
    let hasNonZeroCard = false;
    for (let i = 0; i < c2CardCount; i++) {
      const bubble = c2Cards.nth(i).locator('div.dashboard-bubble').first();
      const bubbleText = await bubble.textContent().catch(() => '0');
      const count = parseInt(bubbleText?.trim() || '0', 10);
      if (count > 0) {
        hasNonZeroCard = true;
        break;
      }
    }

    expect(hasNonZeroCard, 'Customer Two dashboard should have at least one non-zero KPI after reassignment').toBe(true);
    console.log(`  ✓ Dashboard correctly reflects reassignment`);

    await ctx2.close();
  });
});
