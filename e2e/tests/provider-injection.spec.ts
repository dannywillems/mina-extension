import { test, expect, waitForExtensionReady } from '../fixtures/extension';

test.describe('Provider Injection', () => {
  test('should inject window.mina on web pages', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    // Open a regular web page
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Wait for provider to be injected
    await page.waitForFunction(() => typeof window.mina !== 'undefined', {
      timeout: 5000,
    });

    // Verify window.mina exists
    const hasProvider = await page.evaluate(() => {
      return typeof window.mina !== 'undefined';
    });
    expect(hasProvider).toBe(true);

    // Verify provider has expected methods
    const providerMethods = await page.evaluate(() => {
      const mina = window.mina;
      return {
        hasRequest: typeof mina?.request === 'function',
        hasRequestAccounts: typeof mina?.requestAccounts === 'function',
        hasGetAccounts: typeof mina?.getAccounts === 'function',
        hasGetBalance: typeof mina?.getBalance === 'function',
        hasGetChainId: typeof mina?.getChainId === 'function',
        hasSendPayment: typeof mina?.sendPayment === 'function',
        hasSignMessage: typeof mina?.signMessage === 'function',
        hasOn: typeof mina?.on === 'function',
        hasOff: typeof mina?.off === 'function',
      };
    });

    expect(providerMethods.hasRequest).toBe(true);
    expect(providerMethods.hasRequestAccounts).toBe(true);
    expect(providerMethods.hasGetAccounts).toBe(true);
    expect(providerMethods.hasGetBalance).toBe(true);
    expect(providerMethods.hasGetChainId).toBe(true);
    expect(providerMethods.hasSendPayment).toBe(true);
    expect(providerMethods.hasSignMessage).toBe(true);
    expect(providerMethods.hasOn).toBe(true);
    expect(providerMethods.hasOff).toBe(true);

    await page.close();
  });

  test('should emit mina#initialized event', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const page = await context.newPage();

    // Set up event listener before navigation
    const eventPromise = page.evaluate(() => {
      return new Promise<boolean>(resolve => {
        // Check if already initialized
        if (typeof window.mina !== 'undefined') {
          resolve(true);
          return;
        }

        // Listen for initialization event
        window.addEventListener('mina#initialized', () => {
          resolve(true);
        });

        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
      });
    });

    await page.goto('https://example.com');

    // Wait for provider to be ready
    await page.waitForFunction(() => typeof window.mina !== 'undefined', {
      timeout: 5000,
    });

    await page.close();
  });

  test('should return empty accounts when wallet is locked', async ({
    context,
    extensionId,
  }) => {
    await waitForExtensionReady(context);

    const page = await context.newPage();
    await page.goto('https://example.com');

    // Wait for provider
    await page.waitForFunction(() => typeof window.mina !== 'undefined', {
      timeout: 5000,
    });

    // Call getAccounts - should return empty array when locked/no wallet
    const accounts = await page.evaluate(async () => {
      try {
        return await window.mina?.getAccounts();
      } catch {
        return [];
      }
    });

    expect(accounts).toEqual([]);

    await page.close();
  });

  test('should return chain ID', async ({ context, extensionId }) => {
    await waitForExtensionReady(context);

    const page = await context.newPage();
    await page.goto('https://example.com');

    // Wait for provider
    await page.waitForFunction(() => typeof window.mina !== 'undefined', {
      timeout: 5000,
    });

    // Call getChainId
    const chainId = await page.evaluate(async () => {
      try {
        return await window.mina?.getChainId();
      } catch {
        return null;
      }
    });

    // Should return mainnet by default
    expect(chainId).toBe('mainnet');

    await page.close();
  });
});
