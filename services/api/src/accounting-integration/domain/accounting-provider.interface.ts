/**
 * FitCore — Day 43: Accounting Provider Interface
 *
 * Provider-neutral contract that all external accounting platform adapters
 * (Xero, QuickBooks, future providers) must implement.
 */

import {
  AccountingAccountDto,
  AccountingTaxRateDto,
  AccountingCapability,
} from '@fitcore/types';

export interface ExternalCustomerInput {
  fitcoreMemberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface ExternalInvoiceLineItemInput {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  totalMinor: number;
  accountCode?: string;
  taxIdentifier?: string;
}

export interface ExternalInvoiceInput {
  fitcoreInvoiceId: string;
  invoiceNumber: string;
  externalCustomerId: string;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  lineItems: ExternalInvoiceLineItemInput[];
}

export interface ExternalPaymentInput {
  fitcorePaymentId: string;
  externalInvoiceId: string;
  externalCustomerId: string;
  amountMinor: number;
  currency: string;
  paidAt: Date;
  paymentMethodType: string;
  clearingAccountCode?: string;
  reference?: string;
}

export interface ExternalRefundInput {
  fitcoreRefundId: string;
  fitcorePaymentId: string;
  externalInvoiceId: string;
  externalCustomerId: string;
  amountMinor: number;
  currency: string;
  refundedAt: Date;
  reason?: string;
  refundAccountCode?: string;
}

export interface ExternalSyncResult {
  externalId: string;
  externalVersion?: string;
  status: 'SYNCED' | 'FAILED' | 'SKIPPED';
  metadata?: any;
}

export interface AccountingProvider {
  /**
   * Unique provider identifier.
   */
  readonly providerType: 'XERO' | 'QUICKBOOKS' | 'OTHER';

  /**
   * Supported capabilities reported by the provider.
   */
  getCapabilities(): AccountingCapability[];

  /**
   * Generates OAuth authorization URL.
   */
  getAuthorizationUrl(state: string, redirectUri: string): Promise<string>;

  /**
   * Exchanges authorization code for access and refresh tokens.
   */
  exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
    externalOrganisationId: string;
    externalOrganisationName?: string;
    scope?: string;
  }>;

  /**
   * Refreshes an expired access token using the refresh token.
   */
  refreshToken(
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
  }>;

  /**
   * Retrieves active Chart of Accounts.
   */
  getAccounts(accessToken: string, externalOrgId: string): Promise<AccountingAccountDto[]>;

  /**
   * Retrieves configured tax rates.
   */
  getTaxRates(accessToken: string, externalOrgId: string): Promise<AccountingTaxRateDto[]>;

  /**
   * Creates or updates a customer/contact in the accounting platform.
   */
  syncCustomer(
    accessToken: string,
    externalOrgId: string,
    customer: ExternalCustomerInput,
    existingExternalId?: string,
  ): Promise<ExternalSyncResult>;

  /**
   * Synchronizes an invoice to the accounting platform.
   */
  syncInvoice(
    accessToken: string,
    externalOrgId: string,
    invoice: ExternalInvoiceInput,
    existingExternalId?: string,
  ): Promise<ExternalSyncResult>;

  /**
   * Synchronizes a payment transaction to the accounting platform.
   */
  syncPayment(
    accessToken: string,
    externalOrgId: string,
    payment: ExternalPaymentInput,
    existingExternalId?: string,
  ): Promise<ExternalSyncResult>;

  /**
   * Synchronizes a refund to the accounting platform.
   */
  syncRefund(
    accessToken: string,
    externalOrgId: string,
    refund: ExternalRefundInput,
    existingExternalId?: string,
  ): Promise<ExternalSyncResult>;

  /**
   * Verifies inbound webhook signatures.
   */
  verifyWebhookSignature?(rawBody: string, signature: string, secret: string): boolean;
}
