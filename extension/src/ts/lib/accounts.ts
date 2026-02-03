/**
 * Account management for the Mina wallet.
 *
 * Handles account CRUD operations and HD wallet derivation.
 */

import { type Account, type EncryptedWallet } from '../types';
import { getEncryptedWallet, setEncryptedWallet } from './storage';
import { generateKeypair, keypairFromSecretKeyHex } from './wasm';

// =============================================================================
// Account Operations
// =============================================================================

/**
 * Get all accounts.
 */
export async function getAccounts(): Promise<Account[]> {
  const wallet = await getEncryptedWallet();
  return wallet?.accounts ?? [];
}

/**
 * Get the active account.
 */
export async function getActiveAccount(): Promise<Account | null> {
  const wallet = await getEncryptedWallet();
  if (!wallet || wallet.accounts.length === 0) {
    return null;
  }
  return wallet.accounts[wallet.activeAccountIndex] ?? wallet.accounts[0];
}

/**
 * Get account by index.
 */
export async function getAccountByIndex(index: number): Promise<Account | null> {
  const accounts = await getAccounts();
  return accounts.find(a => a.index === index) ?? null;
}

/**
 * Set the active account.
 */
export async function setActiveAccount(accountIndex: number): Promise<void> {
  const wallet = await getEncryptedWallet();
  if (!wallet) {
    throw new Error('No wallet found');
  }

  const account = wallet.accounts.find(a => a.index === accountIndex);
  if (!account) {
    throw new Error(`Account ${accountIndex} not found`);
  }

  wallet.activeAccountIndex = accountIndex;
  await setEncryptedWallet(wallet);
}

/**
 * Create a new account.
 *
 * Note: In a full implementation, this would derive the key from the mnemonic
 * using BIP44. For now, we generate a random keypair.
 */
export async function createAccount(name?: string): Promise<Account> {
  const wallet = await getEncryptedWallet();
  if (!wallet) {
    throw new Error('No wallet found');
  }

  // Find the next available index
  const maxIndex = wallet.accounts.reduce(
    (max, a) => Math.max(max, a.index),
    -1,
  );
  const newIndex = maxIndex + 1;

  // TODO: Derive from mnemonic using BIP44 path m/44'/12586'/0'/0/{newIndex}
  // For now, generate a random keypair
  const keypair = await generateKeypair();

  const account: Account = {
    index: newIndex,
    name: name ?? `Account ${newIndex + 1}`,
    address: keypair.address,
    publicKeyHex: keypair.publicKeyHex,
  };

  wallet.accounts.push(account);
  wallet.activeAccountIndex = newIndex;
  await setEncryptedWallet(wallet);

  return account;
}

/**
 * Rename an account.
 */
export async function renameAccount(
  accountIndex: number,
  newName: string,
): Promise<void> {
  const wallet = await getEncryptedWallet();
  if (!wallet) {
    throw new Error('No wallet found');
  }

  const account = wallet.accounts.find(a => a.index === accountIndex);
  if (!account) {
    throw new Error(`Account ${accountIndex} not found`);
  }

  account.name = newName;
  await setEncryptedWallet(wallet);
}

/**
 * Delete an account.
 *
 * Note: Cannot delete the last account.
 */
export async function deleteAccount(accountIndex: number): Promise<void> {
  const wallet = await getEncryptedWallet();
  if (!wallet) {
    throw new Error('No wallet found');
  }

  if (wallet.accounts.length <= 1) {
    throw new Error('Cannot delete the last account');
  }

  const accountIdx = wallet.accounts.findIndex(a => a.index === accountIndex);
  if (accountIdx === -1) {
    throw new Error(`Account ${accountIndex} not found`);
  }

  wallet.accounts.splice(accountIdx, 1);

  // Update active account if needed
  if (wallet.activeAccountIndex === accountIndex) {
    wallet.activeAccountIndex = wallet.accounts[0].index;
  }

  await setEncryptedWallet(wallet);
}

// =============================================================================
// Wallet Initialization
// =============================================================================

/**
 * Create a new wallet from a mnemonic.
 *
 * This encrypts the mnemonic and derives the first account.
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @param password - Password for encryption
 */
export async function createWalletFromMnemonic(
  mnemonic: string,
  _password: string,
): Promise<Account> {
  // TODO: Implement proper encryption using Web Crypto API
  // For now, this is a placeholder that stores the mnemonic
  // In production, use AES-GCM with PBKDF2 key derivation

  // Generate the first account
  // TODO: Derive from mnemonic using BIP44
  const keypair = await generateKeypair();

  const account: Account = {
    index: 0,
    name: 'Account 1',
    address: keypair.address,
    publicKeyHex: keypair.publicKeyHex,
  };

  const wallet: EncryptedWallet = {
    encryptedMnemonic: mnemonic, // TODO: Encrypt this!
    salt: 'placeholder-salt', // TODO: Generate random salt
    iv: 'placeholder-iv', // TODO: Generate random IV
    accounts: [account],
    activeAccountIndex: 0,
  };

  await setEncryptedWallet(wallet);
  return account;
}

/**
 * Import a wallet from a mnemonic.
 */
export async function importWalletFromMnemonic(
  mnemonic: string,
  password: string,
): Promise<Account> {
  // Same as createWalletFromMnemonic for now
  return createWalletFromMnemonic(mnemonic, password);
}

/**
 * Import an account from a private key (base58 or hex).
 */
export async function importAccountFromPrivateKey(
  privateKey: string,
  name?: string,
): Promise<Account> {
  const wallet = await getEncryptedWallet();
  if (!wallet) {
    throw new Error('No wallet found');
  }

  // Try to parse as hex first, then base58
  let keypair;
  if (privateKey.length === 64) {
    // Likely hex
    keypair = await keypairFromSecretKeyHex(privateKey);
  } else {
    // Try base58
    const { keypairFromBase58 } = await import('./wasm');
    keypair = await keypairFromBase58(privateKey);
  }

  // Check if account already exists
  const existing = wallet.accounts.find(a => a.address === keypair.address);
  if (existing) {
    throw new Error('Account already exists');
  }

  // Find the next available index
  const maxIndex = wallet.accounts.reduce(
    (max, a) => Math.max(max, a.index),
    -1,
  );
  const newIndex = maxIndex + 1;

  const account: Account = {
    index: newIndex,
    name: name ?? `Imported ${newIndex + 1}`,
    address: keypair.address,
    publicKeyHex: keypair.publicKeyHex,
  };

  wallet.accounts.push(account);
  wallet.activeAccountIndex = newIndex;
  await setEncryptedWallet(wallet);

  return account;
}
