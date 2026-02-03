UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    SED := $(shell command -v gsed 2>/dev/null)
    ifeq ($(SED),)
        $(error GNU sed (gsed) not found on macOS. \
			Install with: brew install gnu-sed)
    endif
else
    SED := sed
endif

.PHONY: help
help: ## Ask for help!
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; \
		{printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Rust targets
# =============================================================================

.PHONY: build
build: ## Build all crates in debug mode
	cargo build --workspace

.PHONY: build-release
build-release: ## Build all crates in release mode
	cargo build --workspace --release

.PHONY: check
check: ## Check code for compilation errors
	cargo check --workspace

.PHONY: check-wasm
check-wasm: ## Check mina-wallet-wasm compiles to WebAssembly
	cargo check -p mina-wallet-wasm --target wasm32-unknown-unknown

.PHONY: check-format
check-format: ## Check code formatting (nightly)
	cargo +nightly fmt -- --check

.PHONY: format
format: ## Format Rust code (nightly)
	cargo +nightly fmt

.PHONY: lint
lint: ## Run linter
	cargo clippy --workspace -- -D warnings

.PHONY: test
test: ## Run Rust tests
	cargo test --workspace

.PHONY: clean
clean: ## Clean build artifacts
	cargo clean
	rm -rf extension/dist extension/pkg

# =============================================================================
# WASM targets
# =============================================================================

.PHONY: wasm-build
wasm-build: ## Build mina-wallet-wasm for browser extension
	wasm-pack build crates/mina-wallet-wasm --target web \
		--out-dir ../../extension/pkg

.PHONY: wasm-build-dev
wasm-build-dev: ## Build mina-wallet-wasm in debug mode
	wasm-pack build crates/mina-wallet-wasm --target web --dev \
		--out-dir ../../extension/pkg

.PHONY: wasm-test
wasm-test: ## Run mina-wallet-wasm tests
	cargo test -p mina-wallet-wasm

.PHONY: wasm-clean
wasm-clean: ## Clean WASM build artifacts
	rm -rf extension/pkg

# =============================================================================
# Extension targets
# =============================================================================

.PHONY: extension-build
extension-build: wasm-build ## Build the browser extension (includes WASM)
	@echo "==> Building browser extension..."
	mkdir -p extension/dist/wasm extension/dist/css extension/dist/js \
		extension/dist/images extension/dist/pages
	cp extension/src/manifest.json extension/dist/
	cp extension/src/popup.html extension/dist/
	cp extension/src/pages/*.html extension/dist/pages/ 2>/dev/null || true
	cp extension/src/images/* extension/dist/images/ 2>/dev/null || true
	cp extension/pkg/mina_wallet_wasm_bg.wasm extension/dist/wasm/
	cp extension/pkg/mina_wallet_wasm.js extension/dist/wasm/
	@echo "==> Compiling TypeScript (background)..."
	(cd extension && npx esbuild src/ts/background.ts --bundle \
		--alias:@wasm/mina_wallet_wasm=./pkg/mina_wallet_wasm.js \
		--outfile=dist/js/background.js --format=esm)
	@echo "==> Compiling TypeScript (content)..."
	(cd extension && npx esbuild src/ts/content.ts --bundle \
		--outfile=dist/js/content.js --format=iife)
	@echo "==> Compiling TypeScript (inpage)..."
	(cd extension && npx esbuild src/ts/inpage.ts --bundle \
		--outfile=dist/js/inpage.js --format=iife)
	@echo "==> Compiling TypeScript (popup)..."
	(cd extension && npx esbuild src/ts/popup.ts --bundle \
		--outfile=dist/js/popup.js --format=iife)
	@echo "==> Compiling SCSS..."
	(cd extension && npx sass src/scss/popup.scss dist/css/popup.css)
	@echo "==> Extension built successfully!"

.PHONY: extension-build-dev
extension-build-dev: wasm-build-dev ## Build extension in debug mode
	@echo "==> Building browser extension (dev)..."
	mkdir -p extension/dist/wasm extension/dist/css extension/dist/js \
		extension/dist/images extension/dist/pages
	cp extension/src/manifest.json extension/dist/
	cp extension/src/popup.html extension/dist/
	cp extension/src/pages/*.html extension/dist/pages/ 2>/dev/null || true
	cp extension/src/images/* extension/dist/images/ 2>/dev/null || true
	cp extension/pkg/mina_wallet_wasm_bg.wasm extension/dist/wasm/
	cp extension/pkg/mina_wallet_wasm.js extension/dist/wasm/
	(cd extension && npx esbuild src/ts/background.ts --bundle \
		--alias:@wasm/mina_wallet_wasm=./pkg/mina_wallet_wasm.js \
		--outfile=dist/js/background.js --format=esm --sourcemap)
	(cd extension && npx esbuild src/ts/content.ts --bundle \
		--outfile=dist/js/content.js --format=iife --sourcemap)
	(cd extension && npx esbuild src/ts/inpage.ts --bundle \
		--outfile=dist/js/inpage.js --format=iife --sourcemap)
	(cd extension && npx esbuild src/ts/popup.ts --bundle \
		--outfile=dist/js/popup.js --format=iife --sourcemap)
	(cd extension && npx sass src/scss/popup.scss dist/css/popup.css \
		--source-map)
	@echo "==> Extension built successfully (dev mode)!"

.PHONY: extension-zip
extension-zip: extension-build ## Create extension zip for distribution
	@echo "==> Creating extension zip..."
	(cd extension/dist && zip -r ../mina-extension.zip .)
	@echo "==> Created extension/mina-extension.zip"

# =============================================================================
# TypeScript targets
# =============================================================================

.PHONY: typecheck
typecheck: ## Run TypeScript type checker
	(cd extension && npx tsc --noEmit)

.PHONY: typecheck-watch
typecheck-watch: ## Run TypeScript type checker in watch mode
	(cd extension && npx tsc --noEmit --watch)

# =============================================================================
# Formatting and linting
# =============================================================================

.PHONY: prettify
prettify: ## Format markdown, YAML, JSON, and HTML files with prettier
	npx prettier --write "**/*.md" "**/*.yaml" "**/*.yml" "**/*.json" \
		"**/*.html" --ignore-path .prettierignore --no-error-on-unmatched-pattern

.PHONY: check-prettier
check-prettier: ## Check markdown, YAML, JSON, and HTML formatting
	npx prettier --check "**/*.md" "**/*.yaml" "**/*.yml" "**/*.json" \
		"**/*.html" --ignore-path .prettierignore --no-error-on-unmatched-pattern

.PHONY: fix-trailing-whitespace
fix-trailing-whitespace: ## Remove trailing whitespaces from all files
	@echo "Removing trailing whitespaces from all files..."
	@find . -type f \( \
		-name "*.rs" -o -name "*.toml" -o -name "*.md" -o -name "*.yaml" \
		-o -name "*.yml" -o -name "*.ts" -o -name "*.tsx" \
		-o -name "*.js" -o -name "*.jsx" -o -name "*.sh" \
		-o -name "*.json" -o -name "*.html" -o -name "*.scss" \) \
		-not -path "./target/*" \
		-not -path "./node_modules/*" \
		-not -path "./extension/node_modules/*" \
		-not -path "./extension/dist/*" \
		-not -path "./extension/pkg/*" \
		-not -path "./.git/*" \
		-exec sh -c \
			'echo "Processing: $$1"; $(SED) -i -e "s/[[:space:]]*$$//" "$$1"' \
			_ {} \; && \
		echo "Trailing whitespaces removed."

.PHONY: check-trailing-whitespace
check-trailing-whitespace: ## Check for trailing whitespaces in source files
	@echo "Checking for trailing whitespaces..."
	@files_with_trailing_ws=$$(find . -type f \( \
		-name "*.rs" -o -name "*.toml" -o -name "*.md" -o -name "*.yaml" \
		-o -name "*.yml" -o -name "*.ts" -o -name "*.tsx" \
		-o -name "*.js" -o -name "*.jsx" -o -name "*.sh" \
		-o -name "*.json" -o -name "*.html" -o -name "*.scss" \) \
		-not -path "./target/*" \
		-not -path "./node_modules/*" \
		-not -path "./extension/node_modules/*" \
		-not -path "./extension/dist/*" \
		-not -path "./extension/pkg/*" \
		-not -path "./.git/*" \
		-exec grep -l '[[:space:]]$$' {} + 2>/dev/null || true); \
	if [ -n "$$files_with_trailing_ws" ]; then \
		echo "Files with trailing whitespaces found:"; \
		echo "$$files_with_trailing_ws" | sed 's/^/  /'; \
		echo ""; \
		echo "Run 'make fix-trailing-whitespace' to fix automatically."; \
		exit 1; \
	else \
		echo "No trailing whitespaces found."; \
	fi

# =============================================================================
# E2E Testing (Playwright)
# =============================================================================

.PHONY: e2e
e2e: extension-build ## Run e2e tests with Playwright
	npx playwright test

.PHONY: e2e-ui
e2e-ui: extension-build ## Run e2e tests with Playwright UI
	npx playwright test --ui

.PHONY: e2e-headed
e2e-headed: extension-build ## Run e2e tests in headed mode (visible browser)
	npx playwright test --headed

.PHONY: e2e-debug
e2e-debug: extension-build ## Run e2e tests in debug mode
	npx playwright test --debug

.PHONY: e2e-report
e2e-report: ## Show the last e2e test report
	npx playwright show-report

.PHONY: playwright-install
playwright-install: ## Install Playwright browsers
	npx playwright install chromium

# =============================================================================
# Setup and dependencies
# =============================================================================

.PHONY: setup
setup: ## Setup development environment
	@echo "==> Installing Rust toolchain components..."
	rustup component add rustfmt clippy
	rustup target add wasm32-unknown-unknown
	@echo "==> Installing wasm-pack..."
	cargo install wasm-pack || true
	@echo "==> Installing npm dependencies..."
	npm install
	@echo "==> Installing Playwright browsers..."
	npx playwright install chromium
	@echo "==> Setup complete!"

# =============================================================================
# CI targets
# =============================================================================

.PHONY: ci
ci: ## Run all CI checks
	@echo "==> Running CI checks..."
	@echo ""
	@echo "==> Checking Rust compilation..."
	@$(MAKE) check
	@echo ""
	@echo "==> Checking WASM compilation..."
	@$(MAKE) check-wasm
	@echo ""
	@echo "==> Checking code formatting..."
	@$(MAKE) check-format
	@echo ""
	@echo "==> Running linter..."
	@$(MAKE) lint
	@echo ""
	@echo "==> Running tests..."
	@$(MAKE) test
	@echo ""
	@echo "==> Checking TypeScript..."
	@$(MAKE) typecheck
	@echo ""
	@echo "==> Checking trailing whitespace..."
	@$(MAKE) check-trailing-whitespace
	@echo ""
	@echo "==> All CI checks passed!"
