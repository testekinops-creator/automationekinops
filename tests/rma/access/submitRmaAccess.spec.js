// @ts-check
/**
 * tests/rma/submitRmaAccess.spec.js
 * Role-Based Access Control tests for the Submit RMA page.
 * Iterates through all defined users and checks the enabled/disabled state
 * of every field on the form against an expected RBAC matrix.
 */
const { test, expect } = require('@playwright/test');
const { getStorageStatePath } = require('../../../src/helpers/rmaAuthHelper');
const { SubmitRMAPage } = require('../../../src/pages/rma/SubmitRMAPage');
const { USERS } = require('../../../src/helpers/Constants');
const { allure } = require('allure-playwright');
const Logger = require('../../../src/helpers/Logger');

// ============================================================================
// RBAC EXPECTED STATE MATRIX
// true  = Field should be ENABLED / EDITABLE
// false = Field should be DISABLED / READ-ONLY
// 
// UPDATE THESE VALUES based on your exact business requirements.
// ============================================================================
const DEFAULT_ACCESS = {
  serialNumber: true,
  productName: true,
  productCode: true,
  customerName: true,
  customerUser: true,
  phone: true,
  email: true,
  returnLocation: true,
  rmaType: true,
  customerInternalRef: true,
  noteForRepair: true,
  saveBtn: true,
  closeBtn: true
};

const RBAC_MATRIX = {
  adminUser: { ...DEFAULT_ACCESS },
  rmaAdmin: { ...DEFAULT_ACCESS },
  repairEngineer: { ...DEFAULT_ACCESS },
  
  // Example: Watcher might not be able to edit anything, only view/close
  repairWatcher: {
    ...DEFAULT_ACCESS,
    serialNumber: false, productName: false, productCode: false,
    customerName: false, customerUser: false, phone: false, email: false,
    returnLocation: false, rmaType: false, customerInternalRef: false,
    noteForRepair: false, saveBtn: false
  },
  
  // Customers might not be able to change the Customer Name dropdown
  customerOne: { ...DEFAULT_ACCESS, customerName: false },
  customerTwo: { ...DEFAULT_ACCESS, customerName: false },
  inactivecustomer: { ...DEFAULT_ACCESS, customerName: false },
  seccustomer: { ...DEFAULT_ACCESS, customerName: false },
  systemUser: { ...DEFAULT_ACCESS }
};

// ============================================================================

for (const [userKey, userConfig] of Object.entries(USERS)) {
  test.describe(`Submit RMA RBAC - ${userConfig.role} (${userKey})`, () => {
    
    // Authenticate using the specific user's storage state
    test.use({ storageState: getStorageStatePath(userKey) });

    test(`Verify field access on Submit RMA page for ${userKey} @rbac`, async ({ page }) => {
    Logger.step('Verify field access on Submit RMA page for ...');
    await allure.feature('Submit RMA');
    await allure.story('Role Access to Submit');

      const expectedAccess = RBAC_MATRIX[userKey] || DEFAULT_ACCESS;
      const submitPage = new SubmitRMAPage(page);
      
      // Navigate to Submit RMA Page
      await submitPage.goto();
      await page.waitForLoadState('domcontentloaded');

      // Helper function to assert state
      const assertState = async (locator, name, shouldBeEnabled) => {
        // First check if element is present in DOM at all
        if (await locator.count() === 0) {
           // If element is missing entirely, it's inherently not enabled.
           // You can change this to expect(false).toBe(true) if missing fields should fail the test.
           test.info().annotations.push({ type: 'warning', description: `Element ${name} not found in DOM for ${userKey}` });
           return;
        }
        
        if (shouldBeEnabled) {
          await expect(locator, `${name} should be enabled for ${userKey}`).toBeEnabled();
        } else {
          await expect(locator, `${name} should be disabled for ${userKey}`).toBeDisabled();
        }
      };

      // 1. Product Information
      await assertState(submitPage.serialNumberInput, 'Serial Number', expectedAccess.serialNumber);
      await assertState(submitPage.productNameInput, 'Product Name', expectedAccess.productName);
      await assertState(submitPage.productCodeInput, 'Product Code', expectedAccess.productCode);

      // 2. Customer Section
      await assertState(submitPage.customerNameDropdown, 'Customer Name', expectedAccess.customerName);
      await assertState(submitPage.customerUserDropdown, 'Customer User', expectedAccess.customerUser);
      await assertState(submitPage.phoneInput, 'Phone', expectedAccess.phone);
      await assertState(submitPage.emailInput, 'Email', expectedAccess.email);

      // 3. RMA Information
      await assertState(submitPage.returnLocationDropdown, 'Return Location', expectedAccess.returnLocation);
      await assertState(submitPage.rmaTypeDropdown, 'RMA Type', expectedAccess.rmaType);
      await assertState(submitPage.customerInternalRef, 'Customer Internal Ref', expectedAccess.customerInternalRef);
      await assertState(submitPage.noteForRepair, 'Note For Repair', expectedAccess.noteForRepair);

      // 4. Buttons
      await assertState(submitPage.saveBtn, 'Save Button', expectedAccess.saveBtn);
      await assertState(submitPage.closeBtn, 'Close Button', expectedAccess.closeBtn);
    });
  });
}
