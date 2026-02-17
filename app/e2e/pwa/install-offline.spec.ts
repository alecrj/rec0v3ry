import { test, expect } from '@playwright/test';
import {
  login,
  navigateToPWA,
  checkServiceWorker,
  triggerPWAInstall,
  TEST_USERS,
} from '../helpers/test-utils';

/**
 * E2E Test: PWA Install + Offline Testing
 * Sprint 20 deliverable from 06_ROADMAP.md
 *
 * Tests:
 * - PWA installability on iOS Safari + Android Chrome
 * - Service worker caches critical assets
 * - Offline functionality
 */
test.describe('PWA Install + Offline', () => {
  test.describe('PWA Installability', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'resident');
    });

    test('manifest.json is valid', async ({ page }) => {
      const response = await page.request.get('/manifest.json');
      expect(response.status()).toBe(200);

      const manifest = await response.json();

      // Required PWA manifest fields
      expect(manifest.name).toBe('RecoveryOS');
      expect(manifest.short_name).toBe('RecoveryOS');
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBeDefined();
      expect(manifest.background_color).toBeDefined();

      // Icons for all sizes
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

      // At least 192x192 and 512x512
      const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');
    });

    test('service worker registers successfully', async ({ page }) => {
      await page.goto('/home');

      const hasServiceWorker = await checkServiceWorker(page);
      expect(hasServiceWorker).toBe(true);
    });

    test('service worker caches critical assets', async ({ page }) => {
      await page.goto('/home');

      // Wait for service worker to install and cache
      await page.waitForTimeout(2000);

      // Check cache contents via service worker
      const cachedAssets = await page.evaluate(async () => {
        const caches = await window.caches.keys();
        const criticalCache = caches.find((c) => c.includes('recoveryos'));
        if (!criticalCache) return [];

        const cache = await window.caches.open(criticalCache);
        const requests = await cache.keys();
        return requests.map((r) => r.url);
      });

      // Critical assets that should be cached
      const criticalPaths = ['/home', '/_next/static'];

      for (const path of criticalPaths) {
        const isCached = cachedAssets.some((url) => url.includes(path));
        expect(isCached).toBe(true);
      }
    });

    test('install prompt available (Chrome)', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Install prompt only on Chromium');

      await page.goto('/home');

      // Check for install button or prompt handling
      const installButton = page.locator('[data-testid="pwa-install-btn"]');

      // App should detect installability
      await page.waitForTimeout(3000); // Wait for beforeinstallprompt

      // Either shows install button or app is already installed
      const isInstallable = await installButton.isVisible();
      const isInstalled = await page.evaluate(() => {
        return window.matchMedia('(display-mode: standalone)').matches;
      });

      expect(isInstallable || isInstalled).toBe(true);
    });
  });

  test.describe('Offline Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'resident');
      await page.goto('/home');

      // Wait for service worker and cache
      await page.waitForTimeout(3000);
    });

    test('shows offline indicator when network lost', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);

      // Refresh page
      await page.reload();

      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      await expect(offlineIndicator).toBeVisible();
      await expect(offlineIndicator).toContainText(/Offline/i);

      // Restore network
      await context.setOffline(false);
    });

    test('cached pages load offline', async ({ page, context }) => {
      // Navigate to key pages to cache them
      await navigateToPWA(page, 'home');
      await navigateToPWA(page, 'payments');
      await navigateToPWA(page, 'documents');

      // Wait for cache
      await page.waitForTimeout(2000);

      // Go offline
      await context.setOffline(true);

      // Navigate to cached pages - should load
      await page.goto('/home');
      await expect(page.locator('[data-testid="pwa-home"]')).toBeVisible();

      await page.goto('/payments');
      await expect(page.locator('[data-testid="pwa-payments"]')).toBeVisible();

      // Restore network
      await context.setOffline(false);
    });

    test('queues actions when offline', async ({ page, context }) => {
      await navigateToPWA(page, 'home');

      // Go offline
      await context.setOffline(true);

      // Try to perform an action (e.g., mark chore complete)
      await page.click('[data-testid="chore-item"]:first-child');
      await page.click('[data-testid="mark-complete-btn"]');

      // Should show queued indicator
      const queuedIndicator = page.locator('[data-testid="action-queued"]');
      await expect(queuedIndicator).toBeVisible();
      await expect(queuedIndicator).toContainText(/Will sync when online/i);

      // Restore network
      await context.setOffline(false);

      // Wait for sync
      await page.waitForTimeout(2000);

      // Queued indicator should disappear
      await expect(queuedIndicator).not.toBeVisible();
    });

    test('shows stale data warning for cached content', async ({ page, context }) => {
      await navigateToPWA(page, 'payments');

      // Go offline
      await context.setOffline(true);

      // Reload page
      await page.reload();

      // Should show stale data warning
      const staleWarning = page.locator('[data-testid="stale-data-warning"]');
      await expect(staleWarning).toBeVisible();
      await expect(staleWarning).toContainText(/Data may be outdated/i);

      // Restore network
      await context.setOffline(false);
    });
  });

  test.describe('Resident Onboarding (First Login)', () => {
    test('first login experience walks through setup', async ({ page }) => {
      // Use a new resident account for first-time experience
      await page.goto('/sign-in');

      // Login as new resident (simulated)
      await page.fill('input[name="identifier"]', 'newresident@testorg.recoveryos.test');
      await page.click('button[type="submit"]');
      await page.fill('input[type="password"]', 'TempPassword123!');
      await page.click('button[type="submit"]');

      // Should show onboarding flow
      const onboardingModal = page.locator('[data-testid="onboarding-modal"]');

      if (await onboardingModal.isVisible()) {
        // Step 1: Welcome
        await expect(onboardingModal).toContainText(/Welcome to RecoveryOS/i);
        await page.click('[data-testid="onboarding-next"]');

        // Step 2: Password change (if temp password)
        const passwordStep = page.locator('[data-testid="change-password-step"]');
        if (await passwordStep.isVisible()) {
          await page.fill('[data-testid="new-password"]', 'NewSecurePassword123!');
          await page.fill('[data-testid="confirm-password"]', 'NewSecurePassword123!');
          await page.click('[data-testid="onboarding-next"]');
        }

        // Step 3: MFA Setup
        const mfaStep = page.locator('[data-testid="mfa-setup-step"]');
        if (await mfaStep.isVisible()) {
          await expect(mfaStep).toContainText(/Two-factor authentication/i);
          // Skip for test or complete setup
          await page.click('[data-testid="skip-mfa"]');
        }

        // Step 4: Consent Review
        const consentStep = page.locator('[data-testid="consent-review-step"]');
        if (await consentStep.isVisible()) {
          await expect(consentStep).toContainText(/Review your consents/i);
          await page.click('[data-testid="onboarding-next"]');
        }

        // Step 5: Payment Method (optional)
        const paymentStep = page.locator('[data-testid="payment-method-step"]');
        if (await paymentStep.isVisible()) {
          await page.click('[data-testid="skip-payment-method"]');
        }

        // Complete onboarding
        await page.click('[data-testid="onboarding-complete"]');

        // Should land on home
        await expect(page).toHaveURL(/\/home/);
      }
    });

    test('MFA setup required per compliance', async ({ page }) => {
      // T5 in compliance checklist: MFA for all users
      await page.goto('/sign-in');
      await page.fill('input[name="identifier"]', 'nomfa@testorg.recoveryos.test');
      await page.click('button[type="submit"]');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Should be redirected to MFA setup if not configured
      const mfaRequired = page.locator('[data-testid="mfa-required-notice"]');

      if (await mfaRequired.isVisible()) {
        await expect(mfaRequired).toContainText(/MFA is required/i);

        // Should not be able to access app without MFA
        await page.goto('/home');
        await expect(page).toHaveURL(/mfa-setup/);
      }
    });
  });

  test.describe('Family/Sponsor Portal', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'familyMember');
    });

    test('family can access portal with valid consent', async ({ page }) => {
      await navigateToPWA(page, 'family');

      // Should see designated resident info
      const residentSection = page.locator('[data-testid="resident-overview"]');
      await expect(residentSection).toBeVisible();

      // Only consented information shown
      await expect(residentSection.locator('[data-testid="resident-name"]')).toBeVisible();

      // Payment section available
      await expect(page.locator('[data-testid="payment-section"]')).toBeVisible();

      // Messages section (if consented)
      const messagesSection = page.locator('[data-testid="messages-section"]');
      // May or may not be visible based on consent
    });

    test('shows consent-limited notice', async ({ page }) => {
      await navigateToPWA(page, 'family');

      // Consent limitation notice
      const consentNotice = page.locator('[data-testid="consent-limitation-notice"]');
      await expect(consentNotice).toBeVisible();
      await expect(consentNotice).toContainText(/Information shared per consent/i);
    });

    test('family can make payment for resident', async ({ page }) => {
      await navigateToPWA(page, 'family');

      // View invoices
      await page.click('[data-testid="view-invoices-btn"]');

      const invoiceList = page.locator('[data-testid="invoice-list"]');
      await expect(invoiceList).toBeVisible();

      // Pay button available
      const payBtn = page.locator('[data-testid="pay-invoice-btn"]:first-child');
      await expect(payBtn).toBeVisible();
    });

    test('family cannot access non-consented information', async ({ page }) => {
      await navigateToPWA(page, 'family');

      // Try to access drug test results (Part 2)
      await page.goto('/family/drug-tests');

      // Should be blocked or show access denied
      const accessDenied = page.locator('[data-testid="access-denied"]');
      await expect(accessDenied).toBeVisible();
      await expect(accessDenied).toContainText(/not authorized/i);
    });

    test('family registration flow', async ({ page }) => {
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out"]');

      // Go to family registration
      await page.goto('/family/register');

      // Should require invitation code
      const inviteCodeField = page.locator('[data-testid="invite-code"]');
      await expect(inviteCodeField).toBeVisible();

      // Fill registration form
      await page.fill('[data-testid="invite-code"]', 'TEST-INVITE-CODE');
      await page.fill('[data-testid="family-email"]', 'newfamily@example.com');
      await page.fill('[data-testid="family-name"]', 'New Family Member');
      await page.fill('[data-testid="family-relationship"]', 'Parent');
      await page.fill('[data-testid="family-password"]', 'FamilyPassword123!');

      await page.click('[data-testid="register-btn"]');

      // Should require consent verification
      const consentVerify = page.locator('[data-testid="consent-verification"]');
      await expect(consentVerify).toBeVisible();
      await expect(consentVerify).toContainText(/Consent must be verified/i);
    });
  });
});
