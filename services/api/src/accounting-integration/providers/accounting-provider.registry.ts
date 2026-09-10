/**
 * FitCore — Day 43: Accounting Provider Registry
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { AccountingProvider } from '../domain/accounting-provider.interface';
import { XeroAccountingProvider } from './xero.provider';
import { QuickBooksAccountingProvider } from './quickbooks.provider';
import { AccountingProviderType } from '@fitcore/types';

@Injectable()
export class AccountingProviderRegistry {
  constructor(
    private readonly xeroProvider: XeroAccountingProvider,
    private readonly quickBooksProvider: QuickBooksAccountingProvider,
  ) {}

  getProvider(providerType: AccountingProviderType | string): AccountingProvider {
    const normalized = providerType?.toUpperCase();
    switch (normalized) {
      case 'XERO':
        return this.xeroProvider;
      case 'QUICKBOOKS':
        return this.quickBooksProvider;
      default:
        throw new BadRequestException(
          `Accounting provider '${providerType}' is not supported. Supported providers: XERO, QUICKBOOKS.`,
        );
    }
  }

  getSupportedProviders(): AccountingProviderType[] {
    return ['XERO', 'QUICKBOOKS'];
  }
}
