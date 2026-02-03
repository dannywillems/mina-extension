import { test, expect, openPopup, waitForExtensionReady } from '../fixtures/extension';

test.describe('Extension Loading', () => {
  test('should load the extension and register service worker', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    // Verify extension ID is valid
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]{32}$/);

    // Verify service worker is running
    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);

    const backgroundWorker = serviceWorkers.find(sw =>
      sw.url().includes(extensionId),
    );
    expect(backgroundWorker).toBeTruthy();
  });

  test('should open popup without errors', async ({ context, extensionId }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Check popup loaded
    await expect(popup).toHaveTitle('Mina Wallet');

    // Check header is visible
    const header = popup.locator('.header');
    await expect(header).toBeVisible();

    // Check logo text
    const logoText = popup.locator('.logo-text');
    await expect(logoText).toHaveText('Mina Wallet');

    await popup.close();
  });

  test('should show setup view when no wallet exists', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Wait for loading to complete
    await popup.waitForSelector('#setup-view:not(.hidden)', { timeout: 10000 });

    // Should show setup view (no wallet created yet)
    const setupView = popup.locator('#setup-view');
    await expect(setupView).toBeVisible();

    // Check welcome message
    const welcomeText = popup.locator('.setup-content h2');
    await expect(welcomeText).toHaveText('Welcome to Mina Wallet');

    // Check buttons are visible
    const createButton = popup.locator('#create-wallet-button');
    const importButton = popup.locator('#import-wallet-button');
    await expect(createButton).toBeVisible();
    await expect(importButton).toBeVisible();

    await popup.close();
  });

  test('should display version in footer', async ({ context, extensionId }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Wait for loading to complete
    await popup.waitForSelector('#setup-view:not(.hidden)', { timeout: 10000 });

    // Check version text
    const versionText = popup.locator('#version-text');
    await expect(versionText).toBeVisible();
    await expect(versionText).toHaveText(/^v\d+\.\d+\.\d+$/);

    await popup.close();
  });
});
