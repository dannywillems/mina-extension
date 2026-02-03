/**
 * Chrome storage utilities for the wallet extension.
 */

import {
  STORAGE_KEYS,
  type EncryptedWallet,
  type ConnectedSite,
  type Network,
  NETWORKS,
  DEFAULT_AUTO_LOCK_MINUTES,
} from '../types';

// =============================================================================
// Generic Storage Helpers
// =============================================================================

/**
 * Get a value from chrome.storage.local.
 */
export async function getStorage<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

/**
 * Set a value in chrome.storage.local.
 */
export async function setStorage<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/**
 * Remove a value from chrome.storage.local.
 */
export async function removeStorage(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}

// =============================================================================
// Wallet Storage
// =============================================================================

/**
 * Get the encrypted wallet from storage.
 */
export async function getEncryptedWallet(): Promise<EncryptedWallet | undefined> {
  return getStorage<EncryptedWallet>(STORAGE_KEYS.ENCRYPTED_WALLET);
}

/**
 * Save the encrypted wallet to storage.
 */
export async function setEncryptedWallet(wallet: EncryptedWallet): Promise<void> {
  await setStorage(STORAGE_KEYS.ENCRYPTED_WALLET, wallet);
}

/**
 * Check if a wallet exists.
 */
export async function hasWallet(): Promise<boolean> {
  const wallet = await getEncryptedWallet();
  return wallet !== undefined;
}

/**
 * Clear wallet data (for reset).
 */
export async function clearWallet(): Promise<void> {
  await removeStorage(STORAGE_KEYS.ENCRYPTED_WALLET);
}

// =============================================================================
// Network Storage
// =============================================================================

/**
 * Get the current network.
 */
export async function getActiveNetwork(): Promise<Network> {
  const networkId = await getStorage<string>(STORAGE_KEYS.ACTIVE_NETWORK);
  return NETWORKS[networkId ?? 'mainnet'] ?? NETWORKS.mainnet;
}

/**
 * Set the active network.
 */
export async function setActiveNetwork(networkId: string): Promise<void> {
  if (!(networkId in NETWORKS)) {
    throw new Error(`Unknown network: ${networkId}`);
  }
  await setStorage(STORAGE_KEYS.ACTIVE_NETWORK, networkId);
}

// =============================================================================
// Connected Sites Storage
// =============================================================================

/**
 * Get all connected sites.
 */
export async function getConnectedSites(): Promise<ConnectedSite[]> {
  const sites = await getStorage<ConnectedSite[]>(STORAGE_KEYS.CONNECTED_SITES);
  return sites ?? [];
}

/**
 * Add a connected site.
 */
export async function addConnectedSite(
  origin: string,
  name: string,
): Promise<void> {
  const sites = await getConnectedSites();
  const existing = sites.find(s => s.origin === origin);

  if (existing) {
    // Update existing
    existing.name = name;
    existing.connectedAt = Date.now();
  } else {
    // Add new
    sites.push({
      origin,
      name,
      connectedAt: Date.now(),
    });
  }

  await setStorage(STORAGE_KEYS.CONNECTED_SITES, sites);
}

/**
 * Remove a connected site.
 */
export async function removeConnectedSite(origin: string): Promise<void> {
  const sites = await getConnectedSites();
  const filtered = sites.filter(s => s.origin !== origin);
  await setStorage(STORAGE_KEYS.CONNECTED_SITES, filtered);
}

/**
 * Check if a site is connected.
 */
export async function isSiteConnected(origin: string): Promise<boolean> {
  const sites = await getConnectedSites();
  return sites.some(s => s.origin === origin);
}

// =============================================================================
// Balance Cache
// =============================================================================

/**
 * Balance cache entry.
 */
interface BalanceCache {
  [address: string]: {
    balance: string;
    updatedAt: number;
  };
}

/**
 * Get cached balances.
 */
export async function getBalancesCache(): Promise<BalanceCache> {
  const cache = await getStorage<BalanceCache>(STORAGE_KEYS.BALANCES_CACHE);
  return cache ?? {};
}

/**
 * Update a cached balance.
 */
export async function updateBalanceCache(
  address: string,
  balance: string,
): Promise<void> {
  const cache = await getBalancesCache();
  cache[address] = {
    balance,
    updatedAt: Date.now(),
  };
  await setStorage(STORAGE_KEYS.BALANCES_CACHE, cache);
}

/**
 * Clear balance cache.
 */
export async function clearBalancesCache(): Promise<void> {
  await removeStorage(STORAGE_KEYS.BALANCES_CACHE);
}

// =============================================================================
// Auto-lock Settings
// =============================================================================

/**
 * Get auto-lock timeout in minutes.
 */
export async function getAutoLockMinutes(): Promise<number> {
  const minutes = await getStorage<number>(STORAGE_KEYS.AUTO_LOCK_MINUTES);
  return minutes ?? DEFAULT_AUTO_LOCK_MINUTES;
}

/**
 * Set auto-lock timeout in minutes.
 */
export async function setAutoLockMinutes(minutes: number): Promise<void> {
  await setStorage(STORAGE_KEYS.AUTO_LOCK_MINUTES, minutes);
}

/**
 * Get last activity timestamp.
 */
export async function getLastActivity(): Promise<number> {
  const timestamp = await getStorage<number>(STORAGE_KEYS.LAST_ACTIVITY);
  return timestamp ?? Date.now();
}

/**
 * Update last activity timestamp.
 */
export async function updateLastActivity(): Promise<void> {
  await setStorage(STORAGE_KEYS.LAST_ACTIVITY, Date.now());
}
