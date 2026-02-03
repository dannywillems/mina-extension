# Mina Wallet Extension

A browser extension wallet for the Mina Protocol, built with Rust/WebAssembly
and TypeScript.

## Features

- **Mina keypair generation** using the Pallas curve (via mina-signer)
- **Address encoding/decoding** (B62 format)
- **Account management** with multiple accounts support
- **Mina Provider API** for zkApp integration (`window.mina`)

## Architecture

```
mina-extension/
├── crates/
│   └── mina-wallet-wasm/     # Rust → WASM crypto module
│       └── src/lib.rs        # Keypair, signing, address operations
│
├── extension/
│   ├── src/
│   │   ├── ts/
│   │   │   ├── background.ts # Service worker (crypto hub)
│   │   │   ├── content.ts    # Provider injection
│   │   │   ├── inpage.ts     # window.mina provider
│   │   │   ├── popup.ts      # Popup UI
│   │   │   ├── types.ts      # TypeScript types
│   │   │   └── lib/          # Utilities (wasm, storage, accounts)
│   │   ├── scss/             # Styles
│   │   └── manifest.json     # Chrome Manifest V3
│   └── dist/                 # Built extension (generated)
│
├── e2e/                      # End-to-end tests
│   ├── fixtures/             # Playwright fixtures
│   └── tests/                # Test specifications
│
├── Cargo.toml                # Rust workspace
├── Makefile                  # Build commands
├── playwright.config.ts      # Playwright configuration
└── package.json              # Node dependencies
```

## Prerequisites

- **Rust** with nightly toolchain and `wasm32-unknown-unknown` target
- **wasm-pack** for building WASM
- **Node.js** (v18+) with npm
- **GNU sed** (on macOS: `brew install gnu-sed`)

## Setup

```bash
# Install dependencies
make setup

# Or manually:
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
npm install
```

## Development

```bash
# Build WASM module
make wasm-build

# Build full extension
make extension-build

# Build in dev mode (with sourcemaps)
make extension-build-dev

# Run Rust tests
make test

# Type check TypeScript
make typecheck

# Format code
make format
make prettify

# Run e2e tests
make e2e

# Run e2e tests with UI
make e2e-ui

# Run e2e tests in headed mode (visible browser)
make e2e-headed

# Debug e2e tests
make e2e-debug
```

## Loading the Extension

1. Build the extension: `make extension-build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension/dist` directory

## Project Status

This is an initial scaffold with the following implemented:

- [x] Rust WASM module with mina-signer integration
- [x] Keypair generation and validation
- [x] Address encoding/decoding (B62)
- [x] Chrome extension structure (Manifest V3)
- [x] Background service worker
- [x] Content script with provider injection
- [x] Inpage provider (`window.mina`)
- [x] Basic popup UI
- [x] End-to-end tests with Playwright

### TODO

- [ ] HD wallet derivation (BIP39/BIP44)
- [ ] Wallet encryption with password
- [ ] Transaction signing
- [ ] GraphQL client for balance/transaction queries
- [ ] Stake delegation
- [ ] zkApp transaction support
- [ ] Onboarding flow
- [ ] Settings page
- [ ] Connected sites management

## Technology Stack

- **Rust**: mina-signer, mina-curves, mina-hasher from proof-systems
- **WASM**: wasm-bindgen, wasm-pack
- **TypeScript**: Strict mode, Chrome extension types
- **Build**: esbuild, sass
- **Styling**: SCSS
- **Testing**: Playwright (e2e)

## License

MIT License - see [LICENSE](LICENSE)
