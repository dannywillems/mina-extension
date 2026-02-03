/**
 * Inpage provider script for the Mina wallet extension.
 *
 * This script is injected into the page context and creates the
 * window.mina object that websites use to interact with the wallet.
 */

// =============================================================================
// Types
// =============================================================================

interface MinaProviderRequest {
  method: string;
  params?: unknown[];
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

// =============================================================================
// Event Emitter
// =============================================================================

type EventCallback = (...args: unknown[]) => void;

class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.events.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`[MinaProvider] Event handler error:`, err);
      }
    });
  }
}

// =============================================================================
// Mina Provider
// =============================================================================

class MinaProvider extends EventEmitter {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private _isConnected = false;

  constructor() {
    super();
    this.setupMessageListener();
    console.log('[MinaProvider] Initialized');
  }

  /**
   * Check if the provider is connected to the wallet.
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Send a request to the wallet.
   */
  async request({ method, params }: MinaProviderRequest): Promise<unknown> {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Post message to content script
      window.postMessage(
        {
          type: 'MINA_PROVIDER_REQUEST',
          id,
          method,
          params: params ?? {},
        },
        '*',
      );

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 60000);
    });
  }

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  /**
   * Request accounts (triggers connection prompt if not connected).
   */
  async requestAccounts(): Promise<string[]> {
    const result = (await this.request({
      method: 'mina_requestAccounts',
    })) as { accounts?: string[]; error?: string };

    if (result.error) {
      throw new Error(result.error);
    }

    this._isConnected = true;
    return result.accounts ?? [];
  }

  /**
   * Get connected accounts (returns empty if not connected).
   */
  async getAccounts(): Promise<string[]> {
    const result = (await this.request({
      method: 'mina_accounts',
    })) as { accounts?: string[] };

    return result.accounts ?? [];
  }

  /**
   * Get account balance.
   */
  async getBalance(address?: string): Promise<string> {
    const result = (await this.request({
      method: 'mina_getBalance',
      params: address ? [address] : [],
    })) as { balance?: string; error?: string };

    if (result.error) {
      throw new Error(result.error);
    }

    return result.balance ?? '0';
  }

  /**
   * Get the current chain ID.
   */
  async getChainId(): Promise<string> {
    const result = (await this.request({
      method: 'mina_chainId',
    })) as { chainId?: string };

    return result.chainId ?? 'unknown';
  }

  /**
   * Send a payment transaction.
   */
  async sendPayment(params: {
    to: string;
    amount: string;
    fee?: string;
    memo?: string;
  }): Promise<{ hash: string }> {
    const result = (await this.request({
      method: 'mina_sendPayment',
      params: [params],
    })) as { hash?: string; error?: string };

    if (result.error) {
      throw new Error(result.error);
    }

    return { hash: result.hash ?? '' };
  }

  /**
   * Send a stake delegation transaction.
   */
  async sendStakeDelegation(params: {
    to: string;
    fee?: string;
  }): Promise<{ hash: string }> {
    const result = (await this.request({
      method: 'mina_sendStakeDelegation',
      params: [params],
    })) as { hash?: string; error?: string };

    if (result.error) {
      throw new Error(result.error);
    }

    return { hash: result.hash ?? '' };
  }

  /**
   * Sign a message.
   */
  async signMessage(params: { message: string }): Promise<{
    signature: string;
    publicKey: string;
  }> {
    const result = (await this.request({
      method: 'mina_signMessage',
      params: [params],
    })) as { signature?: string; publicKey?: string; error?: string };

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      signature: result.signature ?? '',
      publicKey: result.publicKey ?? '',
    };
  }

  /**
   * Sign fields (for zkApp compatibility).
   */
  async signFields(params: { fields: string[] }): Promise<{
    signature: string;
    publicKey: string;
  }> {
    const result = (await this.request({
      method: 'mina_signFields',
      params: [params],
    })) as { signature?: string; publicKey?: string; error?: string };

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      signature: result.signature ?? '',
      publicKey: result.publicKey ?? '',
    };
  }

  // ===========================================================================
  // Internal
  // ===========================================================================

  /**
   * Set up listener for responses from the content script.
   */
  private setupMessageListener(): void {
    window.addEventListener('message', event => {
      if (event.source !== window) {
        return;
      }

      const message = event.data;

      if (message?.type === 'MINA_PROVIDER_RESPONSE') {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);

          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result);
          }
        }
      } else if (message?.type === 'MINA_PROVIDER_READY') {
        console.log('[MinaProvider] Extension ready');
        this.emit('ready');
      }
    });
  }
}

// =============================================================================
// Global Injection
// =============================================================================

// Create and inject the provider
const provider = new MinaProvider();

// Export for type declarations
export { MinaProvider };

// Only inject if not already present
if (typeof window.mina === 'undefined') {
  window.mina = provider;
  console.log('[MinaProvider] window.mina is now available');

  // Dispatch event to notify page that provider is available
  window.dispatchEvent(new Event('mina#initialized'));
} else {
  console.log('[MinaProvider] window.mina already exists, skipping injection');
}
