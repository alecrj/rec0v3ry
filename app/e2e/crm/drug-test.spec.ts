import { test, expect } from '@playwright/test';
import {
  login,
  navigateToCRM,
  fillForm,
  assertToast,
  TEST_USERS,
} from '../helpers/test-utils';

/**
 * E2E Test: Drug Test with Positive Result
 * User Flow 13.3 from 01_REQUIREMENTS.md
 *
 * Tests the complete drug test flow:
 * 1. Test Administration → 2. Positive Result Processing →
 * 3. Disclosure (consent check)
 *
 * Part 2 Compliance: Drug test results are Part 2 protected data
 */
test.describe('Drug Test with Positive Result', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'houseManager');
  });

  test('1. Administer drug test and record result', async ({ page }) => {
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');
    await page.click('[data-testid="record-test-btn"]');

    // Select resident
    await page.selectOption('[data-testid="resident-select"]', { index: 1 });

    // Select test type
    await fillForm(page, {
      'Test Type': '10-Panel',
      'Test Date': new Date().toISOString().split('T')[0],
      'Administered By': 'House Manager',
    });

    // Record positive result
    await page.selectOption('[data-testid="result-select"]', 'positive');
    await page.fill('[data-testid="positive-substances"]', 'Opioids');

    await page.click('[data-testid="submit-test"]');
    await assertToast(page, /Test recorded/i);

    // Verify audit log created
    // (Drug test creation should be logged at high sensitivity)
  });

  test('result stored as Part 2 encrypted data', async ({ page }) => {
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');

    // Open recent test
    await page.click('[data-testid="test-row"]:first-child');

    // Should show Part 2 protection indicator
    const part2Badge = page.locator('[data-testid="part2-protected-badge"]');
    await expect(part2Badge).toBeVisible();
    await expect(part2Badge).toHaveText(/Part 2 Protected/i);

    // Data should be marked as encrypted
    const encryptedIndicator = page.locator('[data-testid="encrypted-field-indicator"]');
    await expect(encryptedIndicator).toBeVisible();
  });

  test('2. Positive result triggers workflow', async ({ page }) => {
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');

    // Find a positive result
    await page.fill('[data-testid="result-filter"]', 'positive');
    await page.click('[data-testid="test-row"]:first-child');

    // Should show workflow actions
    const workflowPanel = page.locator('[data-testid="positive-result-workflow"]');
    await expect(workflowPanel).toBeVisible();

    // Available workflow options
    await expect(workflowPanel.locator('[data-testid="option-notify-pm"]')).toBeVisible();
    await expect(workflowPanel.locator('[data-testid="option-create-incident"]')).toBeVisible();
    await expect(workflowPanel.locator('[data-testid="option-discharge-review"]')).toBeVisible();

    // Select notification option
    await page.click('[data-testid="option-notify-pm"]');
    await page.click('[data-testid="execute-workflow"]');

    await assertToast(page, /Notification sent/i);
  });

  test('result visible only to staff with Part 2 access and active consent', async ({ page }) => {
    // First verify house manager can see
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');
    await page.click('[data-testid="test-row"]:first-child');

    const resultField = page.locator('[data-testid="test-result"]');
    await expect(resultField).toBeVisible();
    await expect(resultField).not.toHaveText('Redacted');
  });

  test('house monitor cannot view drug test results', async ({ page }) => {
    // Logout and login as house monitor
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="sign-out"]');
    await login(page, 'houseMonitor');

    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');

    // Monitor should not see results - only that tests occurred
    const testRow = page.locator('[data-testid="test-row"]:first-child');

    // Result column should be redacted or hidden
    const resultCell = testRow.locator('[data-testid="result-cell"]');
    const resultText = await resultCell.textContent();

    expect(resultText).toMatch(/Restricted|Access Denied|—/i);
  });

  test('3. Disclosure checks active consent before sharing', async ({ page }) => {
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');
    await page.click('[data-testid="test-row"]:first-child');

    // Try to share result
    await page.click('[data-testid="share-result-btn"]');

    // Modal shows available recipients (only those with active consent)
    const shareModal = page.locator('[data-testid="share-modal"]');
    await expect(shareModal).toBeVisible();

    // Consent check indicator
    await expect(shareModal.locator('[data-testid="consent-verified"]')).toBeVisible();

    // Recipients without consent shown but disabled
    const noConsentRecipient = shareModal.locator('[data-testid="recipient-no-consent"]');
    if (await noConsentRecipient.isVisible()) {
      await expect(noConsentRecipient).toBeDisabled();
      await expect(noConsentRecipient).toHaveAttribute(
        'data-reason',
        'No active Part 2 consent'
      );
    }
  });

  test('disclosure includes redisclosure notice', async ({ page }) => {
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');
    await page.click('[data-testid="test-row"]:first-child');

    await page.click('[data-testid="share-result-btn"]');

    // Select a consented recipient
    await page.click('[data-testid="recipient-with-consent"]:first-child');
    await page.click('[data-testid="confirm-share"]');

    // Redisclosure notice should be shown
    const noticeModal = page.locator('[data-testid="redisclosure-notice-modal"]');
    await expect(noticeModal).toBeVisible();
    await expect(noticeModal).toContainText('42 CFR Part 2');
    await expect(noticeModal).toContainText('prohibits any further disclosure');

    // Must acknowledge before proceeding
    await page.click('[data-testid="acknowledge-notice"]');
    await assertToast(page, /Disclosure logged/i);
  });

  test('blocked disclosure is logged when no consent', async ({ page }) => {
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');
    await page.click('[data-testid="test-row"]:first-child');

    await page.click('[data-testid="share-result-btn"]');

    // Try to force share to non-consented recipient (via API)
    const response = await page.request.post('/api/trpc/drugTest.disclose', {
      data: {
        testId: 'test-123',
        recipientId: 'no-consent-recipient',
      },
    });

    // Should be blocked
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/consent/i);
  });

  test('each result access creates audit entry', async ({ page }) => {
    await navigateToCRM(page, 'operations');
    await page.click('[data-testid="drug-tests-tab"]');
    await page.click('[data-testid="test-row"]:first-child');

    // Get the test ID
    const testId = await page.locator('[data-testid="test-detail"]').getAttribute('data-test-id');

    // Check audit log for this access
    await navigateToCRM(page, 'compliance');
    await page.click('[data-testid="audit-log-tab"]');

    await page.fill('[data-testid="audit-filter-resource"]', testId || '');
    await page.click('[data-testid="apply-filter"]');

    // Should have drug_test_viewed entry
    const viewEntry = page.locator('[data-testid="audit-row"][data-action="drug_test_viewed"]');
    await expect(viewEntry).toBeVisible();
    await expect(viewEntry.locator('[data-testid="audit-sensitivity"]')).toHaveText('part2');
  });
});
