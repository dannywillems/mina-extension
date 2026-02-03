/**
 * Global type declarations for the Mina wallet extension.
 */

/**
 * WASM module type declarations.
 */
declare module '@wasm/mina_wallet_wasm' {
  export interface MinaKeypair {
    readonly address: string;
    readonly public_key_hex: string;
    readonly secret_key_hex: string;
  }

  export function generate_keypair(): MinaKeypair;
  export function keypair_from_secret_key_hex(secret_key_hex: string): MinaKeypair;
  export function keypair_from_base58(secret_key_base58: string): MinaKeypair;
  export function public_key_to_address(public_key_hex: string): string;
  export function secret_key_to_address(secret_key_hex: string): string;
  export function secret_key_to_base58(secret_key_hex: string): string;
  export function validate_address(address: string): boolean;
  export function validate_secret_key_hex(secret_key_hex: string): boolean;
  export function validate_secret_key_base58(secret_key_base58: string): boolean;
  export function address_to_compressed_public_key(address: string): string;

  export default function init(input?: Response | BufferSource): Promise<void>;
}

/**
 * Window augmentation for the Mina provider.
 */
interface Window {
  mina?: import('./inpage').MinaProvider;
}
