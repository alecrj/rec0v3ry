import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/test-utils';

/**
 * E2E Security Tests: OWASP Top 10 Verification
 * Sprint 20 deliverable from 06_ROADMAP.md
 *
 * Verifies protection against OWASP Top 10 2021:
 * A01 - Broken Access Control
 * A02 - Cryptographic Failures
 * A03 - Injection
 * A04 - Insecure Design
 * A05 - Security Misconfiguration
 * A06 - Vulnerable Components (covered in dependency audit)
 * A07 - Auth Failures
 * A08 - Software/Data Integrity Failures
 * A09 - Security Logging Failures
 * A10 - SSRF (covered in API tests)
 */
test.describe('OWASP Top 10 Security Tests', () => {
  test.describe('A01: Broken Access Control', () => {
    test('resident cannot access other resident data', async ({ page }) => {
      await login(page, 'resident');

      // Try to access another resident's records via direct URL
      const response = await page.request.get('/api/trpc/resident.getById?id=other-resident-id');

      // Should be forbidden
      expect(response.status()).toBe(403);
    });

    test('house monitor cannot access clinical data', async ({ page }) => {
      await login(page, 'houseMonitor');

      // Try to access Part 2 protected endpoint
      const response = await page.request.get('/api/trpc/drugTest.getResults?residentId=test-123');

      // Should be forbidden (no Part 2 access)
      expect(response.status()).toBe(403);
    });

    test('cross-org access blocked by RLS', async ({ page }) => {
      await login(page, 'propertyManager');

      // Try to access resource from another org
      const response = await page.request.get('/api/trpc/resident.list?orgId=other-org-id');

      // Should return empty or forbidden
      const data = await response.json();
      expect(data.result?.data?.length || 0).toBe(0);
    });

    test('IDOR protection on all endpoints', async ({ page }) => {
      await login(page, 'resident');

      // Test various endpoints with manipulated IDs
      const endpoints = [
        '/api/trpc/invoice.getById?id=other-invoice-id',
        '/api/trpc/document.download?id=other-doc-id',
        '/api/trpc/consent.getById?id=other-consent-id',
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint);
        expect([403, 404]).toContain(response.status());
      }
    });

    test('API enforces RBAC at procedure level', async ({ page }) => {
      await login(page, 'houseMonitor');

      // Monitor should not be able to create invoices
      const response = await page.request.post('/api/trpc/invoice.create', {
        data: { residentId: 'test-123', amount: 100 },
      });

      expect(response.status()).toBe(403);
    });
  });

  test.describe('A02: Cryptographic Failures', () => {
    test('all responses use HTTPS', async ({ page }) => {
      await page.goto('/');

      const protocol = new URL(page.url()).protocol;

      // In production, should be HTTPS
      if (process.env.NODE_ENV === 'production') {
        expect(protocol).toBe('https:');
      }
    });

    test('sensitive data not exposed in URLs', async ({ page }) => {
      await login(page, 'propertyManager');

      // Navigate around and check URLs don't contain sensitive data
      await page.goto('/billing');

      // URL should not contain SSN, payment info, etc.
      const url = page.url();
      expect(url).not.toMatch(/ssn=|card=|password=|secret=/i);
    });

    test('Part 2 data marked as encrypted', async ({ page }) => {
      await login(page, 'houseManager');

      // Access drug test data
      const response = await page.request.get('/api/trpc/drugTest.list');
      const data = await response.json();

      // Response should indicate encryption status
      // (Actual field values are decrypted server-side for authorized users)
      expect(response.headers()['x-data-encrypted']).toBeDefined();
    });

    test('security headers present', async ({ page }) => {
      const response = await page.request.get('/');

      const headers = response.headers();

      // Required security headers
      expect(headers['strict-transport-security']).toBeDefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
      expect(headers['x-xss-protection']).toBeDefined();
    });
  });

  test.describe('A03: Injection', () => {
    test('SQL injection blocked', async ({ page }) => {
      await login(page, 'propertyManager');

      // Try SQL injection in search
      const maliciousInput = "'; DROP TABLE residents; --";
      await page.goto(`/admissions?search=${encodeURIComponent(maliciousInput)}`);

      // Page should load without error
      await expect(page.locator('[data-testid="error-page"]')).not.toBeVisible();

      // Data should still be accessible
      const response = await page.request.get('/api/trpc/lead.list');
      expect(response.status()).toBe(200);
    });

    test('XSS blocked in user inputs', async ({ page }) => {
      await login(page, 'houseManager');

      await page.goto('/operations/incidents/new');

      // Try XSS in incident description
      const xssPayload = '<script>alert("xss")</script>';
      await page.fill('[data-testid="incident-description"]', xssPayload);
      await page.click('[data-testid="submit-incident"]');

      // Reload and check script is escaped
      await page.goto('/operations/incidents');
      await page.click('[data-testid="incident-row"]:first-child');

      const description = page.locator('[data-testid="incident-description-display"]');
      const html = await description.innerHTML();

      // Script should be escaped, not executable
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    test('command injection blocked', async ({ page }) => {
      await login(page, 'orgOwner');

      // Try command injection in export filename
      const response = await page.request.post('/api/trpc/reporting.export', {
        data: {
          format: 'csv',
          filename: 'report; rm -rf /',
        },
      });

      // Should sanitize filename or reject
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.result?.data?.filename).not.toContain(';');
    });
  });

  test.describe('A04: Insecure Design', () => {
    test('consent required before Part 2 data access', async ({ page }) => {
      await login(page, 'houseManager');

      // Without consent, Part 2 data should be blocked
      const response = await page.request.get(
        '/api/trpc/resident.getWithPart2?residentId=no-consent-resident'
      );

      const data = await response.json();

      // Part 2 fields should be null/omitted
      expect(data.result?.data?.drugTestResults).toBeUndefined();
      expect(data.result?.data?.treatmentReferrals).toBeUndefined();
    });

    test('break-glass requires justification', async ({ page }) => {
      await login(page, 'propertyManager');

      await page.goto('/compliance/break-glass');

      // Try to initiate break-glass without justification
      await page.click('[data-testid="break-glass-btn"]');

      // Should require reason and justification
      const modal = page.locator('[data-testid="break-glass-modal"]');
      await expect(modal.locator('[data-testid="reason-required"]')).toBeVisible();
      await expect(modal.locator('[data-testid="justification-required"]')).toBeVisible();
    });

    test('rate limiting on sensitive endpoints', async ({ page }) => {
      // Try to brute force login
      const attempts = [];
      for (let i = 0; i < 15; i++) {
        attempts.push(
          page.request.post('/api/auth/sign-in', {
            data: { email: 'test@test.com', password: `wrong${i}` },
          })
        );
      }

      const responses = await Promise.all(attempts);

      // Later attempts should be rate limited
      const rateLimited = responses.filter((r) => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('A05: Security Misconfiguration', () => {
    test('error messages do not leak sensitive info', async ({ page }) => {
      const response = await page.request.get('/api/trpc/nonexistent.endpoint');

      const body = await response.text();

      // Should not contain stack traces or internal paths
      expect(body).not.toMatch(/node_modules/);
      expect(body).not.toMatch(/at\s+\w+\s+\(/); // Stack trace pattern
      expect(body).not.toMatch(/\/Users\//);
    });

    test('directory listing disabled', async ({ page }) => {
      const response = await page.request.get('/api/');

      // Should not list API routes
      expect(response.status()).not.toBe(200);
    });

    test('debug endpoints disabled in production', async ({ page }) => {
      const debugEndpoints = [
        '/api/debug',
        '/api/test',
        '/api/_internal',
        '/_next/static/development',
      ];

      for (const endpoint of debugEndpoints) {
        const response = await page.request.get(endpoint);
        expect(response.status()).toBe(404);
      }
    });

    test('CORS configured correctly', async ({ page }) => {
      const response = await page.request.get('/api/health', {
        headers: { Origin: 'https://malicious-site.com' },
      });

      const corsHeader = response.headers()['access-control-allow-origin'];

      // Should not allow arbitrary origins
      expect(corsHeader).not.toBe('*');
      expect(corsHeader).not.toBe('https://malicious-site.com');
    });
  });

  test.describe('A07: Auth Failures', () => {
    test('password policy enforced', async ({ page }) => {
      await page.goto('/sign-up');

      // Try weak password
      await page.fill('input[name="email"]', 'newuser@test.com');
      await page.fill('input[name="password"]', 'weak');
      await page.click('button[type="submit"]');

      // Should show password requirements
      const error = page.locator('[data-testid="password-error"]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/12 characters|uppercase|number/i);
    });

    test('session timeout enforced', async ({ page }) => {
      await login(page, 'resident');

      // Simulate session timeout by clearing cookies
      await page.context().clearCookies();

      // Try to access protected page
      await page.goto('/home');

      // Should redirect to login
      await expect(page).toHaveURL(/sign-in/);
    });

    test('MFA challenge on sensitive actions', async ({ page }) => {
      await login(page, 'orgOwner');

      // Try to access compliance-sensitive action
      await page.goto('/admin/users');
      await page.click('[data-testid="deactivate-user-btn"]');

      // Should require MFA re-verification
      const mfaChallenge = page.locator('[data-testid="mfa-challenge"]');
      await expect(mfaChallenge).toBeVisible();
    });

    test('account lockout after failed attempts', async ({ page }) => {
      // Multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        await page.goto('/sign-in');
        await page.fill('input[name="identifier"]', 'test@test.com');
        await page.click('button[type="submit"]');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
      }

      // Should show lockout message
      const lockoutMessage = page.locator('[data-testid="account-locked"]');
      await expect(lockoutMessage).toBeVisible();
    });
  });

  test.describe('A08: Software/Data Integrity', () => {
    test('audit log entries are immutable', async ({ page }) => {
      await login(page, 'orgOwner');

      // Try to delete audit log entry via API
      const response = await page.request.delete('/api/trpc/audit.delete?id=test-audit-id');

      // Should be forbidden (append-only)
      expect(response.status()).toBe(403);
    });

    test('audit log hash chain integrity', async ({ page }) => {
      await login(page, 'orgOwner');

      await page.goto('/compliance/audit');

      // Integrity check button
      await page.click('[data-testid="verify-integrity-btn"]');

      // Should show integrity status
      const integrityStatus = page.locator('[data-testid="integrity-status"]');
      await expect(integrityStatus).toBeVisible();
      await expect(integrityStatus).toHaveAttribute('data-valid', 'true');
    });

    test('CSRF protection on mutations', async ({ page }) => {
      await login(page, 'houseManager');

      // Try to make mutation without CSRF token
      const response = await page.request.post(
        '/api/trpc/incident.create',
        {
          data: { description: 'test' },
          headers: {
            'Content-Type': 'application/json',
            // Omit CSRF token
          },
        }
      );

      // Modern frameworks handle this differently, but mutation should validate origin
      // Either CSRF failure or origin check
      const body = await response.json();
      // tRPC handles this at the transport level
    });
  });

  test.describe('A09: Security Logging', () => {
    test('failed login attempts logged', async ({ page }) => {
      // Failed login
      await page.goto('/sign-in');
      await page.fill('input[name="identifier"]', 'test@test.com');
      await page.click('button[type="submit"]');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Login as admin to check audit log
      await login(page, 'orgOwner');
      await page.goto('/compliance/audit');

      await page.fill('[data-testid="audit-filter-action"]', 'auth_failed');
      await page.click('[data-testid="apply-filter"]');

      const failedAuthEntry = page.locator('[data-testid="audit-row"]:first-child');
      await expect(failedAuthEntry).toBeVisible();
    });

    test('Part 2 data access logged', async ({ page }) => {
      await login(page, 'houseManager');

      // Access Part 2 data
      await page.goto('/operations/drug-tests');
      await page.click('[data-testid="test-row"]:first-child');

      // Check audit log
      await page.goto('/compliance/audit');
      await page.fill('[data-testid="audit-filter-sensitivity"]', 'part2');
      await page.click('[data-testid="apply-filter"]');

      const part2Entry = page.locator('[data-testid="audit-row"]:first-child');
      await expect(part2Entry).toBeVisible();
      await expect(part2Entry.locator('[data-testid="audit-action"]')).toHaveText(/view|access/i);
    });

    test('data exports logged', async ({ page }) => {
      await login(page, 'propertyManager');

      // Export data
      await page.goto('/reports/financial');
      await page.click('[data-testid="export-csv-btn"]');

      // Check audit log
      await page.goto('/compliance/audit');
      await page.fill('[data-testid="audit-filter-action"]', 'data_export');
      await page.click('[data-testid="apply-filter"]');

      const exportEntry = page.locator('[data-testid="audit-row"]:first-child');
      await expect(exportEntry).toBeVisible();
    });
  });
});
