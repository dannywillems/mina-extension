/**
 * Type declarations for e2e tests.
 */

/**
 * Mina provider interface injected into window.
 */
interface MinaProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getBalance(address?: string): Promise<string>;
  getChainId(): Promise<string>;
  sendPayment(params: {
    to: string;
    amount: string;
    fee?: string;
    memo?: string;
  }): Promise<{ hash: string }>;
  sendStakeDelegation(params: {
    to: string;
    fee?: string;
  }): Promise<{ hash: string }>;
  signMessage(params: { message: string }): Promise<{
    signature: string;
    publicKey: string;
  }>;
  signFields(params: { fields: string[] }): Promise<{
    signature: string;
    publicKey: string;
  }>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
  isConnected: boolean;
}

declare global {
  interface Window {
    mina?: MinaProvider;
  }
}

export {};
