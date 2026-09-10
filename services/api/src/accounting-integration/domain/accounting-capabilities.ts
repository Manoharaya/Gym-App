/**
 * FitCore — Day 43: Accounting Capabilities Registry
 */

import { AccountingCapability, AccountingProviderType } from '@fitcore/types';

export const XERO_CAPABILITIES: AccountingCapability[] = [
  'CONTACTS',
  'INVOICES',
  'PAYMENTS',
  'REFUNDS',
  'CREDIT_NOTES',
  'TAX_RATES',
  'CHART_OF_ACCOUNTS',
  'WEBHOOKS',
  'ACCOUNTING_SYNC',
];

export const QUICKBOOKS_CAPABILITIES: AccountingCapability[] = [
  'CONTACTS',
  'INVOICES',
  'PAYMENTS',
  'REFUNDS',
  'TAX_RATES',
  'CHART_OF_ACCOUNTS',
  'WEBHOOKS',
  'ACCOUNTING_SYNC',
];

export class AccountingCapabilitiesHelper {
  static getCapabilitiesForProvider(provider: AccountingProviderType): AccountingCapability[] {
    switch (provider) {
      case 'XERO':
        return [...XERO_CAPABILITIES];
      case 'QUICKBOOKS':
        return [...QUICKBOOKS_CAPABILITIES];
      default:
        return ['CONTACTS', 'INVOICES', 'PAYMENTS', 'ACCOUNTING_SYNC'];
    }
  }

  static hasCapability(
    provider: AccountingProviderType,
    capability: AccountingCapability,
  ): boolean {
    return this.getCapabilitiesForProvider(provider).includes(capability);
  }
}
