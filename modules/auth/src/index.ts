export interface AuthProvider {
  isAuthenticated(): boolean;
  getApiKey(service: string): string | undefined;
  setApiKey(service: string, key: string): void;
}

export { LocalAuth } from './localAuth';
