import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for RecoveryOS
 * Sprint 20: Launch Prep
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Timeout configuration aligned with performance requirements
  timeout: 30000, // 30s per test
  expect: {
    timeout: 5000, // 5s for assertions
  },

  projects: [
    // Desktop CRM testing (desktop-first)
    {
      name: 'crm-chrome',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /crm\/.*\.spec\.ts/,
    },
    {
      name: 'crm-firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /crm\/.*\.spec\.ts/,
    },

    // PWA testing (mobile-first resident app)
    {
      name: 'pwa-mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /pwa\/.*\.spec\.ts/,
    },
    {
      name: 'pwa-ios-safari',
      use: { ...devices['iPhone 13'] },
      testMatch: /pwa\/.*\.spec\.ts/,
    },

    // Security tests (chrome only)
    {
      name: 'security',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /security\/.*\.spec\.ts/,
    },

    // Performance tests (chrome only)
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /performance\/.*\.spec\.ts/,
    },
  ],

  // Local dev server
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
