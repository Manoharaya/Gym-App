# Day 43 — Existing Financial & Integration Architecture Audit

## 1. Executive Summary

Day 43 establishes the **Accounting Integration Foundation** connecting FitCore to external general ledgers (**Xero**, **QuickBooks Online**, and future providers). Before implementation, this audit analyzes the existing financial source-of-truth, security, events, outbox, and infrastructure built across Days 1–42 to ensure architectural continuity and zero duplication.

---

## 2. Existing Financial Source-of-Truth Models

FitCore maintains a single, authoritative financial source of truth:

| Domain | Model Name | Table Name | Authoritative Purpose |
| :--- | :--- | :--- | :--- |
| **Day 5 (Memberships)** | `MembershipPlan` | `membership_plans` | Product catalog, billing frequency, retail price |
| **Day 5 (Memberships)** | `MemberMembership` | `member_memberships` | Subscription contract, access scope, renewal date |
| **Day 6 (Payments)** | `Invoice` | `invoices` | Sole ledger of financial debt and payment state (`totalMinor`, `amountPaidMinor`, `amountDueMinor`) |
| **Day 6 (Payments)** | `InvoiceLineItem` | `invoice_line_items` | Itemized charges, plan references, tax and discount breakdowns |
| **Day 6 (Payments)** | `PaymentTransaction` | `payment_transactions` | Immutable record of real-world money movement (`SUCCEEDED`, `FAILED`, `REFUNDED`) |
| **Day 6 (Payments)** | `PaymentRefund` | `payment_refunds` | Refund records linked directly to payment transactions |
| **Day 6 (Payments)** | `PaymentMethod` | `payment_methods` | Tokenized payment credentials (zero raw PAN or CVV) |
| **Day 41 (Finance)** | `FinancialTransactionReference` | `financial_transaction_references` | Projected financial index and checksum verification |
| **Day 41 (Finance)** | `FinancialDailySummary` | `financial_daily_summaries` | Pre-aggregated daily reporting buckets |
| **Day 42 (Billing)** | `BillingSchedule` | `billing_schedules` | Recurring cadence, next billing dates, lifecycle |
| **Day 42 (Billing)** | `BillingCycle` | `billing_cycles` | Historical period snapshots linked 1:1 to Day 6 `Invoice` |
| **Day 42 (Billing)** | `PaymentAttempt` | `payment_attempts` | Execution audit trail with failure classification |
| **Day 42 (Billing)** | `DunningCase` | `dunning_cases` | Recovery state machine and reminder tracking |

> [!IMPORTANT]
> **Source-of-Truth Rule**: External accounting platforms are **integration destinations**, never primary ledgers. Invoices, payments, and refunds originate inside FitCore. External platforms cannot overwrite operational state (memberships, bookings, access control).

---

## 3. Existing Security, Encryption & Token Management

1. **AES-256-GCM Encryption Foundation**:
   - `TokenEncryptionService` (`services/api/src/wearables/security/token-encryption.service.ts`) implements authenticated encryption with random 16-byte IVs, 16-byte auth tags, and SHA-256 derived keys (`iv:authTag:encryptedHex`).
   - Day 43 adapts this standard into `AccountingCredentialService` to protect OAuth access tokens and refresh tokens at rest in `AccountingConnection`.
2. **Token Sanitization**:
   - Plaintext tokens are scrubbed from NestJS response envelopes (`TransformInterceptor`) and never logged.
3. **Multi-Tenant Isolation**:
   - In accordance with ADR-001 and ADR-033, accounting connections are scoped to `Organisation`. Outlets can optionally configure department/account mappings, but credentials and sync jobs belong to the organisation.

---

## 4. Existing Event, Outbox & Asynchronous Architecture

1. **Event Driven Pipeline**:
   - Authoritative financial events (`INVOICE_CREATED`, `INVOICE_PAID`, `PAYMENT_SUCCEEDED`, `PAYMENT_REFUNDED`) are published during payment and billing lifecycles.
   - Day 43 consumes these domain events asynchronously to enqueue synchronization tasks.
2. **Outbox & Worker Safety**:
   - Core payment transactions must **never synchronously call external accounting APIs**. Network latency or provider outages (Xero 503, QuickBooks 429) must never abort a member checkout or recurring billing charge.
3. **Redis & Distributed Locking**:
   - `RedisService` (`services/api/src/redis/redis.service.ts`) provides distributed mutexes with automatic in-memory fallback for local dev and testing. Prevents concurrent full syncs on the same connection.

---

## 5. Existing Webhook & Communication Infrastructure

1. **Webhook Ingestion**:
   - Payment webhooks (`PaymentWebhookService`) utilize cryptographic HMAC signature validation and timestamp verification to prevent replay attacks.
   - Day 43 follows this pattern for inbound accounting webhooks.
2. **Communications Decoupling**:
   - Notifications route exclusively through Day 28 `NotificationOrchestratorService`. Accounting errors do not spam members; notifications are restricted to internal staff alerts.

---

## 6. Identified Gaps & Day 43 Additions

| Component | Existing State | Day 43 Addition |
| :--- | :--- | :--- |
| **Accounting Provider Abstraction** | None (only Payment providers exist) | `AccountingProvider` interface & `AccountingProviderRegistry` |
| **Provider Implementations** | None | `XeroAccountingProvider` & `QuickBooksAccountingProvider` |
| **Credential Storage** | Wearable tokens only | `AccountingConnection` with encrypted OAuth tokens |
| **Mapping Engine** | None | `AccountingMapping` (Chart of Accounts & Categories) & `AccountingTaxMapping` |
| **External ID Index** | Payment provider transaction ID only | `AccountingExternalReference` mapping FitCore IDs to Xero/QBO IDs |
| **Synchronization Tracking** | Recurring billing jobs only | `AccountingSyncJob` & `AccountingSyncRecord` with retry state machine |
| **Reconciliation Engine** | Financial daily summary checksums | `AccountingReconciliationService` comparing FitCore ledger vs external ledger |
| **Conflict Management** | None | `AccountingConflictService` for non-destructive variance reporting |
| **Accounting APIs** | None | REST endpoints under `/api/v1/accounting/*` |
