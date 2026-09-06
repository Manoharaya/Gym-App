/**
 * Access Control & Entry Types
 * Manages door access, QR badge scanning, and NFC turnstile authentication.
 */

export interface AccessState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
