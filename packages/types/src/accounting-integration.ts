/**
 * FitCore — Day 43: Accounting Integration & Financial Synchronisation Contracts
 *
 * Establishes provider-neutral contracts for connecting FitCore to external
 * general ledgers (Xero, QuickBooks Online, future providers).
 */

export type AccountingProviderType = 'XERO' | 'QUICKBOOKS' | 'OTHER';

export type AccountingConnectionStatus =
  | 'PENDING'
  | 'CONNECTED'
  | 'AUTHENTICATION_REQUIRED'
  | 'SYNCING'
  | 'ERROR'
  | 'DISCONNECTED'
  | 'REVOKED';

export type AccountingCapability =
  | 'CONTACTS'
  | 'INVOICES'
  | 'PAYMENTS'
  | 'REFUNDS'
  | 'CREDIT_NOTES'
  | 'TAX_RATES'
  | 'CHART_OF_ACCOUNTS'
  | 'WEBHOOKS'
  | 'ACCOUNTING_SYNC';

export type AccountingMappingType =
  | 'REVENUE_ACCOUNT'
  | 'RETAIL_REVENUE_ACCOUNT'
  | 'MEMBERSHIP_REVENUE_ACCOUNT'
  | 'PERSONAL_TRAINING_REVENUE_ACCOUNT'
  | 'CLASS_REVENUE_ACCOUNT'
  | 'OTHER_REVENUE_ACCOUNT'
  | 'TAX_RATE'
  | 'PAYMENT_ACCOUNT'
  | 'REFUND_ACCOUNT';

export type AccountingSyncType =
  | 'INITIAL_SYNC'
  | 'INVOICE_SYNC'
  | 'PAYMENT_SYNC'
  | 'REFUND_SYNC'
  | 'CONTACT_SYNC'
  | 'FULL_SYNC'
  | 'INCREMENTAL_SYNC'
  | 'RECONCILIATION';

export type AccountingSyncStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type AccountingRecordStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SYNCED'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED'
  | 'CONFLICT';

export type AccountingRecordOperation =
  | 'CREATE'
  | 'UPDATE'
  | 'SKIP'
  | 'RETRY'
  | 'FAILED';

export type AccountingConflictType =
  | 'AMOUNT_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'EXTERNAL_DELETION'
  | 'EXTERNAL_MODIFICATION'
  | 'TAX_MISMATCH'
  | 'MAPPING_MISMATCH';

export type AccountingConflictStatus =
  | 'UNRESOLVED'
  | 'RESOLVED'
  | 'IGNORED';

export type AccountingReconciliationStatus =
  | 'MATCHED'
  | 'MISSING_EXTERNAL'
  | 'MISSING_FITCORE'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'DUPLICATE'
  | 'STALE'
  | 'CONFLICT'
  | 'UNRESOLVED'
  | 'RESOLVED';

export type AccountingErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'MAPPING_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PROVIDER_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'DUPLICATE'
  | 'UNSUPPORTED_OPERATION'
  | 'UNKNOWN';

// =============================================================================
// DTOs
// =============================================================================

export interface AccountingAccountDto {
  id: string;
  code: string;
  name: string;
  type: string;
  currency?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  description?: string;
}

export interface AccountingTaxRateDto {
  id: string;
  code: string;
  name: string;
  rate: number; // e.g. 10 for 10%
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface AccountingConnectionDto {
  id: string;
  organisationId: string;
  provider: AccountingProviderType;
  status: AccountingConnectionStatus;
  externalOrganisationId?: string | null;
  externalOrganisationName?: string | null;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
  tokenExpiresAt?: string | null;
  syncVersion: number;
  capabilities: AccountingCapability[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountingMappingDto {
  id: string;
  organisationId: string;
  connectionId: string;
  mappingType: AccountingMappingType;
  fitcoreReference: string;
  externalReference: string;
  externalName?: string | null;
  outletId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingTaxMappingDto {
  id: string;
  organisationId: string;
  connectionId: string;
  fitcoreTaxIdentifier: string;
  externalTaxIdentifier: string;
  externalTaxRate?: number | null;
  provider: AccountingProviderType;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingExternalReferenceDto {
  id: string;
  organisationId: string;
  connectionId: string;
  entityType: string;
  fitcoreEntityId: string;
  externalEntityId: string;
  externalVersion?: string | null;
  syncStatus: string;
  lastSyncedAt: string;
}

export interface AccountingSyncJobDto {
  id: string;
  organisationId: string;
  connectionId: string;
  syncType: AccountingSyncType;
  status: AccountingSyncStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorCount: number;
  errorMessage?: string | null;
  triggeredBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingSyncRecordDto {
  id: string;
  syncJobId: string;
  organisationId: string;
  entityType: string;
  fitcoreEntityId: string;
  externalEntityId?: string | null;
  operation: AccountingRecordOperation;
  status: AccountingRecordStatus;
  attemptCount: number;
  errorCategory?: string | null;
  errorMessage?: string | null;
  lastAttemptedAt: string;
  completedAt?: string | null;
}

export interface AccountingConflictDto {
  id: string;
  organisationId: string;
  connectionId: string;
  entityType: string;
  fitcoreEntityId: string;
  externalEntityId?: string | null;
  conflictType: AccountingConflictType;
  fitcoreValue?: string | null;
  externalValue?: string | null;
  status: AccountingConflictStatus;
  resolutionNotes?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingReconciliationReportDto {
  id: string;
  organisationId: string;
  connectionId: string;
  status: string;
  matchedCount: number;
  missingExternalCount: number;
  missingFitcoreCount: number;
  amountMismatchCount: number;
  statusMismatchCount: number;
  currencyMismatchCount: number;
  details?: any;
  runAt: string;
  triggeredBy?: string | null;
}

export interface AccountingHealthDto {
  organisationId: string;
  provider: AccountingProviderType | null;
  status: AccountingConnectionStatus;
  isTokenValid: boolean;
  tokenExpiresInSeconds?: number | null;
  lastSuccessfulSyncAt?: string | null;
  failedSyncsCount: number;
  unresolvedConflictsCount: number;
  reconciliationMismatchCount: number;
  systemHealthRating: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISCONNECTED';
}

export interface AccountingSyncPreviewDto {
  organisationId: string;
  pendingInvoices: number;
  pendingPayments: number;
  pendingRefunds: number;
  pendingContacts: number;
  totalEntitiesToSync: number;
  missingMappingsCount: number;
  hasRequiredMappings: boolean;
  warnings: string[];
}
