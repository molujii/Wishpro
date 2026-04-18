import { AuthProvider } from './index';

export class LocalAuth implements AuthProvider {
  private keys: Map<string, string> = new Map();

  isAuthenticated(): boolean {
    return true; // local-only mode is always "authenticated"
  }

  getApiKey(service: string): string | undefined {
    return this.keys.get(service) ?? process.env[`${service.toUpperCase()}_API_KEY`];
  }

  setApiKey(service: string, key: string): void {
    this.keys.set(service, key);
  }
}
