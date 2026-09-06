/**
 * Payments & Billing Types
 * Processes direct debits, card transactions, invoices, and Xero sync.
 */

export interface PaymentsState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
