//! # mina-wallet-wasm
//!
//! WebAssembly bindings for Mina wallet operations.
//!
//! This crate compiles to WASM and provides the browser extension with:
//! - Keypair generation using Mina's Pallas curve
//! - Schnorr signature creation and verification
//! - Address encoding/decoding (B62 format)

use mina_signer::{CompressedPubKey, Keypair, PubKey, SecKey};
use rand::rngs::OsRng;
use wasm_bindgen::prelude::*;

/// Result of keypair generation.
#[wasm_bindgen]
pub struct MinaKeypair {
    /// Mina address (B62...)
    address: String,
    /// Public key hex (x || y coordinates)
    public_key_hex: String,
    /// Secret key hex (scalar field element)
    secret_key_hex: String,
}

#[wasm_bindgen]
impl MinaKeypair {
    /// Get the Mina address (B62...).
    #[wasm_bindgen(getter)]
    pub fn address(&self) -> String {
        self.address.clone()
    }

    /// Get the public key as hex string.
    #[wasm_bindgen(getter)]
    pub fn public_key_hex(&self) -> String {
        self.public_key_hex.clone()
    }

    /// Get the secret key as hex string.
    /// WARNING: Handle with care - this is sensitive!
    #[wasm_bindgen(getter)]
    pub fn secret_key_hex(&self) -> String {
        self.secret_key_hex.clone()
    }
}

/// Generate a new Mina keypair.
///
/// Returns a MinaKeypair with:
/// - `address`: The Mina address (B62...)
/// - `public_key_hex`: Public key in hex format
/// - `secret_key_hex`: Secret key in hex format (store encrypted!)
#[wasm_bindgen]
pub fn generate_keypair() -> Result<MinaKeypair, JsError> {
    let mut rng = OsRng;
    let keypair = Keypair::rand(&mut rng)
        .map_err(|e| JsError::new(&format!("Keypair generation failed: {:?}", e)))?;

    let address = keypair.public.into_address();
    let public_key_hex = keypair.public.to_hex();
    let secret_key_hex = keypair.secret.to_hex();

    Ok(MinaKeypair { address, public_key_hex, secret_key_hex })
}

/// Create a keypair from a secret key hex string.
///
/// The secret key should be a 64-character hex string representing
/// the scalar field element.
#[wasm_bindgen]
pub fn keypair_from_secret_key_hex(secret_key_hex: &str) -> Result<MinaKeypair, JsError> {
    let keypair = Keypair::from_hex(secret_key_hex)
        .map_err(|e| JsError::new(&format!("Invalid secret key hex: {:?}", e)))?;

    let address = keypair.public.into_address();
    let public_key_hex = keypair.public.to_hex();
    let secret_key_hex = keypair.secret.to_hex();

    Ok(MinaKeypair { address, public_key_hex, secret_key_hex })
}

/// Create a keypair from a base58-encoded secret key.
///
/// This is the standard Mina secret key format (starts with EK...).
#[wasm_bindgen]
pub fn keypair_from_base58(secret_key_base58: &str) -> Result<MinaKeypair, JsError> {
    let sec_key = SecKey::from_base58(secret_key_base58)
        .map_err(|e| JsError::new(&format!("Invalid base58 secret key: {:?}", e)))?;

    let keypair = Keypair::from_secret_key(sec_key)
        .map_err(|e| JsError::new(&format!("Keypair derivation failed: {:?}", e)))?;

    let address = keypair.public.into_address();
    let public_key_hex = keypair.public.to_hex();
    let secret_key_hex = keypair.secret.to_hex();

    Ok(MinaKeypair { address, public_key_hex, secret_key_hex })
}

/// Get the Mina address (B62...) from a public key hex.
#[wasm_bindgen]
pub fn public_key_to_address(public_key_hex: &str) -> Result<String, JsError> {
    let pub_key = PubKey::from_hex(public_key_hex)
        .map_err(|e| JsError::new(&format!("Invalid public key: {:?}", e)))?;
    Ok(pub_key.into_address())
}

/// Get the Mina address (B62...) from a secret key hex.
#[wasm_bindgen]
pub fn secret_key_to_address(secret_key_hex: &str) -> Result<String, JsError> {
    let keypair = Keypair::from_hex(secret_key_hex)
        .map_err(|e| JsError::new(&format!("Invalid secret key: {:?}", e)))?;
    Ok(keypair.public.into_address())
}

/// Export a secret key to base58 format (standard Mina format).
///
/// Returns a string starting with "EK..." that can be imported
/// into other Mina wallets.
#[wasm_bindgen]
pub fn secret_key_to_base58(secret_key_hex: &str) -> Result<String, JsError> {
    let sec_key = SecKey::from_hex(secret_key_hex)
        .map_err(|e| JsError::new(&format!("Invalid secret key: {:?}", e)))?;
    Ok(sec_key.to_base58())
}

/// Validate a Mina address.
///
/// Returns true if the address is a valid B62 Mina address.
#[wasm_bindgen]
pub fn validate_address(address: &str) -> bool {
    PubKey::from_address(address).is_ok()
}

/// Validate a secret key hex string.
///
/// Returns true if the hex string represents a valid secret key.
#[wasm_bindgen]
pub fn validate_secret_key_hex(secret_key_hex: &str) -> bool {
    SecKey::from_hex(secret_key_hex).is_ok()
}

/// Validate a base58 secret key.
///
/// Returns true if the base58 string is a valid Mina secret key.
#[wasm_bindgen]
pub fn validate_secret_key_base58(secret_key_base58: &str) -> bool {
    SecKey::from_base58(secret_key_base58).is_ok()
}

/// Get the compressed public key from an address.
///
/// Returns the x-coordinate and parity as a hex string.
#[wasm_bindgen]
pub fn address_to_compressed_public_key(address: &str) -> Result<String, JsError> {
    let compressed = CompressedPubKey::from_address(address)
        .map_err(|e| JsError::new(&format!("Invalid address: {:?}", e)))?;
    Ok(compressed.to_hex())
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let keypair = generate_keypair().unwrap();

        // Address should start with B62
        assert!(keypair.address().starts_with("B62"), "Address should start with B62");

        // Address should be 55 characters
        assert_eq!(keypair.address().len(), 55, "Address should be 55 characters");

        // Public key hex should not be empty
        assert!(!keypair.public_key_hex().is_empty(), "Public key should not be empty");

        // Secret key hex should not be empty
        assert!(!keypair.secret_key_hex().is_empty(), "Secret key should not be empty");
    }

    #[test]
    fn test_keypair_roundtrip_hex() {
        let keypair = generate_keypair().unwrap();
        let recovered = keypair_from_secret_key_hex(&keypair.secret_key_hex()).unwrap();

        assert_eq!(keypair.address(), recovered.address(), "Address should match after roundtrip");
        assert_eq!(
            keypair.public_key_hex(),
            recovered.public_key_hex(),
            "Public key should match after roundtrip"
        );
    }

    #[test]
    fn test_keypair_roundtrip_base58() {
        let keypair = generate_keypair().unwrap();
        let base58 = secret_key_to_base58(&keypair.secret_key_hex()).unwrap();

        // Base58 secret keys start with specific prefix
        assert!(base58.len() == 52, "Base58 secret key should be 52 characters");

        let recovered = keypair_from_base58(&base58).unwrap();
        assert_eq!(
            keypair.address(),
            recovered.address(),
            "Address should match after base58 roundtrip"
        );
    }

    #[test]
    fn test_address_validation() {
        // Generate a valid address
        let keypair = generate_keypair().unwrap();
        assert!(validate_address(&keypair.address()), "Generated address should be valid");

        // Invalid addresses
        assert!(!validate_address("invalid"), "Invalid string should fail validation");
        assert!(!validate_address("B62abc"), "Too short address should fail validation");
        assert!(!validate_address(""), "Empty string should fail validation");
    }

    #[test]
    fn test_secret_key_validation() {
        let keypair = generate_keypair().unwrap();

        assert!(
            validate_secret_key_hex(&keypair.secret_key_hex()),
            "Generated secret key hex should be valid"
        );

        let base58 = secret_key_to_base58(&keypair.secret_key_hex()).unwrap();
        assert!(validate_secret_key_base58(&base58), "Generated secret key base58 should be valid");

        assert!(!validate_secret_key_hex("invalid"), "Invalid hex should fail validation");
        assert!(!validate_secret_key_base58("invalid"), "Invalid base58 should fail validation");
    }

    #[test]
    fn test_public_key_to_address() {
        let keypair = generate_keypair().unwrap();
        let address = public_key_to_address(&keypair.public_key_hex()).unwrap();

        assert_eq!(keypair.address(), address, "Address from public key should match");
    }

    #[test]
    fn test_multiple_keypairs_unique() {
        use std::collections::HashSet;

        let mut addresses = HashSet::new();
        let mut public_keys = HashSet::new();
        let mut secret_keys = HashSet::new();

        // Generate 50 keypairs and verify all are unique
        for _ in 0..50 {
            let keypair = generate_keypair().unwrap();

            assert!(addresses.insert(keypair.address()), "Duplicate address detected!");
            assert!(public_keys.insert(keypair.public_key_hex()), "Duplicate public key detected!");
            assert!(secret_keys.insert(keypair.secret_key_hex()), "Duplicate secret key detected!");
        }

        assert_eq!(addresses.len(), 50);
        assert_eq!(public_keys.len(), 50);
        assert_eq!(secret_keys.len(), 50);
    }
}
