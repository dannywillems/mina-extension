/**
 * Popup script for the Mina wallet extension.
 *
 * This is the main UI that users interact with when clicking the extension icon.
 */

import { type Account, type Network, VERSION } from './types';

// =============================================================================
// DOM Elements
// =============================================================================

const elements = {
  // Views
  loadingView: document.getElementById('loading-view') as HTMLDivElement,
  lockedView: document.getElementById('locked-view') as HTMLDivElement,
  setupView: document.getElementById('setup-view') as HTMLDivElement,
  mainView: document.getElementById('main-view') as HTMLDivElement,

  // Locked view
  passwordInput: document.getElementById('password-input') as HTMLInputElement,
  unlockButton: document.getElementById('unlock-button') as HTMLButtonElement,
  unlockError: document.getElementById('unlock-error') as HTMLDivElement,

  // Setup view
  createWalletButton: document.getElementById(
    'create-wallet-button',
  ) as HTMLButtonElement,
  importWalletButton: document.getElementById(
    'import-wallet-button',
  ) as HTMLButtonElement,

  // Main view
  accountName: document.getElementById('account-name') as HTMLSpanElement,
  accountAddress: document.getElementById(
    'account-address',
  ) as HTMLSpanElement,
  accountBalance: document.getElementById(
    'account-balance',
  ) as HTMLSpanElement,
  networkBadge: document.getElementById('network-badge') as HTMLSpanElement,

  // Actions
  sendButton: document.getElementById('send-button') as HTMLButtonElement,
  receiveButton: document.getElementById('receive-button') as HTMLButtonElement,
  stakeButton: document.getElementById('stake-button') as HTMLButtonElement,

  // Footer
  lockButton: document.getElementById('lock-button') as HTMLButtonElement,
  settingsButton: document.getElementById(
    'settings-button',
  ) as HTMLButtonElement,
  versionText: document.getElementById('version-text') as HTMLSpanElement,
};

// =============================================================================
// State
// =============================================================================

let currentAccount: Account | null = null;
let currentNetwork: Network | null = null;

// =============================================================================
// View Management
// =============================================================================

type ViewName = 'loading' | 'locked' | 'setup' | 'main';

function showView(view: ViewName): void {
  elements.loadingView.classList.add('hidden');
  elements.lockedView.classList.add('hidden');
  elements.setupView.classList.add('hidden');
  elements.mainView.classList.add('hidden');

  switch (view) {
    case 'loading':
      elements.loadingView.classList.remove('hidden');
      break;
    case 'locked':
      elements.lockedView.classList.remove('hidden');
      elements.passwordInput.focus();
      break;
    case 'setup':
      elements.setupView.classList.remove('hidden');
      break;
    case 'main':
      elements.mainView.classList.remove('hidden');
      break;
  }
}

// =============================================================================
// Background Communication
// =============================================================================

async function sendMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response as T);
      }
    });
  });
}

// =============================================================================
// Initialization
// =============================================================================

async function initialize(): Promise<void> {
  console.log('[Popup] Initializing...');
  showView('loading');

  // Set version
  elements.versionText.textContent = `v${VERSION}`;

  try {
    // Check if wallet exists
    const { hasWallet } = await sendMessage<{ hasWallet: boolean }>({
      action: 'hasWallet',
    });

    if (!hasWallet) {
      showView('setup');
      return;
    }

    // Check if wallet is locked
    const { isLocked } = await sendMessage<{ isLocked: boolean }>({
      action: 'isLocked',
    });

    if (isLocked) {
      showView('locked');
      return;
    }

    // Wallet is unlocked - load data
    await loadWalletData();
    showView('main');
  } catch (err) {
    console.error('[Popup] Initialization error:', err);
    showView('setup');
  }
}

async function loadWalletData(): Promise<void> {
  // Get active account
  const { account } = await sendMessage<{ account: Account | null }>({
    action: 'getActiveAccount',
  });

  if (account) {
    currentAccount = account;
    updateAccountDisplay();
  }

  // Get network
  const { network } = await sendMessage<{ network: Network }>({
    action: 'getNetwork',
  });

  if (network) {
    currentNetwork = network;
    updateNetworkDisplay();
  }

  // TODO: Fetch balance
}

// =============================================================================
// UI Updates
// =============================================================================

function updateAccountDisplay(): void {
  if (!currentAccount) return;

  elements.accountName.textContent = currentAccount.name;

  // Truncate address for display
  const addr = currentAccount.address;
  elements.accountAddress.textContent = `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  elements.accountAddress.title = addr;
}

function updateNetworkDisplay(): void {
  if (!currentNetwork) return;

  elements.networkBadge.textContent = currentNetwork.name;
  elements.networkBadge.className = `network-badge ${currentNetwork.id}`;
}

function showError(element: HTMLElement, message: string): void {
  element.textContent = message;
  element.classList.remove('hidden');
}

function clearError(element: HTMLElement): void {
  element.textContent = '';
  element.classList.add('hidden');
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleUnlock(): Promise<void> {
  const password = elements.passwordInput.value;

  if (!password) {
    showError(elements.unlockError, 'Please enter your password');
    return;
  }

  clearError(elements.unlockError);
  elements.unlockButton.disabled = true;

  try {
    const { success, error } = await sendMessage<{
      success: boolean;
      error?: string;
    }>({
      action: 'unlockWallet',
      password,
    });

    if (success) {
      elements.passwordInput.value = '';
      await loadWalletData();
      showView('main');
    } else {
      showError(elements.unlockError, error ?? 'Failed to unlock wallet');
    }
  } catch (err) {
    showError(
      elements.unlockError,
      err instanceof Error ? err.message : 'Unknown error',
    );
  } finally {
    elements.unlockButton.disabled = false;
  }
}

async function handleLock(): Promise<void> {
  try {
    await sendMessage({ action: 'lockWallet' });
    showView('locked');
  } catch (err) {
    console.error('[Popup] Lock error:', err);
  }
}

function handleCreateWallet(): void {
  // TODO: Open onboarding page
  chrome.tabs.create({
    url: chrome.runtime.getURL('pages/onboarding.html'),
  });
  window.close();
}

function handleImportWallet(): void {
  // TODO: Open import page
  chrome.tabs.create({
    url: chrome.runtime.getURL('pages/onboarding.html?import=true'),
  });
  window.close();
}

function handleSend(): void {
  // TODO: Open send page
  console.log('[Popup] Send clicked');
}

function handleReceive(): void {
  // TODO: Show receive modal with QR code
  if (currentAccount) {
    navigator.clipboard.writeText(currentAccount.address);
    console.log('[Popup] Address copied to clipboard');
  }
}

function handleStake(): void {
  // TODO: Open stake page
  console.log('[Popup] Stake clicked');
}

function handleSettings(): void {
  // TODO: Open settings page
  console.log('[Popup] Settings clicked');
}

// =============================================================================
// Event Listeners
// =============================================================================

// Unlock
elements.unlockButton.addEventListener('click', handleUnlock);
elements.passwordInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    handleUnlock();
  }
});

// Setup
elements.createWalletButton.addEventListener('click', handleCreateWallet);
elements.importWalletButton.addEventListener('click', handleImportWallet);

// Main actions
elements.sendButton.addEventListener('click', handleSend);
elements.receiveButton.addEventListener('click', handleReceive);
elements.stakeButton.addEventListener('click', handleStake);

// Footer
elements.lockButton.addEventListener('click', handleLock);
elements.settingsButton.addEventListener('click', handleSettings);

// =============================================================================
// Start
// =============================================================================

document.addEventListener('DOMContentLoaded', initialize);
