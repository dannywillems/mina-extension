import { test, expect, openPopup, waitForExtensionReady } from '../fixtures/extension';

test.describe('Popup UI', () => {
  test('should have correct styling and layout', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Wait for loading to complete
    await popup.waitForSelector('#setup-view:not(.hidden)', { timeout: 10000 });

    // Check popup dimensions
    const container = popup.locator('.popup-container');
    await expect(container).toBeVisible();

    // Verify header layout
    const header = popup.locator('.header');
    await expect(header).toBeVisible();

    // Check network badge is visible
    const networkBadge = popup.locator('#network-badge');
    await expect(networkBadge).toBeVisible();
    await expect(networkBadge).toHaveText('Mainnet');

    // Check footer is visible
    const footer = popup.locator('.footer');
    await expect(footer).toBeVisible();

    // Check lock button in footer
    const lockButton = popup.locator('#lock-button');
    await expect(lockButton).toBeVisible();

    // Check settings button in footer
    const settingsButton = popup.locator('#settings-button');
    await expect(settingsButton).toBeVisible();

    await popup.close();
  });

  test('should show loading spinner initially', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Loading view should be visible initially (may be brief)
    // We check that it exists in the DOM
    const loadingView = popup.locator('#loading-view');
    await expect(loadingView).toBeAttached();

    // Wait for loading to complete
    await popup.waitForSelector('#setup-view:not(.hidden)', { timeout: 10000 });

    // After loading, should show setup view
    const setupView = popup.locator('#setup-view');
    await expect(setupView).toBeVisible();

    await popup.close();
  });

  test('create wallet button should open new tab', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Wait for loading to complete
    await popup.waitForSelector('#setup-view:not(.hidden)', { timeout: 10000 });

    // Click create wallet button
    const createButton = popup.locator('#create-wallet-button');
    await expect(createButton).toBeVisible();

    // Listen for new page before clicking
    const newPagePromise = context.waitForEvent('page');
    await createButton.click();

    // Wait for new page to open
    const newPage = await newPagePromise;

    // Wait for the page to load
    await newPage.waitForLoadState('domcontentloaded');

    // The new page should be the onboarding page
    const url = newPage.url();
    expect(url).toContain('pages/onboarding.html');
    expect(url).not.toContain('import=true');

    await newPage.close();
  });

  test('import wallet button should open new tab with import flag', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Wait for loading to complete
    await popup.waitForSelector('#setup-view:not(.hidden)', { timeout: 10000 });

    // Click import wallet button
    const importButton = popup.locator('#import-wallet-button');
    await expect(importButton).toBeVisible();

    // Listen for new page before clicking
    const newPagePromise = context.waitForEvent('page');
    await importButton.click();

    // Wait for new page to open
    const newPage = await newPagePromise;

    // Wait for the page to load
    await newPage.waitForLoadState('domcontentloaded');

    // The URL should have import=true query param
    const url = newPage.url();
    expect(url).toContain('pages/onboarding.html');
    expect(url).toContain('import=true');

    await newPage.close();
  });
});

test.describe('Popup UI - Network Badge', () => {
  test('should display mainnet badge with correct styling', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const popup = await openPopup(context, extensionId);

    // Wait for loading to complete
    await popup.waitForSelector('#setup-view:not(.hidden)', { timeout: 10000 });

    const networkBadge = popup.locator('#network-badge');
    await expect(networkBadge).toBeVisible();
    await expect(networkBadge).toHaveText('Mainnet');
    await expect(networkBadge).toHaveClass(/mainnet/);

    await popup.close();
  });
});
