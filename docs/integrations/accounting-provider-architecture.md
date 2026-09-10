# Accounting Provider Architecture

## 1. Provider-Neutral Abstraction Principle

FitCore integrates with external accounting platforms using a decoupled adapter pattern:

```text
FITCORE CORE SERVICES
         │
         ▼
AccountingProvider (Interface)
         ├── getOrganisation()
         ├── getAccounts()
         ├── getTaxRates()
         ├── createContact() / updateContact()
         ├── createInvoice() / updateInvoice()
         ├── createPayment()
         ├── createRefund()
         └── getInvoice() / getPayment()
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
XeroAccountingProvider    QuickBooksAccountingProvider
(OAuth, Tenant discovery,  (OAuth, Company discovery,
 Acc codes, Tax types)      Income accounts, Items)
```

No core service ever references provider-specific SDKs, data models, or HTTP endpoints directly.

---

## 2. Capabilities Interrogation

Because accounting platforms exhibit differing feature sets, providers declare their capabilities through the `AccountingProviderCapabilities` registry:

```typescript
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
```

Feature code interrogates capabilities before executing actions:
```typescript
if (!provider.getCapabilities().includes('REFUNDS')) {
  // Gracefully fallback to credit note or manual notice
}
```

---

## 3. Provider Registry

The `AccountingProviderRegistry` dynamically resolves adapters based on the organisation's active connection:

```typescript
@Injectable()
export class AccountingProviderRegistry {
  constructor(
    private readonly xeroProvider: XeroAccountingProvider,
    private readonly quickBooksProvider: QuickBooksAccountingProvider,
  ) {}

  getProvider(providerType: AccountingProviderType): AccountingProvider {
    switch (providerType) {
      case 'XERO':
        return this.xeroProvider;
      case 'QUICKBOOKS':
        return this.quickBooksProvider;
      default:
        throw new BadRequestException(`Unsupported accounting provider '${providerType}'`);
    }
  }
}
```

This factory allows adding future providers (MYOB, Sage, NetSuite) without modifying existing synchronization logic.
