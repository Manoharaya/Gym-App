# Xero Integration Specification

## 1. Overview & Protocol

FitCore integrates with the Xero Accounting API via OAuth 2.0 with PKCE and offline access (refresh tokens).

- **API Base URL**: `https://api.xero.com/api.xro/2.0/`
- **Identity Base URL**: `https://identity.xero.com/connect/`
- **Supported Scopes**: `openid`, `profile`, `email`, `accounting.transactions`, `accounting.contacts`, `accounting.settings`, `offline_access`

---

## 2. Tenant Discovery & Token Management

1. Following OAuth token exchange, FitCore queries `https://api.xero.com/connections` to discover authorized `tenantId` (Xero Organisation ID).
2. The `tenantId` is stored in `AccountingConnection.externalOrganisationId`.
3. In requests, Xero requires the header: `Xero-Tenant-Id: <externalOrganisationId>`.
4. Refresh tokens are single-use with a rolling expiration (60 days) and 30-minute access token validity. FitCore automatically refreshes expiring tokens prior to sync jobs.

---

## 3. Entity Mapping Conventions

### A. Contacts
- FitCore `MemberProfile` -> Xero `Contact`.
- Matched via deterministic key: `MemberProfile.id` stored in `Contact.AccountNumber` or external reference.
- Payload includes only: `Name`, `EmailAddress`, `Addresses` (Billing).

### B. Invoices
- FitCore `Invoice` -> Xero `Invoice` (Type: `ACCREC`).
- Line items include account codes from `AccountingMapping` (e.g., Code `200` for Sales, `260` for Memberships).
- Tax types mapped via `AccountingTaxMapping` (e.g. `OUTPUT`, `EXEMPT`).

### C. Payments
- FitCore `PaymentTransaction` -> Xero `Payment`.
- Links to Xero Invoice ID and specified Bank/Clearing Account from `AccountingMapping`.

### D. Refunds
- FitCore `PaymentRefund` -> Xero `CreditNote` allocated to original invoice or direct overpayment refund.
