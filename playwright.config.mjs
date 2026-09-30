import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'en-US',
    timezoneId: 'Europe/Istanbul',
    viewport: { width: 1000, height: 800 },
  },
  webServer: {
    command: 'node tools/serve.mjs 4173',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{
    name: 'chromium',
    use: {
      browserName: 'chromium',
      // Set PW_CHROMIUM_PATH to reuse a preinstalled Chromium instead of downloading one.
      launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    },
  }],
});
