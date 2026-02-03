/**
 * Background service worker for the Mina wallet extension.
 *
 * This is the central hub that:
 * - Initializes the WASM module
 * - Handles messages from popup and content scripts
 * - Manages wallet state and cryptographic operations
 */

import { initWasm } from './lib/wasm';
import {
  getAccounts,
  getActiveAccount,
  setActiveAccount,
  createAccount,
  renameAccount,
  createWalletFromMnemonic,
  importWalletFromMnemonic,
} from './lib/accounts';
import {
  hasWallet,
  getActiveNetwork,
  setActiveNetwork,
  getConnectedSites,
  addConnectedSite,
  removeConnectedSite,
  isSiteConnected,
  updateLastActivity,
} from './lib/storage';
import { type BackgroundAction, VERSION } from './types';

// =============================================================================
// Session State (not persisted)
// =============================================================================

/**
 * Whether the wallet is currently unlocked.
 * This is in-memory only and resets when the service worker restarts.
 */
let isUnlocked = false;

/**
 * Decrypted mnemonic (only available when unlocked).
 * TODO: Use this for HD key derivation
 */
let _decryptedMnemonic: string | null = null;

/**
 * Get the decrypted mnemonic (for HD derivation).
 * Returns null if wallet is locked.
 */
function getMnemonic(): string | null {
  return _decryptedMnemonic;
}

// Prevent unused warning - will be used for HD derivation
void getMnemonic;

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the extension.
 */
async function initialize(): Promise<void> {
  console.log(`[Background] Mina Wallet Extension v${VERSION} starting...`);

  try {
    await initWasm();
    console.log('[Background] WASM initialized');
  } catch (err) {
    console.error('[Background] Failed to initialize WASM:', err);
  }

  console.log('[Background] Extension ready');
}

// Initialize on service worker start
initialize();

// =============================================================================
// Message Handlers
// =============================================================================

/**
 * Handle messages from popup and content scripts.
 */
async function handleMessage(
  message: BackgroundAction,
  _sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  console.log('[Background] Received message:', message.action);

  // Update activity timestamp
  await updateLastActivity();

  try {
    switch (message.action) {
      // =========================================================================
      // Wallet Lifecycle
      // =========================================================================

      case 'hasWallet':
        return { hasWallet: await hasWallet() };

      case 'isLocked':
        return { isLocked: !isUnlocked };

      case 'createWallet': {
        const account = await createWalletFromMnemonic(
          message.mnemonic,
          message.password,
        );
        _decryptedMnemonic = message.mnemonic;
        isUnlocked = true;
        return { success: true, account };
      }

      case 'importWallet': {
        const account = await importWalletFromMnemonic(
          message.mnemonic,
          message.password,
        );
        _decryptedMnemonic = message.mnemonic;
        isUnlocked = true;
        return { success: true, account };
      }

      case 'unlockWallet': {
        // TODO: Verify password and decrypt mnemonic
        const walletExists = await hasWallet();
        if (!walletExists) {
          return { success: false, error: 'No wallet found' };
        }

        // For now, just mark as unlocked
        // In production, verify password against stored hash
        isUnlocked = true;
        return { success: true };
      }

      case 'lockWallet':
        isUnlocked = false;
        _decryptedMnemonic = null;
        return { success: true };

      // =========================================================================
      // Account Management
      // =========================================================================

      case 'getAccounts': {
        const accounts = await getAccounts();
        return { accounts };
      }

      case 'getActiveAccount': {
        const account = await getActiveAccount();
        return { account };
      }

      case 'setActiveAccount': {
        await setActiveAccount(message.index);
        return { success: true };
      }

      case 'createAccount': {
        if (!isUnlocked) {
          return { success: false, error: 'Wallet is locked' };
        }
        const account = await createAccount(message.name);
        return { success: true, account };
      }

      case 'renameAccount': {
        await renameAccount(message.index, message.name);
        return { success: true };
      }

      case 'exportPrivateKey': {
        if (!isUnlocked) {
          return { success: false, error: 'Wallet is locked' };
        }
        // TODO: Implement private key export
        // This requires decrypting the mnemonic and deriving the key
        return { success: false, error: 'Not implemented' };
      }

      // =========================================================================
      // Network
      // =========================================================================

      case 'getNetwork': {
        const network = await getActiveNetwork();
        return { network };
      }

      case 'switchNetwork': {
        await setActiveNetwork(message.networkId);
        return { success: true };
      }

      // =========================================================================
      // Connected Sites
      // =========================================================================

      case 'getConnectedSites': {
        const sites = await getConnectedSites();
        return { sites };
      }

      case 'connectSite': {
        if (!isUnlocked) {
          return { success: false, error: 'Wallet is locked' };
        }
        await addConnectedSite(message.origin, message.name);
        return { success: true };
      }

      case 'disconnectSite': {
        await removeConnectedSite(message.origin);
        return { success: true };
      }

      case 'isConnected': {
        const connected = await isSiteConnected(message.origin);
        return { connected };
      }

      // =========================================================================
      // Blockchain Operations (placeholders)
      // =========================================================================

      case 'getBalance':
        // TODO: Implement GraphQL query
        return { balance: '0' };

      case 'getTransactions':
        // TODO: Implement GraphQL query
        return { transactions: [] };

      case 'sendPayment':
        // TODO: Implement payment signing and broadcast
        return { success: false, error: 'Not implemented' };

      case 'sendDelegation':
        // TODO: Implement delegation signing and broadcast
        return { success: false, error: 'Not implemented' };

      case 'signMessage':
        // TODO: Implement message signing
        return { success: false, error: 'Not implemented' };

      case 'signFields':
        // TODO: Implement field signing for zkApps
        return { success: false, error: 'Not implemented' };

      default:
        console.warn('[Background] Unknown action:', (message as { action: string }).action);
        return { success: false, error: 'Unknown action' };
    }
  } catch (err) {
    console.error('[Background] Error handling message:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Message Listeners
// =============================================================================

/**
 * Listen for messages from popup and content scripts.
 */
chrome.runtime.onMessage.addListener(
  (
    message: BackgroundAction,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    // Handle the message asynchronously
    handleMessage(message, sender)
      .then(sendResponse)
      .catch(err => {
        console.error('[Background] Message handler error:', err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

    // Return true to indicate we'll send a response asynchronously
    return true;
  },
);

/**
 * Listen for external messages (from websites via content script).
 */
chrome.runtime.onMessageExternal.addListener(
  (
    message: { action: string; [key: string]: unknown },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    const origin = sender.origin ?? sender.url ?? 'unknown';
    console.log('[Background] External message from:', origin, message);

    // Handle Mina Provider API requests
    // These come from websites through the injected provider
    handleExternalMessage(message, origin)
      .then(sendResponse)
      .catch(err => {
        console.error('[Background] External message error:', err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

    return true;
  },
);

/**
 * Handle external messages (Mina Provider API).
 */
async function handleExternalMessage(
  message: { action: string; [key: string]: unknown },
  origin: string,
): Promise<unknown> {
  switch (message.action) {
    case 'mina_requestAccounts': {
      // Check if site is already connected
      const connected = await isSiteConnected(origin);
      if (!connected) {
        // TODO: Open popup to request connection approval
        return { error: 'User rejected connection' };
      }

      if (!isUnlocked) {
        return { error: 'Wallet is locked' };
      }

      const account = await getActiveAccount();
      return { accounts: account ? [account.address] : [] };
    }

    case 'mina_accounts': {
      const connected = await isSiteConnected(origin);
      if (!connected || !isUnlocked) {
        return { accounts: [] };
      }

      const account = await getActiveAccount();
      return { accounts: account ? [account.address] : [] };
    }

    case 'mina_getBalance': {
      // TODO: Implement
      return { balance: '0' };
    }

    case 'mina_chainId': {
      const network = await getActiveNetwork();
      return { chainId: network.id };
    }

    default:
      return { error: `Unknown method: ${message.action}` };
  }
}

// =============================================================================
// Extension Events
// =============================================================================

/**
 * Handle extension installation/update.
 */
chrome.runtime.onInstalled.addListener(details => {
  console.log('[Background] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // First install - could open onboarding page
    console.log('[Background] First install');
  } else if (details.reason === 'update') {
    console.log('[Background] Updated from version:', details.previousVersion);
  }
});

/**
 * Handle service worker startup.
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Service worker started');
  // Wallet starts locked after restart
  isUnlocked = false;
  _decryptedMnemonic = null;
});
