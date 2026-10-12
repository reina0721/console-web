import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: false,
  workers: 1,
  // New and changed goldens both require explicit human review.
  updateSnapshots: 'none',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    colorScheme: 'light',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Existing product regression flows start with a normal persisted demo session.
    // Authentication tests explicitly override this with an empty browser context.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://127.0.0.1:4173',
          localStorage: [
            {
              name: 'community-go.auth-mock',
              value: JSON.stringify({
                version: 1,
                state: {
                  accounts: [],
                  session: {
                    user: { id: 'mock-demo', name: 'Rin', email: 'demo@community.test' },
                    expiresAt: Date.now() + 7_200_000,
                  },
                },
              }),
            },
            {
              name: 'community-go.auth-owner',
              value: JSON.stringify({ version: 1, state: { userId: 'mock-demo' } }),
            },
          ],
        },
      ],
    },
  },
  webServer: [
    {
      command: 'pnpm --filter @community-go/web dev',
      env: { NEXT_DIST_DIR: '.next', NEXT_PUBLIC_AUTH_MODE: 'mock' },
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @community-go/web exec next dev --hostname 127.0.0.1 --port 4174',
      env: {
        NEXT_DIST_DIR: '.next/backend-contract',
        NEXT_PUBLIC_AUTH_MODE: 'backend',
        NEXT_PUBLIC_AUTH_API_BASE_URL: '/api',
      },
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/*-backend.spec.ts',
      use: { browserName: 'chromium' },
    },
    {
      name: 'backend-contract',
      testMatch: '**/*-backend.spec.ts',
      use: {
        browserName: 'chromium',
        baseURL: 'http://127.0.0.1:4174',
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  outputDir: 'test-results/playwright',
});
