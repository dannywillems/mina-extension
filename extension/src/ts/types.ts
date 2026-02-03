/**
 * Core type definitions for the Mina wallet extension.
 */

// =============================================================================
// Wallet State
// =============================================================================

/**
 * Encrypted wallet data stored in chrome.storage.local.
 */
export interface EncryptedWallet {
  /** Encrypted mnemonic phrase */
  encryptedMnemonic: string;
  /** Salt used for key derivation */
  salt: string;
  /** IV used for encryption */
  iv: string;
  /** Accounts derived from the mnemonic */
  accounts: Account[];
  /** Index of the currently active account */
  activeAccountIndex: number;
}

/**
 * A single account in the wallet.
 */
export interface Account {
  /** HD derivation index (m/44'/12586'/0'/0/index) */
  index: number;
  /** User-defined account name */
  name: string;
  /** Mina address (B62...) */
  address: string;
  /** Public key in hex format */
  publicKeyHex: string;
  // Note: private key is derived on-demand from mnemonic, never stored
}

// =============================================================================
// Network Configuration
// =============================================================================

/**
 * Network configuration.
 */
export interface Network {
  id: 'mainnet' | 'devnet';
  name: string;
  graphqlUrl: string;
  explorerUrl: string;
}

/**
 * Available networks.
 */
export const NETWORKS: Record<string, Network> = {
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    graphqlUrl: 'https://api.minascan.io/node/mainnet/v1/graphql',
    explorerUrl: 'https://minascan.io/mainnet',
  },
  devnet: {
    id: 'devnet',
    name: 'Devnet',
    graphqlUrl: 'https://api.minascan.io/node/devnet/v1/graphql',
    explorerUrl: 'https://minascan.io/devnet',
  },
};

// =============================================================================
// Transaction Types
// =============================================================================

/**
 * Transaction record.
 */
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  /** Amount in nanomina as string */
  amount: string;
  /** Fee in nanomina as string */
  fee: string;
  memo?: string;
  nonce: number;
  kind: 'payment' | 'delegation';
  status: 'pending' | 'applied' | 'failed';
  timestamp?: number;
}

/**
 * Payment transaction payload for signing.
 */
export interface PaymentPayload {
  from: string;
  to: string;
  /** Amount in nanomina */
  amount: string;
  /** Fee in nanomina */
  fee: string;
  nonce: number;
  memo?: string;
  validUntil?: number;
}

/**
 * Delegation (staking) transaction payload for signing.
 */
export interface DelegationPayload {
  from: string;
  /** Validator/block producer address */
  to: string;
  /** Fee in nanomina */
  fee: string;
  nonce: number;
}

// =============================================================================
// Mina Provider API Types (for zkApp integration)
// =============================================================================

/**
 * Supported Mina Provider methods.
 */
export type MinaMethod =
  | 'mina_accounts'
  | 'mina_requestAccounts'
  | 'mina_getBalance'
  | 'mina_chainId'
  | 'mina_sendPayment'
  | 'mina_sendStakeDelegation'
  | 'mina_signMessage'
  | 'mina_verifyMessage'
  | 'mina_signFields'
  | 'mina_verifyFields'
  | 'mina_signTransaction'
  | 'mina_sendTransaction'
  | 'mina_addChain'
  | 'mina_switchChain';

/**
 * Mina Provider request format.
 */
export interface MinaProviderRequest {
  method: MinaMethod;
  params?: unknown[];
}

/**
 * Connected site information.
 */
export interface ConnectedSite {
  origin: string;
  name: string;
  connectedAt: number;
}

// =============================================================================
// Background Message Types
// =============================================================================

/**
 * Messages sent to the background service worker.
 */
export type BackgroundAction =
  // Wallet lifecycle
  | { action: 'createWallet'; mnemonic: string; password: string }
  | { action: 'importWallet'; mnemonic: string; password: string }
  | { action: 'unlockWallet'; password: string }
  | { action: 'lockWallet' }
  | { action: 'isLocked' }
  | { action: 'hasWallet' }

  // Account management
  | { action: 'getAccounts' }
  | { action: 'createAccount'; name?: string }
  | { action: 'renameAccount'; index: number; name: string }
  | { action: 'setActiveAccount'; index: number }
  | { action: 'getActiveAccount' }
  | { action: 'exportPrivateKey'; index: number; password: string }

  // Blockchain operations
  | { action: 'getBalance'; address: string }
  | { action: 'getTransactions'; address: string }
  | { action: 'sendPayment'; payload: PaymentPayload; password: string }
  | { action: 'sendDelegation'; payload: DelegationPayload; password: string }

  // Signing (for zkApps)
  | { action: 'signMessage'; message: string; password: string }
  | { action: 'signFields'; fields: string[]; password: string }

  // Network
  | { action: 'getNetwork' }
  | { action: 'switchNetwork'; networkId: string }

  // Connected sites
  | { action: 'getConnectedSites' }
  | { action: 'connectSite'; origin: string; name: string }
  | { action: 'disconnectSite'; origin: string }
  | { action: 'isConnected'; origin: string };

// =============================================================================
// Storage Keys
// =============================================================================

/**
 * Chrome storage keys used by the extension.
 */
export const STORAGE_KEYS = {
  /** Encrypted wallet data */
  ENCRYPTED_WALLET: 'mina_wallet_encrypted',
  /** Current network ID */
  ACTIVE_NETWORK: 'mina_active_network',
  /** List of connected sites */
  CONNECTED_SITES: 'mina_connected_sites',
  /** Cached balances */
  BALANCES_CACHE: 'mina_balances_cache',
  /** Auto-lock timeout in minutes */
  AUTO_LOCK_MINUTES: 'mina_auto_lock_minutes',
  /** Last activity timestamp */
  LAST_ACTIVITY: 'mina_last_activity',
} as const;

// =============================================================================
// Constants
// =============================================================================

/**
 * Mina BIP44 coin type.
 */
export const MINA_COIN_TYPE = 12586;

/**
 * HD derivation path template.
 * Full path: m/44'/12586'/0'/0/{index}
 */
export const DERIVATION_PATH = "m/44'/12586'/0'/0";

/**
 * Default auto-lock timeout in minutes.
 */
export const DEFAULT_AUTO_LOCK_MINUTES = 15;

/**
 * Extension version.
 */
export const VERSION = '0.1.0';
