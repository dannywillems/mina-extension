/**
 * WASM module wrapper for mina-wallet-wasm.
 *
 * Provides a convenient async interface to the WASM functions
 * with automatic initialization handling.
 */

import init, {
  generate_keypair as wasmGenerateKeypair,
  keypair_from_secret_key_hex as wasmKeypairFromSecretKeyHex,
  keypair_from_base58 as wasmKeypairFromBase58,
  public_key_to_address as wasmPublicKeyToAddress,
  secret_key_to_address as wasmSecretKeyToAddress,
  secret_key_to_base58 as wasmSecretKeyToBase58,
  validate_address as wasmValidateAddress,
  validate_secret_key_hex as wasmValidateSecretKeyHex,
  validate_secret_key_base58 as wasmValidateSecretKeyBase58,
  address_to_compressed_public_key as wasmAddressToCompressedPublicKey,
  type MinaKeypair,
} from '@wasm/mina_wallet_wasm';

let wasmInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module. Safe to call multiple times.
 *
 * In browser extension context, we must fetch the WASM file ourselves
 * and pass it to init(), because the default fetch behavior doesn't
 * work correctly in service workers.
 */
export async function initWasm(): Promise<void> {
  if (wasmInitialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        // Get the WASM file URL using chrome.runtime.getURL
        const wasmUrl = chrome.runtime.getURL('wasm/mina_wallet_wasm_bg.wasm');
        console.log('[WASM] Fetching from URL:', wasmUrl);

        // Fetch the WASM file ourselves
        const response = await fetch(wasmUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM: ${response.status}`);
        }

        console.log('[WASM] Initializing module...');
        await init(response);
        wasmInitialized = true;
        console.log('[WASM] Initialized successfully');
      } catch (err) {
        console.error('[WASM] Initialization failed:', err);
        initPromise = null; // Allow retry
        throw err;
      }
    })();
  }

  await initPromise;
}

/**
 * Check if WASM is initialized.
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}

// =============================================================================
// Keypair Types
// =============================================================================

/**
 * A Mina keypair.
 */
export interface Keypair {
  /** Mina address (B62...) */
  address: string;
  /** Public key in hex format */
  publicKeyHex: string;
  /** Secret key in hex format */
  secretKeyHex: string;
}

// =============================================================================
// Keypair Generation
// =============================================================================

/**
 * Generate a new random Mina keypair.
 */
export async function generateKeypair(): Promise<Keypair> {
  await initWasm();
  const kp: MinaKeypair = wasmGenerateKeypair();
  return {
    address: kp.address,
    publicKeyHex: kp.public_key_hex,
    secretKeyHex: kp.secret_key_hex,
  };
}

/**
 * Create a keypair from a secret key hex string.
 */
export async function keypairFromSecretKeyHex(
  secretKeyHex: string,
): Promise<Keypair> {
  await initWasm();
  const kp: MinaKeypair = wasmKeypairFromSecretKeyHex(secretKeyHex);
  return {
    address: kp.address,
    publicKeyHex: kp.public_key_hex,
    secretKeyHex: kp.secret_key_hex,
  };
}

/**
 * Create a keypair from a base58-encoded secret key.
 */
export async function keypairFromBase58(
  secretKeyBase58: string,
): Promise<Keypair> {
  await initWasm();
  const kp: MinaKeypair = wasmKeypairFromBase58(secretKeyBase58);
  return {
    address: kp.address,
    publicKeyHex: kp.public_key_hex,
    secretKeyHex: kp.secret_key_hex,
  };
}

// =============================================================================
// Address Operations
// =============================================================================

/**
 * Get the Mina address from a public key hex.
 */
export async function publicKeyToAddress(publicKeyHex: string): Promise<string> {
  await initWasm();
  return wasmPublicKeyToAddress(publicKeyHex);
}

/**
 * Get the Mina address from a secret key hex.
 */
export async function secretKeyToAddress(secretKeyHex: string): Promise<string> {
  await initWasm();
  return wasmSecretKeyToAddress(secretKeyHex);
}

/**
 * Export a secret key to base58 format.
 */
export async function secretKeyToBase58(secretKeyHex: string): Promise<string> {
  await initWasm();
  return wasmSecretKeyToBase58(secretKeyHex);
}

/**
 * Get the compressed public key from an address.
 */
export async function addressToCompressedPublicKey(
  address: string,
): Promise<string> {
  await initWasm();
  return wasmAddressToCompressedPublicKey(address);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a Mina address.
 */
export async function validateAddress(address: string): Promise<boolean> {
  await initWasm();
  return wasmValidateAddress(address);
}

/**
 * Validate a secret key hex string.
 */
export async function validateSecretKeyHex(
  secretKeyHex: string,
): Promise<boolean> {
  await initWasm();
  return wasmValidateSecretKeyHex(secretKeyHex);
}

/**
 * Validate a base58 secret key.
 */
export async function validateSecretKeyBase58(
  secretKeyBase58: string,
): Promise<boolean> {
  await initWasm();
  return wasmValidateSecretKeyBase58(secretKeyBase58);
}

// Re-export types
export type { MinaKeypair };
