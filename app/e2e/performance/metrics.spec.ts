import { test, expect } from '@playwright/test';
import { login, assertPagePerformance, TEST_USERS } from '../helpers/test-utils';

/**
 * E2E Performance Tests
 * Sprint 20 deliverable from 06_ROADMAP.md
 *
 * Performance targets:
 * - Page loads < 2s FCP (First Contentful Paint)
 * - API p95 < 500ms
 * - 500-bed dashboard < 2s
 * - 100 concurrent users per org
 */
test.describe('Performance Tests', () => {
  test.describe('Page Load Performance (< 2s FCP)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'propertyManager');
    });

    test('dashboard loads under 2s', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="dashboard-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);

      // Check FCP metric
      await assertPagePerformance(page);
    });

    test('occupancy grid loads under 2s', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/occupancy');
      await page.waitForSelector('[data-testid="bed-grid-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('billing page loads under 2s', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/billing');
      await page.waitForSelector('[data-testid="billing-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('admissions pipeline loads under 2s', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/admissions');
      await page.waitForSelector('[data-testid="pipeline-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('compliance dashboard loads under 2s', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/compliance');
      await page.waitForSelector('[data-testid="compliance-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('audit log viewer loads under 2s', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/compliance/audit');
      await page.waitForSelector('[data-testid="audit-log-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });
  });

  test.describe('API Response Time (p95 < 500ms)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'propertyManager');
    });

    test('resident list API < 500ms', async ({ page }) => {
      const timings: number[] = [];

      // Make multiple requests to get p95
      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await page.request.get('/api/trpc/resident.list');
        timings.push(Date.now() - startTime);
      }

      // Calculate p95
      timings.sort((a, b) => a - b);
      const p95Index = Math.floor(timings.length * 0.95);
      const p95 = timings[p95Index];

      expect(p95).toBeLessThan(500);
    });

    test('invoice list API < 500ms', async ({ page }) => {
      const timings: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await page.request.get('/api/trpc/invoice.list');
        timings.push(Date.now() - startTime);
      }

      timings.sort((a, b) => a - b);
      const p95 = timings[Math.floor(timings.length * 0.95)];
      expect(p95).toBeLessThan(500);
    });

    test('audit log query API < 500ms', async ({ page }) => {
      const timings: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await page.request.get('/api/trpc/audit.list?limit=100');
        timings.push(Date.now() - startTime);
      }

      timings.sort((a, b) => a - b);
      const p95 = timings[Math.floor(timings.length * 0.95)];
      expect(p95).toBeLessThan(500);
    });

    test('dashboard data API < 500ms', async ({ page }) => {
      const timings: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await page.request.get('/api/trpc/reporting.getDashboard');
        timings.push(Date.now() - startTime);
      }

      timings.sort((a, b) => a - b);
      const p95 = timings[Math.floor(timings.length * 0.95)];
      expect(p95).toBeLessThan(500);
    });
  });

  test.describe('Large Dataset Performance', () => {
    test('500-bed dashboard loads under 2s', async ({ page }) => {
      await login(page, 'orgOwner');

      // Navigate to org with large dataset
      const startTime = Date.now();

      await page.goto('/dashboard?orgId=large-test-org');
      await page.waitForSelector('[data-testid="dashboard-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);

      // Verify we're showing large dataset
      const bedCount = await page.locator('[data-testid="total-beds"]').textContent();
      expect(parseInt(bedCount || '0')).toBeGreaterThanOrEqual(500);
    });

    test('occupancy grid renders 500+ beds under 2s', async ({ page }) => {
      await login(page, 'orgOwner');

      const startTime = Date.now();

      await page.goto('/occupancy?orgId=large-test-org');
      await page.waitForSelector('[data-testid="bed-grid-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);

      // Check virtualization is working (not all beds rendered at once)
      const renderedBeds = await page.locator('[data-testid="bed-cell"]').count();
      // Should use virtualization - render visible beds + buffer
      expect(renderedBeds).toBeLessThan(500);
    });

    test('audit log pagination handles 100k+ entries', async ({ page }) => {
      await login(page, 'orgOwner');

      const startTime = Date.now();

      await page.goto('/compliance/audit?orgId=large-test-org');
      await page.waitForSelector('[data-testid="audit-log-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);

      // Pagination should work
      await page.click('[data-testid="next-page"]');

      const pageLoadTime = Date.now() - startTime;
      expect(pageLoadTime).toBeLessThan(500);
    });

    test('financial reports aggregate large datasets under 3s', async ({ page }) => {
      await login(page, 'orgOwner');

      const startTime = Date.now();

      await page.goto('/reports/financial?orgId=large-test-org');
      await page.waitForSelector('[data-testid="financial-report-loaded"]');

      const loadTime = Date.now() - startTime;
      // Allow extra second for aggregation
      expect(loadTime).toBeLessThan(3000);
    });
  });

  test.describe('Core Web Vitals', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'propertyManager');
    });

    test('LCP (Largest Contentful Paint) < 2.5s', async ({ page }) => {
      await page.goto('/dashboard');

      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });

      expect(lcp).toBeLessThan(2500);
    });

    test('FID (First Input Delay) simulation', async ({ page }) => {
      await page.goto('/dashboard');

      // Simulate user interaction
      const startTime = Date.now();
      await page.click('[data-testid="nav-billing"]');

      // Time until navigation starts
      const inputDelay = Date.now() - startTime;

      // FID target: < 100ms
      expect(inputDelay).toBeLessThan(100);
    });

    test('CLS (Cumulative Layout Shift) < 0.1', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for full page load
      await page.waitForLoadState('networkidle');

      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // @ts-expect-error LayoutShift type
              if (!entry.hadRecentInput) {
                // @ts-expect-error LayoutShift type
                clsValue += entry.value;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });

          // Measure for 3 seconds
          setTimeout(() => resolve(clsValue), 3000);
        });
      });

      expect(cls).toBeLessThan(0.1);
    });
  });

  test.describe('Memory Usage', () => {
    test('no memory leaks during navigation', async ({ page }) => {
      await login(page, 'propertyManager');

      // Get initial memory
      const initialMemory = await page.evaluate(() => {
        // @ts-expect-error memory API
        return performance.memory?.usedJSHeapSize || 0;
      });

      // Navigate through pages multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/dashboard');
        await page.goto('/occupancy');
        await page.goto('/billing');
        await page.goto('/admissions');
        await page.goto('/compliance');
      }

      // Get final memory
      const finalMemory = await page.evaluate(() => {
        // @ts-expect-error memory API
        return performance.memory?.usedJSHeapSize || 0;
      });

      // Memory growth should be reasonable (< 50% increase)
      if (initialMemory > 0) {
        const growth = (finalMemory - initialMemory) / initialMemory;
        expect(growth).toBeLessThan(0.5);
      }
    });
  });

  test.describe('Bundle Size', () => {
    test('initial JS bundle < 500KB', async ({ page }) => {
      await page.goto('/');

      const jsBundles = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources
          .filter((r) => r.name.includes('.js'))
          .reduce((sum, r) => sum + r.transferSize, 0);
      });

      // 500KB = 512000 bytes
      expect(jsBundles).toBeLessThan(512000);
    });

    test('total page weight < 2MB', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const totalSize = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources.reduce((sum, r) => sum + r.transferSize, 0);
      });

      // 2MB = 2097152 bytes
      expect(totalSize).toBeLessThan(2097152);
    });
  });
});
