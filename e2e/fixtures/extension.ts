import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Extended test fixture that provides access to the extension context.
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const pathToExtension = path.resolve(__dirname, '../../extension/dist');

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox',
      ],
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Wait for the service worker to be registered
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    // Extract extension ID from the service worker URL
    // URL format: chrome-extension://<extension-id>/js/background.js
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;

/**
 * Helper to open the extension popup in a new page.
 */
export async function openPopup(
  context: BrowserContext,
  extensionId: string,
): Promise<ReturnType<BrowserContext['newPage']>> {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return popup;
}

/**
 * Helper to wait for the extension to initialize.
 */
export async function waitForExtensionReady(
  context: BrowserContext,
): Promise<void> {
  // Wait for service worker
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  // Give the WASM module time to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
}
