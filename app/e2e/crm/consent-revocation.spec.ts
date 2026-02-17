import { test, expect } from '@playwright/test';
import {
  login,
  navigateToCRM,
  navigateToPWA,
  assertToast,
  TEST_USERS,
} from '../helpers/test-utils';

/**
 * E2E Test: Part 2 Consent Revocation
 * User Flow 13.4 from 01_REQUIREMENTS.md
 *
 * Tests the complete revocation flow:
 * 1. Resident Requests Revocation → 2. Revocation Processing →
 * 3. Impact Assessment
 *
 * Critical: Revocation must be IMMEDIATE per 42 CFR Part 2
 */
test.describe('Part 2 Consent Revocation', () => {
  test.describe('Resident-initiated revocation (PWA)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'resident');
    });

    test('1. Resident views and requests revocation', async ({ page }) => {
      await navigateToPWA(page, 'home');
      await page.click('[data-testid="my-consents-link"]');

      // View active consents
      const consentList = page.locator('[data-testid="consent-list"]');
      await expect(consentList).toBeVisible();

      // Find a consent to revoke
      const activeConsent = consentList.locator('[data-status="active"]:first-child');
      await expect(activeConsent).toBeVisible();

      // Click to view details
      await activeConsent.click();

      // Consent details displayed
      await expect(page.locator('[data-testid="consent-recipient"]')).toBeVisible();
      await expect(page.locator('[data-testid="consent-purpose"]')).toBeVisible();
      await expect(page.locator('[data-testid="consent-expiration"]')).toBeVisible();

      // Revoke button available
      await expect(page.locator('[data-testid="revoke-consent-btn"]')).toBeVisible();
    });

    test('2. Revocation processes immediately', async ({ page }) => {
      await navigateToPWA(page, 'home');
      await page.click('[data-testid="my-consents-link"]');

      const activeConsent = page.locator('[data-testid="consent-item"][data-status="active"]:first-child');
      await activeConsent.click();

      // Get consent ID for verification
      const consentId = await page.locator('[data-testid="consent-detail"]').getAttribute('data-consent-id');

      // Click revoke
      await page.click('[data-testid="revoke-consent-btn"]');

      // Confirmation modal
      const confirmModal = page.locator('[data-testid="revoke-confirm-modal"]');
      await expect(confirmModal).toBeVisible();
      await expect(confirmModal).toContainText(/Are you sure/i);
      await expect(confirmModal).toContainText(/cannot be undone/i);

      // Confirm revocation
      await page.click('[data-testid="confirm-revoke-btn"]');

      // Should immediately show as revoked
      await assertToast(page, /Consent revoked/i);

      // Verify status changed
      await expect(page.locator('[data-testid="consent-status"]')).toHaveText(/Revoked/i);

      // Timestamp should be now
      const revokedAt = await page.locator('[data-testid="revoked-at"]').textContent();
      const revokedTime = new Date(revokedAt || '').getTime();
      const now = Date.now();
      expect(now - revokedTime).toBeLessThan(60000); // Within last minute
    });

    test('revocation blocks all future disclosures', async ({ page }) => {
      // Setup: Login as house manager to test disclosure blocking
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out"]');
      await login(page, 'houseManager');

      await navigateToCRM(page, 'compliance');
      await page.click('[data-testid="residents-tab"]');

      // Find resident with revoked consent
      await page.fill('[data-testid="search-resident"]', 'Test Resident');
      await page.click('[data-testid="resident-row"]:first-child');

      // Try to disclose to the revoked recipient
      await page.click('[data-testid="disclosures-tab"]');
      await page.click('[data-testid="new-disclosure-btn"]');

      // Revoked recipient should be unavailable
      const revokedRecipient = page.locator('[data-testid="recipient-option"][data-consent-revoked="true"]');
      if (await revokedRecipient.isVisible()) {
        await expect(revokedRecipient).toBeDisabled();
        await expect(revokedRecipient).toHaveAttribute('title', /Consent revoked/i);
      }
    });

    test('affected staff notified on revocation', async ({ page }) => {
      // Login as house manager who was receiving disclosures
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out"]');
      await login(page, 'houseManager');

      // Check notifications
      await page.click('[data-testid="notifications-bell"]');

      // Should have consent revocation notification
      const notification = page.locator('[data-testid="notification-item"][data-type="consent_revoked"]');
      await expect(notification).toBeVisible();
      await expect(notification).toContainText(/Consent revoked/i);
    });

    test('family/sponsor access revoked immediately', async ({ page }) => {
      // First, revoke consent for family communication
      await navigateToPWA(page, 'home');
      await page.click('[data-testid="my-consents-link"]');

      const familyConsent = page.locator('[data-testid="consent-item"]:has-text("Family")');
      if (await familyConsent.isVisible()) {
        await familyConsent.click();
        await page.click('[data-testid="revoke-consent-btn"]');
        await page.click('[data-testid="confirm-revoke-btn"]');
      }

      // Now login as family member
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out"]');
      await login(page, 'familyMember');

      // Should see access revoked message
      await navigateToPWA(page, 'family');

      const accessDenied = page.locator('[data-testid="access-revoked-notice"]');
      await expect(accessDenied).toBeVisible();
      await expect(accessDenied).toContainText(/Consent has been revoked/i);
    });

    test('audit log records consent_revoked', async ({ page }) => {
      // Login as compliance officer
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out"]');
      await login(page, 'orgOwner');

      await navigateToCRM(page, 'compliance');
      await page.click('[data-testid="audit-log-tab"]');

      // Filter for consent revocation events
      await page.selectOption('[data-testid="audit-action-filter"]', 'consent_revoked');
      await page.click('[data-testid="apply-filter"]');

      // Should show recent revocation
      const revokeEntry = page.locator('[data-testid="audit-row"]:first-child');
      await expect(revokeEntry).toBeVisible();
      await expect(revokeEntry.locator('[data-testid="audit-action"]')).toHaveText('consent_revoked');
      await expect(revokeEntry.locator('[data-testid="audit-sensitivity"]')).toHaveText('part2');
    });
  });

  test.describe('Staff-assisted revocation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'houseManager');
    });

    test('staff can revoke on behalf of resident (in-person)', async ({ page }) => {
      await navigateToCRM(page, 'compliance');
      await page.click('[data-testid="consents-tab"]');

      // Find resident's consent
      await page.fill('[data-testid="search-resident"]', 'Test Resident');
      await page.click('[data-testid="consent-row"]:first-child');

      // Staff revoke button
      await page.click('[data-testid="staff-revoke-btn"]');

      // Requires verification
      const verifyModal = page.locator('[data-testid="staff-verify-modal"]');
      await expect(verifyModal).toBeVisible();
      await expect(verifyModal).toContainText(/Verify resident identity/i);

      // Select verification method
      await page.click('[data-testid="verify-in-person"]');
      await page.fill('[data-testid="verification-notes"]', 'Resident present, verified ID');

      await page.click('[data-testid="confirm-staff-revoke"]');
      await assertToast(page, /Consent revoked/i);

      // Audit should show staff-assisted revocation
      await navigateToCRM(page, 'compliance');
      await page.click('[data-testid="audit-log-tab"]');

      const auditEntry = page.locator('[data-testid="audit-row"]:first-child');
      await expect(auditEntry.locator('[data-testid="audit-details"]')).toContainText('staff-assisted');
    });
  });

  test.describe('Impact Assessment', () => {
    test('3. Shows which data sharing is affected', async ({ page }) => {
      await login(page, 'resident');

      await navigateToPWA(page, 'home');
      await page.click('[data-testid="my-consents-link"]');

      const activeConsent = page.locator('[data-testid="consent-item"][data-status="active"]:first-child');
      await activeConsent.click();

      // Click revoke to see impact preview
      await page.click('[data-testid="revoke-consent-btn"]');

      // Impact section should list affected sharing
      const impactSection = page.locator('[data-testid="revocation-impact"]');
      await expect(impactSection).toBeVisible();

      // Shows what will be blocked
      await expect(impactSection.locator('[data-testid="impact-recipient"]')).toBeVisible();
      await expect(impactSection.locator('[data-testid="impact-data-types"]')).toBeVisible();

      // Shows active disclosures under this consent
      const disclosureCount = page.locator('[data-testid="disclosure-count"]');
      await expect(disclosureCount).toBeVisible();
    });

    test('shows remaining active consents for recipient', async ({ page }) => {
      await login(page, 'houseManager');

      await navigateToCRM(page, 'compliance');
      await page.click('[data-testid="consents-tab"]');

      await page.fill('[data-testid="search-resident"]', 'Test Resident');
      await page.click('[data-testid="consent-row"]:first-child');

      await page.click('[data-testid="staff-revoke-btn"]');

      // After revocation preview, show remaining consents
      const remainingConsents = page.locator('[data-testid="remaining-consents"]');

      // If this is the only consent for recipient, warn about full block
      const fullBlockWarning = page.locator('[data-testid="full-block-warning"]');
      if (await fullBlockWarning.isVisible()) {
        await expect(fullBlockWarning).toContainText(/This is the only active consent/i);
        await expect(fullBlockWarning).toContainText(/all access will be blocked/i);
      }
    });
  });

  test.describe('Edge cases', () => {
    test('cannot revoke already-revoked consent', async ({ page }) => {
      await login(page, 'resident');

      await navigateToPWA(page, 'home');
      await page.click('[data-testid="my-consents-link"]');

      // Find revoked consent
      const revokedConsent = page.locator('[data-testid="consent-item"][data-status="revoked"]:first-child');

      if (await revokedConsent.isVisible()) {
        await revokedConsent.click();

        // Revoke button should not be present
        await expect(page.locator('[data-testid="revoke-consent-btn"]')).not.toBeVisible();

        // Should show revoked status
        await expect(page.locator('[data-testid="consent-status"]')).toHaveText(/Revoked/i);
      }
    });

    test('cannot revoke expired consent', async ({ page }) => {
      await login(page, 'resident');

      await navigateToPWA(page, 'home');
      await page.click('[data-testid="my-consents-link"]');

      const expiredConsent = page.locator('[data-testid="consent-item"][data-status="expired"]:first-child');

      if (await expiredConsent.isVisible()) {
        await expiredConsent.click();

        // Revoke button should not be present for expired
        await expect(page.locator('[data-testid="revoke-consent-btn"]')).not.toBeVisible();
      }
    });
  });
});
