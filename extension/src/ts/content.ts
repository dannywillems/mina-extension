/**
 * Content script for the Mina wallet extension.
 *
 * This script runs in the context of web pages and:
 * - Injects the inpage provider script (window.mina)
 * - Relays messages between the page and the background script
 */

// =============================================================================
// Provider Injection
// =============================================================================

/**
 * Inject the inpage provider script into the page context.
 *
 * The inpage script creates window.mina which websites use to interact
 * with the wallet.
 */
function injectProvider(): void {
  // Create a script element that loads our inpage.js
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('js/inpage.js');
  script.type = 'text/javascript';

  // Inject as early as possible
  const target = document.head || document.documentElement;
  target.insertBefore(script, target.firstChild);

  // Remove the script element after it loads (it's already executed)
  script.onload = () => {
    script.remove();
  };

  console.log('[Content] Mina provider injected');
}

// Inject the provider immediately
injectProvider();

// =============================================================================
// Message Relay
// =============================================================================

/**
 * Relay messages from the page to the background script.
 *
 * The inpage script posts messages to the window, which we receive here
 * and forward to the background script via chrome.runtime.sendMessage.
 */
window.addEventListener('message', async event => {
  // Only accept messages from the same window
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  // Only handle Mina provider messages
  if (!message || message.type !== 'MINA_PROVIDER_REQUEST') {
    return;
  }

  console.log('[Content] Received provider request:', message);

  try {
    // Forward to background script
    const response = await chrome.runtime.sendMessage({
      action: message.method,
      ...message.params,
    });

    // Send response back to the page
    window.postMessage(
      {
        type: 'MINA_PROVIDER_RESPONSE',
        id: message.id,
        result: response,
      },
      '*',
    );
  } catch (err) {
    console.error('[Content] Error forwarding message:', err);

    window.postMessage(
      {
        type: 'MINA_PROVIDER_RESPONSE',
        id: message.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      '*',
    );
  }
});

// =============================================================================
// Connection Status
// =============================================================================

/**
 * Notify the page when the extension is ready.
 */
window.postMessage(
  {
    type: 'MINA_PROVIDER_READY',
  },
  '*',
);

console.log('[Content] Mina wallet content script loaded');
