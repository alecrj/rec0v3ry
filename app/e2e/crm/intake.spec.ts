import { test, expect } from '@playwright/test';
import {
  login,
  navigateToCRM,
  fillForm,
  assertToast,
  generateTestData,
  TEST_USERS,
} from '../helpers/test-utils';

/**
 * E2E Test: New Resident Intake (End-to-End)
 * User Flow 13.1 from 01_REQUIREMENTS.md
 *
 * Tests the complete intake flow:
 * 1. Lead Created → 2. Screening → 3. Approval →
 * 4. Intake Meeting (consent, docs) → 5. Financial Setup → 6. Move-In
 */
test.describe('New Resident Intake Flow', () => {
  const testResident = generateTestData('resident');

  test.beforeEach(async ({ page }) => {
    await login(page, 'propertyManager');
  });

  test('1. Create new lead in CRM pipeline', async ({ page }) => {
    await navigateToCRM(page, 'admissions');
    await page.click('[data-testid="create-lead-btn"]');

    await fillForm(page, {
      'First Name': testResident.name,
      'Last Name': 'TestLast',
      Email: testResident.email,
      Phone: testResident.phone,
      'Referral Source': 'Self-Referral',
    });

    await page.click('[data-testid="submit-lead"]');
    await assertToast(page, /Lead created/i);

    // Verify lead appears in Inquiry column
    const inquiryColumn = page.locator('[data-testid="pipeline-inquiry"]');
    await expect(inquiryColumn).toContainText(testResident.name);
  });

  test('2. Move lead through screening', async ({ page }) => {
    await navigateToCRM(page, 'admissions');

    // Find our test lead
    const leadCard = page.locator(`[data-testid="lead-card"]:has-text("${testResident.name}")`);
    await leadCard.dragTo(page.locator('[data-testid="pipeline-screening"]'));

    // Open lead detail
    await leadCard.click();

    // Complete screening form
    await page.click('[data-testid="screening-tab"]');
    await fillForm(page, {
      'Eligibility Status': 'Eligible',
      'Interview Notes': 'Completed phone screening. Good fit for program.',
    });

    await page.click('[data-testid="save-screening"]');
    await assertToast(page, /Screening saved/i);
  });

  test('3. Approve lead and assign bed', async ({ page }) => {
    await navigateToCRM(page, 'admissions');

    const leadCard = page.locator(`[data-testid="lead-card"]:has-text("${testResident.name}")`);
    await leadCard.dragTo(page.locator('[data-testid="pipeline-approved"]'));

    await leadCard.click();
    await page.click('[data-testid="assign-bed-btn"]');

    // Select house and bed
    await page.selectOption('[data-testid="house-select"]', { index: 1 });
    await page.click('[data-testid="available-bed"]:first-child');
    await page.click('[data-testid="confirm-bed-assignment"]');

    await assertToast(page, /Bed assigned/i);
  });

  test('4. Complete intake meeting with Part 2 consent', async ({ page }) => {
    await navigateToCRM(page, 'admissions');

    const leadCard = page.locator(`[data-testid="lead-card"]:has-text("${testResident.name}")`);
    await leadCard.click();

    await page.click('[data-testid="start-intake-btn"]');

    // Step 1: Part 2 Patient Notice
    await expect(page.locator('[data-testid="intake-step"]')).toHaveText(/Patient Notice/);
    await page.click('[data-testid="patient-notice-checkbox"]');
    await page.click('[data-testid="intake-next"]');

    // Step 2: Part 2 Consent Form (42 CFR 2.31 required fields)
    await expect(page.locator('[data-testid="intake-step"]')).toHaveText(/Part 2 Consent/);

    // All 9 required elements must be present
    await expect(page.locator('[data-testid="consent-patient-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="consent-disclosing-entity"]')).toBeVisible();

    await fillForm(page, {
      Recipient: 'Family Member',
      'Recipient Address': '123 Family St, City, ST 12345',
      'Purpose of Disclosure': 'Family communication regarding recovery progress',
      'Information to be Disclosed': 'General status updates only',
    });

    // Expiration date required
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await page.fill('[data-testid="consent-expiration"]', futureDate.toISOString().split('T')[0]);

    // Revocation notice checkbox
    await page.click('[data-testid="consent-revocation-notice"]');

    // E-signature
    await page.click('[data-testid="consent-signature-pad"]');
    await page.click('[data-testid="consent-sign-btn"]');

    await page.click('[data-testid="intake-next"]');

    // Step 3: Intake Form
    await expect(page.locator('[data-testid="intake-step"]')).toHaveText(/Intake Form/);
    await fillForm(page, {
      'Date of Birth': '1990-01-15',
      'Emergency Contact': 'John Doe',
      'Emergency Phone': '555-123-4567',
    });
    await page.click('[data-testid="intake-next"]');

    // Step 4: House Rules Acknowledgment
    await expect(page.locator('[data-testid="intake-step"]')).toHaveText(/House Rules/);
    await page.click('[data-testid="house-rules-read"]');
    await page.click('[data-testid="house-rules-signature-pad"]');
    await page.click('[data-testid="house-rules-sign-btn"]');
    await page.click('[data-testid="intake-next"]');

    // Step 5: Document Collection
    await expect(page.locator('[data-testid="intake-step"]')).toHaveText(/Documents/);
    // Skip for now - required docs can be uploaded later
    await page.click('[data-testid="intake-next"]');

    // Complete intake
    await page.click('[data-testid="complete-intake-btn"]');
    await assertToast(page, /Intake completed/i);
  });

  test('5. Financial setup - rate and deposit', async ({ page }) => {
    await navigateToCRM(page, 'billing');
    await page.click('[data-testid="residents-tab"]');

    // Find our resident
    await page.fill('[data-testid="search-resident"]', testResident.name);
    await page.click(`[data-testid="resident-row"]:has-text("${testResident.name}")`);

    // Configure rate
    await page.click('[data-testid="billing-setup-tab"]');
    await fillForm(page, {
      Rate: '150',
      'Billing Cycle': 'Weekly',
    });
    await page.click('[data-testid="save-rate"]');

    // Add payer
    await page.click('[data-testid="add-payer-btn"]');
    await fillForm(page, {
      'Payer Name': 'Test Family',
      'Payer Email': 'family@test.com',
      Relationship: 'Parent',
      'Responsibility %': '50',
    });
    await page.click('[data-testid="save-payer"]');

    // Collect deposit
    await page.click('[data-testid="collect-deposit-btn"]');
    await fillForm(page, {
      'Deposit Amount': '300',
      'Payment Method': 'Card',
    });
    await page.click('[data-testid="process-deposit"]');

    await assertToast(page, /Deposit collected/i);
  });

  test('6. Move-in completion', async ({ page }) => {
    await navigateToCRM(page, 'admissions');

    const leadCard = page.locator(`[data-testid="lead-card"]:has-text("${testResident.name}")`);
    await leadCard.dragTo(page.locator('[data-testid="pipeline-admitted"]'));

    // Verify resident account activated
    await navigateToCRM(page, 'occupancy');

    // Check bed grid shows resident
    const bedCell = page.locator(`[data-testid="bed-cell"]:has-text("${testResident.name}")`);
    await expect(bedCell).toBeVisible();
    await expect(bedCell).toHaveAttribute('data-status', 'occupied');
  });

  test('Intake cannot complete without Part 2 consent', async ({ page }) => {
    await navigateToCRM(page, 'admissions');
    await page.click('[data-testid="create-lead-btn"]');

    const noConsentResident = generateTestData('noconsent');
    await fillForm(page, {
      'First Name': noConsentResident.name,
      'Last Name': 'NoConsent',
      Email: noConsentResident.email,
      Phone: noConsentResident.phone,
    });
    await page.click('[data-testid="submit-lead"]');

    // Try to skip consent step
    const leadCard = page.locator(`[data-testid="lead-card"]:has-text("${noConsentResident.name}")`);
    await leadCard.click();
    await page.click('[data-testid="start-intake-btn"]');

    // Patient notice
    await page.click('[data-testid="patient-notice-checkbox"]');
    await page.click('[data-testid="intake-next"]');

    // Try to skip consent
    await page.click('[data-testid="skip-consent-btn"]');

    // Should show error - consent required
    await expect(page.locator('[data-testid="consent-required-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="consent-required-error"]')).toHaveText(
      /At least one Part 2 consent is required/i
    );
  });
});
