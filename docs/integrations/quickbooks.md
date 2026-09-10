# QuickBooks Online Integration Specification

## 1. Overview & Protocol

FitCore integrates with the Intuit QuickBooks Online (QBO) Accounting API via OAuth 2.0.

- **API Base URL**: `https://quickbooks.api.intuit.com/v3/company/<realmId>/`
- **Identity Base URL**: `https://appcenter.intuit.com/connect/oauth2`
- **Supported Scopes**: `com.intuit.quickbooks.accounting`, `openid`, `profile`, `email`

---

## 2. Company Discovery (Realm ID)

1. During OAuth callback, Intuit delivers the authorization code alongside `realmId`.
2. The `realmId` represents the specific QBO company and is recorded as `AccountingConnection.externalOrganisationId`.
3. All entity operations route to `/v3/company/<realmId>/<entity>`.
4. Token rotation handles rolling refresh tokens (101 days validity) and 60-minute access tokens.

---

## 3. Entity Mapping Conventions

### A. Customers
- FitCore `MemberProfile` -> QuickBooks `Customer`.
- Matched via deterministic customer name or external reference ID stored in `Notes` / `ResaleNum`.
- Strictly excludes sensitive biometric or medical details.

### B. Invoices
- FitCore `Invoice` -> QuickBooks `Invoice`.
- Line items reference Income Accounts or Product/Service Items configured in `AccountingMapping`.
- Sales tax applied via `TxnTaxDetail` according to `AccountingTaxMapping`.

### C. Payments
- FitCore `PaymentTransaction` -> QuickBooks `Payment`.
- References QuickBooks Customer and Invoice; deposits to designated Undeposited Funds or Bank account.

### D. Refunds
- FitCore `PaymentRefund` -> QuickBooks `RefundReceipt` linked to original customer and refund account.
