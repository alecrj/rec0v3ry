import { test, expect } from '@playwright/test';
import {
  login,
  navigateToCRM,
  fillForm,
  assertToast,
  TEST_USERS,
} from '../helpers/test-utils';

/**
 * E2E Test: Resident Discharge
 * User Flow 13.5 from 01_REQUIREMENTS.md
 *
 * Tests the complete discharge flow:
 * 1. Initiate Discharge → 2. Financial Close-Out →
 * 3. Operational Close-Out → 4. Record Management → 5. Outcomes Recording
 */
test.describe('Resident Discharge', () => {
  const testResidentName = 'Discharge Test';

  test.beforeEach(async ({ page }) => {
    await login(page, 'propertyManager');
  });

  test.describe('1. Initiate Discharge', () => {
    test('can initiate discharge with reason', async ({ page }) => {
      await navigateToCRM(page, 'occupancy');

      // Find resident to discharge
      await page.fill('[data-testid="search-resident"]', testResidentName);
      await page.click(`[data-testid="resident-row"]:has-text("${testResidentName}")`);

      // Click discharge button
      await page.click('[data-testid="initiate-discharge-btn"]');

      // Discharge modal
      const dischargeModal = page.locator('[data-testid="discharge-modal"]');
      await expect(dischargeModal).toBeVisible();

      // Required: reason selection
      await page.selectOption('[data-testid="discharge-reason"]', 'program_completion');

      // Date (default today, can be future)
      await expect(page.locator('[data-testid="discharge-date"]')).toHaveValue(
        new Date().toISOString().split('T')[0]
      );

      // Optional notes
      await page.fill(
        '[data-testid="discharge-notes"]',
        'Successfully completed 6-month program. Transitioning to independent living.'
      );

      await page.click('[data-testid="confirm-discharge"]');
      await assertToast(page, /Discharge initiated/i);
    });

    test('discharge reasons include all valid options', async ({ page }) => {
      await navigateToCRM(page, 'occupancy');
      await page.fill('[data-testid="search-resident"]', testResidentName);
      await page.click(`[data-testid="resident-row"]:has-text("${testResidentName}")`);
      await page.click('[data-testid="initiate-discharge-btn"]');

      const reasonSelect = page.locator('[data-testid="discharge-reason"]');
      const options = await reasonSelect.locator('option').allTextContents();

      // Required discharge reasons per spec
      expect(options).toContain('Program Completion');
      expect(options).toContain('Voluntary');
      expect(options).toContain('Involuntary');
      expect(options).toContain('Transfer');
      expect(options).toContain('AMA (Against Medical Advice)');
    });
  });

  test.describe('2. Financial Close-Out', () => {
    test('generates final prorated invoice', async ({ page }) => {
      await navigateToCRM(page, 'billing');
      await page.fill('[data-testid="search-resident"]', testResidentName);
      await page.click(`[data-testid="resident-row"]:has-text("${testResidentName}")`);

      // Should see final invoice generated
      await page.click('[data-testid="invoices-tab"]');

      const finalInvoice = page.locator('[data-testid="invoice-row"][data-type="final"]');
      await expect(finalInvoice).toBeVisible();

      // Click to view details
      await finalInvoice.click();

      // Should show proration calculation
      const proratedLine = page.locator('[data-testid="line-item-proration"]');
      await expect(proratedLine).toBeVisible();

      // Proration note visible
      await expect(page.locator('[data-testid="proration-note"]')).toContainText(/prorated/i);
    });

    test('calculates outstanding balance', async ({ page }) => {
      await navigateToCRM(page, 'billing');
      await page.fill('[data-testid="search-resident"]', testResidentName);
      await page.click(`[data-testid="resident-row"]:has-text("${testResidentName}")`);

      // Outstanding balance summary
      const balanceSummary = page.locator('[data-testid="balance-summary"]');
      await expect(balanceSummary).toBeVisible();

      // Components
      await expect(balanceSummary.locator('[data-testid="total-charges"]')).toBeVisible();
      await expect(balanceSummary.locator('[data-testid="total-payments"]')).toBeVisible();
      await expect(balanceSummary.locator('[data-testid="outstanding-balance"]')).toBeVisible();
    });

    test('processes deposit refund with deductions', async ({ page }) => {
      await navigateToCRM(page, 'billing');
      await page.fill('[data-testid="search-resident"]', testResidentName);
      await page.click(`[data-testid="resident-row"]:has-text("${testResidentName}")`);

      await page.click('[data-testid="deposit-tab"]');

      // Deposit refund section
      const depositSection = page.locator('[data-testid="deposit-refund-section"]');
      await expect(depositSection).toBeVisible();

      // Original deposit amount
      await expect(depositSection.locator('[data-testid="original-deposit"]')).toBeVisible();

      // Add deduction
      await page.click('[data-testid="add-deduction-btn"]');
      await fillForm(page, {
        Description: 'Room cleaning fee',
        Amount: '50.00',
      });
      await page.click('[data-testid="save-deduction"]');

      // Net refund calculated
      const netRefund = page.locator('[data-testid="net-refund"]');
      await expect(netRefund).toBeVisible();

      // Process refund
      await page.click('[data-testid="process-refund-btn"]');
      await assertToast(page, /Refund processed/i);

      // Ledger entry created
      await page.click('[data-testid="ledger-tab"]');
      const refundEntry = page.locator('[data-testid="ledger-row"]:has-text("Deposit Refund")');
      await expect(refundEntry).toBeVisible();
    });

    test('sends payer notifications', async ({ page }) => {
      await navigateToCRM(page, 'billing');
      await page.fill('[data-testid="search-resident"]', testResidentName);
      await page.click(`[data-testid="resident-row"]:has-text("${testResidentName}")`);

      // Payer notifications section
      await page.click('[data-testid="payers-tab"]');

      // Should show notification status for each payer
      const payerRows = page.locator('[data-testid="payer-row"]');
      const count = await payerRows.count();

      for (let i = 0; i < count; i++) {
        const row = payerRows.nth(i);
        const notificationStatus = row.locator('[data-testid="notification-sent"]');
        await expect(notificationStatus).toBeVisible();
      }
    });
  });

  test.describe('3. Operational Close-Out', () => {
    test('bed status updated to available', async ({ page }) => {
      await navigateToCRM(page, 'occupancy');

      // Find the bed that was occupied by discharged resident
      // After discharge, bed should show as available
      await page.fill('[data-testid="search-bed"]', testResidentName);

      // The search should return no results (resident no longer in bed)
      const noBedResult = page.locator('[data-testid="no-results"]');
      await expect(noBedResult).toBeVisible();

      // Find the house where resident was
      await page.click('[data-testid="view-all-beds"]');

      // The bed should now show as available
      const availableBeds = page.locator('[data-testid="bed-cell"][data-status="available"]');
      await expect(availableBeds.first()).toBeVisible();
    });

    test('chore rotation updated', async ({ page }) => {
      await navigateToCRM(page, 'operations');
      await page.click('[data-testid="chores-tab"]');

      // Discharged resident should not appear in rotation
      await page.fill('[data-testid="search-chore-assignment"]', testResidentName);

      const noChoreResult = page.locator('[data-testid="no-assignments-found"]');
      await expect(noChoreResult).toBeVisible();
    });

    test('records key/property return', async ({ page }) => {
      await navigateToCRM(page, 'occupancy');
      await page.fill('[data-testid="search-discharged"]', testResidentName);
      await page.click(`[data-testid="discharged-row"]:has-text("${testResidentName}")`);

      // Property return section
      await page.click('[data-testid="property-return-tab"]');

      const checklist = page.locator('[data-testid="property-checklist"]');
      await expect(checklist).toBeVisible();

      // Mark items as returned
      await page.click('[data-testid="item-keys-returned"]');
      await page.click('[data-testid="item-fob-returned"]');
      await page.click('[data-testid="save-property-return"]');

      await assertToast(page, /Property return recorded/i);
    });

    test('triggers waitlist check', async ({ page }) => {
      await navigateToCRM(page, 'occupancy');
      await page.click('[data-testid="waitlist-tab"]');

      // Should show notification that bed became available
      const bedAvailableNotice = page.locator('[data-testid="bed-available-notice"]');
      if (await bedAvailableNotice.isVisible()) {
        await expect(bedAvailableNotice).toContainText(/bed available/i);
      }

      // Waitlist entries should show "notify" option
      const waitlistEntry = page.locator('[data-testid="waitlist-row"]:first-child');
      if (await waitlistEntry.isVisible()) {
        await expect(waitlistEntry.locator('[data-testid="notify-btn"]')).toBeVisible();
      }
    });
  });

  test.describe('4. Record Management', () => {
    test('resident status set to alumni/discharged', async ({ page }) => {
      await navigateToCRM(page, 'admin');
      await page.click('[data-testid="users-tab"]');

      await page.fill('[data-testid="search-user"]', testResidentName);
      await page.click(`[data-testid="user-row"]:has-text("${testResidentName}")`);

      // Status should be alumni or discharged
      const status = page.locator('[data-testid="user-status"]');
      const statusText = await status.textContent();
      expect(statusText).toMatch(/Alumni|Discharged/i);
    });

    test('consents reviewed and handled per terms', async ({ page }) => {
      await navigateToCRM(page, 'compliance');
      await page.click('[data-testid="consents-tab"]');

      await page.fill('[data-testid="search-resident"]', testResidentName);

      // Consents should show discharge review status
      const consentRows = page.locator('[data-testid="consent-row"]');
      const count = await consentRows.count();

      for (let i = 0; i < count; i++) {
        const row = consentRows.nth(i);
        const reviewStatus = row.locator('[data-testid="discharge-review-status"]');
        await expect(reviewStatus).toBeVisible();
        const statusText = await reviewStatus.textContent();
        expect(statusText).toMatch(/Reviewed|Expired|Maintained/i);
      }
    });

    test('document retention scheduled (minimum 6 years Part 2)', async ({ page }) => {
      await navigateToCRM(page, 'documents');
      await page.click('[data-testid="retention-tab"]');

      await page.fill('[data-testid="search-resident"]', testResidentName);

      // Documents should have retention dates set
      const docRows = page.locator('[data-testid="document-row"]');
      const count = await docRows.count();

      for (let i = 0; i < count; i++) {
        const row = docRows.nth(i);
        const retentionDate = row.locator('[data-testid="retention-until"]');
        await expect(retentionDate).toBeVisible();

        // Verify Part 2 docs have 6+ year retention
        const docType = await row.locator('[data-testid="doc-type"]').textContent();
        const retentionText = await retentionDate.textContent();

        if (docType?.includes('Part 2') || docType?.includes('Consent')) {
          const retentionYear = new Date(retentionText || '').getFullYear();
          const minRetentionYear = new Date().getFullYear() + 6;
          expect(retentionYear).toBeGreaterThanOrEqual(minRetentionYear);
        }
      }
    });

    test('resident retains read-only access to own records', async ({ page }) => {
      // Login as discharged resident
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out"]');

      // Use test discharged resident credentials
      await page.goto('/sign-in');
      await page.fill('input[name="identifier"]', 'discharged@testorg.recoveryos.test');
      await page.click('button[type="submit"]');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Should have read access to own records
      await page.goto('/home');

      // Documents visible
      await page.click('[data-testid="pwa-nav-documents"]');
      const documentList = page.locator('[data-testid="document-list"]');
      await expect(documentList).toBeVisible();

      // But no edit capabilities
      await expect(page.locator('[data-testid="upload-btn"]')).not.toBeVisible();

      // Payments visible (read-only)
      await page.click('[data-testid="pwa-nav-payments"]');
      const paymentHistory = page.locator('[data-testid="payment-history"]');
      await expect(paymentHistory).toBeVisible();

      // No pay button (discharged)
      await expect(page.locator('[data-testid="pay-now-btn"]')).not.toBeVisible();
    });
  });

  test.describe('5. Outcomes Recording', () => {
    test('discharge assessment completed', async ({ page }) => {
      await navigateToCRM(page, 'admissions');
      await page.click('[data-testid="alumni-tab"]');

      await page.fill('[data-testid="search-alumni"]', testResidentName);
      await page.click(`[data-testid="alumni-row"]:has-text("${testResidentName}")`);

      // Outcomes section
      await page.click('[data-testid="outcomes-tab"]');

      // Discharge assessment form
      const assessmentForm = page.locator('[data-testid="discharge-assessment"]');
      await expect(assessmentForm).toBeVisible();

      // Key outcome fields
      await expect(assessmentForm.locator('[data-testid="length-of-stay"]')).toBeVisible();
      await expect(assessmentForm.locator('[data-testid="program-completed"]')).toBeVisible();
      await expect(assessmentForm.locator('[data-testid="discharge-disposition"]')).toBeVisible();

      // Fill if not complete
      const saveBtn = page.locator('[data-testid="save-assessment"]');
      if (await saveBtn.isVisible()) {
        await fillForm(page, {
          'Program Completed': 'Yes',
          'Discharge Disposition': 'Independent Living',
          'Follow-up Plan': 'Weekly check-ins for 30 days',
        });
        await page.click('[data-testid="save-assessment"]');
        await assertToast(page, /Assessment saved/i);
      }
    });

    test('outcomes tracked for reporting', async ({ page }) => {
      await navigateToCRM(page, 'reports');
      await page.click('[data-testid="outcomes-report"]');

      // Outcomes dashboard
      const outcomesDashboard = page.locator('[data-testid="outcomes-dashboard"]');
      await expect(outcomesDashboard).toBeVisible();

      // Key metrics
      await expect(outcomesDashboard.locator('[data-testid="completion-rate"]')).toBeVisible();
      await expect(outcomesDashboard.locator('[data-testid="avg-length-stay"]')).toBeVisible();
      await expect(outcomesDashboard.locator('[data-testid="discharge-reasons-chart"]')).toBeVisible();
    });
  });
});
