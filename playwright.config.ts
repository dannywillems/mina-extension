import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Mina wallet extension e2e tests.
 *
 * Tests run against Chromium with the extension loaded.
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // Extensions require sequential execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for extension tests
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        // Load the extension in Chromium
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve(__dirname, 'extension/dist')}`,
            `--load-extension=${path.resolve(__dirname, 'extension/dist')}`,
            '--no-sandbox',
          ],
          headless: false, // Extensions don't work in headless mode
        },
      },
    },
  ],

  // Build extension before running tests
  webServer: {
    command: 'make extension-build',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
