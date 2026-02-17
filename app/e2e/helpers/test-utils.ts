import { Page, expect } from '@playwright/test';

/**
 * E2E Test Utilities for RecoveryOS
 * Sprint 20: Launch Prep
 */

// Test user credentials (seeded in test environment)
export const TEST_USERS = {
  orgOwner: {
    email: 'owner@testorg.recoveryos.test',
    password: 'TestPassword123!',
    role: 'org_owner',
  },
  propertyManager: {
    email: 'pm@testorg.recoveryos.test',
    password: 'TestPassword123!',
    role: 'property_manager',
  },
  houseManager: {
    email: 'hm@testorg.recoveryos.test',
    password: 'TestPassword123!',
    role: 'house_manager',
  },
  houseMonitor: {
    email: 'monitor@testorg.recoveryos.test',
    password: 'TestPassword123!',
    role: 'house_monitor',
  },
  resident: {
    email: 'resident@testorg.recoveryos.test',
    password: 'TestPassword123!',
    role: 'resident',
  },
  familyMember: {
    email: 'family@testorg.recoveryos.test',
    password: 'TestPassword123!',
    role: 'family_member',
  },
} as const;

/**
 * Login helper - authenticates via Clerk
 */
export async function login(
  page: Page,
  user: keyof typeof TEST_USERS
): Promise<void> {
  const { email, password } = TEST_USERS[user];

  await page.goto('/sign-in');
  await page.waitForSelector('[data-testid="email-input"], input[name="identifier"]');

  // Clerk sign-in flow
  await page.fill('input[name="identifier"]', email);
  await page.click('button[type="submit"]');

  await page.waitForSelector('input[type="password"], input[name="password"]');
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

/**
 * Logout helper
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="sign-out"]');
  await page.waitForURL('/sign-in');
}

/**
 * Navigate to CRM section
 */
export async function navigateToCRM(
  page: Page,
  section: string
): Promise<void> {
  await page.click(`[data-testid="nav-${section}"]`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to PWA section (resident app)
 */
export async function navigateToPWA(
  page: Page,
  section: string
): Promise<void> {
  await page.click(`[data-testid="pwa-nav-${section}"]`);
  await page.waitForLoadState('networkidle');
}

/**
 * Assert page loaded within performance target (2s FCP)
 */
export async function assertPagePerformance(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => {
    const entries = performance.getEntriesByType('paint') as PerformanceEntry[];
    const fcp = entries.find((e) => e.name === 'first-contentful-paint');
    return { fcp: fcp?.startTime || 0 };
  });

  expect(metrics.fcp).toBeLessThan(2000); // < 2s FCP target
}

/**
 * Wait for API response and assert timing
 */
export async function assertAPITiming(
  page: Page,
  urlPattern: RegExp,
  maxMs = 500
): Promise<void> {
  const startTime = Date.now();

  await page.waitForResponse((response) => urlPattern.test(response.url()));

  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(maxMs);
}

/**
 * Fill form fields by label
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    const input = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") + textarea, label:has-text("${label}") + select`);
    const tagName = await input.evaluate((el) => el.tagName.toLowerCase());

    if (tagName === 'select') {
      await input.selectOption(value);
    } else {
      await input.fill(value);
    }
  }
}

/**
 * Assert toast notification appears
 */
export async function assertToast(
  page: Page,
  message: string | RegExp
): Promise<void> {
  const toast = page.locator('[data-testid="toast"], [role="alert"]');
  await expect(toast).toContainText(message);
}

/**
 * Generate unique test data
 */
export function generateTestData(prefix: string) {
  const timestamp = Date.now();
  return {
    name: `${prefix}_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    phone: `555-${String(timestamp).slice(-7)}`,
  };
}

/**
 * Wait for consent banner and dismiss
 */
export async function dismissConsentBanner(page: Page): Promise<void> {
  const banner = page.locator('[data-testid="consent-banner"]');
  if (await banner.isVisible()) {
    await page.click('[data-testid="consent-accept"]');
  }
}

/**
 * Assert audit log entry was created
 * (Uses API to verify - compliance requirement)
 */
export async function assertAuditLogEntry(
  page: Page,
  action: string
): Promise<void> {
  // This would hit the audit log API to verify entry
  // Implementation depends on test environment setup
  const response = await page.request.get('/api/test/audit-log/latest');
  const data = await response.json();
  expect(data.action).toBe(action);
}

/**
 * PWA install prompt helper
 */
export async function triggerPWAInstall(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return new Promise<boolean>((resolve) => {
      window.addEventListener('beforeinstallprompt', () => {
        resolve(true);
      });

      // If no prompt after 3s, not installable
      setTimeout(() => resolve(false), 3000);
    });
  });
}

/**
 * Check service worker registration
 */
export async function checkServiceWorker(page: Page): Promise<boolean> {
  return await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration;
  });
}
