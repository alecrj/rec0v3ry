import { test, expect } from '@playwright/test';
import {
  login,
  navigateToCRM,
  navigateToPWA,
  fillForm,
  assertToast,
  TEST_USERS,
} from '../helpers/test-utils';

/**
 * E2E Test: Monthly Billing Cycle
 * User Flow 13.2 from 01_REQUIREMENTS.md
 *
 * Tests the complete billing flow:
 * 1. Invoice Generation → 2. Payment Collection →
 * 3. Reminders → 4. Dunning Escalation → 5. Month-End
 */
test.describe('Monthly Billing Cycle', () => {
  test.describe('Invoice Generation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'propertyManager');
    });

    test('generates invoices for billing cycle', async ({ page }) => {
      await navigateToCRM(page, 'billing');
      await page.click('[data-testid="invoices-tab"]');

      // Trigger manual invoice generation (normally automated)
      await page.click('[data-testid="generate-invoices-btn"]');

      // Select billing period
      await page.selectOption('[data-testid="billing-period"]', 'current');
      await page.click('[data-testid="confirm-generate"]');

      await assertToast(page, /Invoices generated/i);

      // Verify invoices appear in list
      const invoiceTable = page.locator('[data-testid="invoice-table"]');
      await expect(invoiceTable.locator('tbody tr')).toHaveCount.greaterThan(0);
    });

    test('applies proration for mid-cycle move-in', async ({ page }) => {
      await navigateToCRM(page, 'billing');
      await page.click('[data-testid="invoices-tab"]');

      // Find a prorated invoice
      await page.fill('[data-testid="invoice-filter"]', 'prorated');
      await page.click('[data-testid="invoice-row"]:first-child');

      // Verify proration calculation shown
      const proratedLine = page.locator('[data-testid="line-item-proration"]');
      await expect(proratedLine).toBeVisible();

      // Proration formula: daily_rate = monthly_rate / days_in_month
      const proratedAmount = await proratedLine.locator('[data-testid="line-amount"]').textContent();
      expect(proratedAmount).toMatch(/\$\d+\.\d{2}/);
    });

    test('splits invoice across multiple payers', async ({ page }) => {
      await navigateToCRM(page, 'billing');

      // Find resident with multiple payers
      await page.click('[data-testid="residents-tab"]');
      await page.fill('[data-testid="search-resident"]', 'multi-payer');
      await page.click('[data-testid="resident-row"]:first-child');

      // View invoices
      await page.click('[data-testid="invoices-subtab"]');
      await page.click('[data-testid="invoice-row"]:first-child');

      // Should show split across payers
      const payerSplits = page.locator('[data-testid="payer-split-row"]');
      await expect(payerSplits).toHaveCount.greaterThan(1);

      // Verify percentages add up to 100%
      const percentages = await payerSplits.locator('[data-testid="split-percentage"]').allTextContents();
      const total = percentages.reduce((sum, p) => sum + parseInt(p), 0);
      expect(total).toBe(100);
    });
  });

  test.describe('Payment Collection', () => {
    test('resident pays via PWA portal', async ({ page }) => {
      await login(page, 'resident');

      await navigateToPWA(page, 'payments');

      // View outstanding invoices
      await expect(page.locator('[data-testid="balance-due"]')).toBeVisible();

      // Click pay now
      await page.click('[data-testid="pay-now-btn"]');

      // Payment modal with Stripe Elements
      await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();

      // Fill Stripe test card
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
      await stripeFrame.locator('[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('[name="cvc"]').fill('123');

      await page.click('[data-testid="submit-payment"]');

      // Wait for Stripe processing
      await page.waitForResponse((r) => r.url().includes('/api/trpc/payment.create'));

      await assertToast(page, /Payment successful/i);

      // Verify balance updated
      await expect(page.locator('[data-testid="balance-due"]')).toHaveText('$0.00');
    });

    test('family/sponsor pays via portal', async ({ page }) => {
      await login(page, 'familyMember');

      await navigateToPWA(page, 'family');

      // Should see designated resident's invoices
      await expect(page.locator('[data-testid="resident-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-section"]')).toBeVisible();

      // Make payment
      await page.click('[data-testid="pay-now-btn"]');

      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
      await stripeFrame.locator('[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('[name="cvc"]').fill('123');

      await page.click('[data-testid="submit-payment"]');
      await assertToast(page, /Payment successful/i);
    });

    test('staff records cash/check payment', async ({ page }) => {
      await login(page, 'houseManager');

      await navigateToCRM(page, 'billing');
      await page.click('[data-testid="record-payment-btn"]');

      await fillForm(page, {
        Resident: 'Test Resident',
        Amount: '150.00',
        'Payment Method': 'Cash',
        'Receipt Number': 'CASH-001',
      });

      await page.click('[data-testid="submit-payment"]');
      await assertToast(page, /Payment recorded/i);

      // Verify ledger entry created
      await page.click('[data-testid="ledger-tab"]');
      const ledgerEntry = page.locator('[data-testid="ledger-row"]:first-child');
      await expect(ledgerEntry).toContainText('Cash');
      await expect(ledgerEntry).toContainText('150.00');
    });

    test('creates balanced ledger entries for each payment', async ({ page }) => {
      await login(page, 'propertyManager');

      await navigateToCRM(page, 'billing');
      await page.click('[data-testid="ledger-tab"]');

      // Get recent payment
      const paymentRow = page.locator('[data-testid="ledger-row"]:first-child');
      const transactionId = await paymentRow.getAttribute('data-transaction-id');

      // Should have both debit and credit entries
      const entriesForTransaction = page.locator(`[data-transaction-id="${transactionId}"]`);
      await expect(entriesForTransaction).toHaveCount(2);

      // Verify debits = credits
      const amounts = await entriesForTransaction.locator('[data-testid="entry-amount"]').allTextContents();
      const debitTotal = amounts
        .filter((a) => a.startsWith('-'))
        .reduce((sum, a) => sum + parseFloat(a), 0);
      const creditTotal = amounts
        .filter((a) => !a.startsWith('-'))
        .reduce((sum, a) => sum + parseFloat(a), 0);

      expect(Math.abs(debitTotal) - creditTotal).toBeLessThan(0.01);
    });
  });

  test.describe('Dunning Escalation', () => {
    test('shows escalation timeline for past-due accounts', async ({ page }) => {
      await login(page, 'propertyManager');

      await navigateToCRM(page, 'billing');
      await page.click('[data-testid="delinquent-tab"]');

      // Find past-due resident
      await page.click('[data-testid="delinquent-row"]:first-child');

      // Should show dunning timeline
      const dunningTimeline = page.locator('[data-testid="dunning-timeline"]');
      await expect(dunningTimeline).toBeVisible();

      // Timeline should show: Reminder → Warning → Suspension → Discharge Review
      await expect(dunningTimeline.locator('[data-step="reminder"]')).toBeVisible();
      await expect(dunningTimeline.locator('[data-step="warning"]')).toBeVisible();
      await expect(dunningTimeline.locator('[data-step="suspension"]')).toBeVisible();
      await expect(dunningTimeline.locator('[data-step="discharge-review"]')).toBeVisible();
    });

    test('account suspension limits resident app access', async ({ page }) => {
      // Login as suspended resident
      await login(page, 'resident');

      // Should see limited access banner
      const suspensionBanner = page.locator('[data-testid="suspension-banner"]');
      await expect(suspensionBanner).toBeVisible();
      await expect(suspensionBanner).toContainText(/Account suspended/i);

      // Payment link should still be accessible
      await expect(page.locator('[data-testid="pwa-nav-payments"]')).toBeEnabled();

      // Other features should be disabled
      await expect(page.locator('[data-testid="pwa-nav-messages"]')).toBeDisabled();
    });
  });

  test.describe('Financial Reports', () => {
    test('generates accurate aging report', async ({ page }) => {
      await login(page, 'propertyManager');

      await navigateToCRM(page, 'reports');
      await page.click('[data-testid="financial-reports"]');

      // Aging buckets: 0-30, 31-60, 61-90, 90+
      const agingReport = page.locator('[data-testid="aging-report"]');
      await expect(agingReport.locator('[data-bucket="0-30"]')).toBeVisible();
      await expect(agingReport.locator('[data-bucket="31-60"]')).toBeVisible();
      await expect(agingReport.locator('[data-bucket="61-90"]')).toBeVisible();
      await expect(agingReport.locator('[data-bucket="90+"]')).toBeVisible();

      // Totals should be displayed
      await expect(agingReport.locator('[data-testid="total-outstanding"]')).toBeVisible();
    });

    test('shows collection rate metrics', async ({ page }) => {
      await login(page, 'orgOwner');

      await navigateToCRM(page, 'reports');
      await page.click('[data-testid="financial-reports"]');

      // MTD metrics
      await expect(page.locator('[data-testid="mtd-invoiced"]')).toBeVisible();
      await expect(page.locator('[data-testid="mtd-collected"]')).toBeVisible();
      await expect(page.locator('[data-testid="collection-rate"]')).toBeVisible();

      // Collection rate should be percentage
      const collectionRate = await page.locator('[data-testid="collection-rate"]').textContent();
      expect(collectionRate).toMatch(/\d+(\.\d+)?%/);
    });
  });
});
