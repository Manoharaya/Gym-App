# FitCore Financial & Billing Architecture (Day 6)

## 1. Domain Overview

The FitCore Payments & Billing foundation provides a multi-tenant, provider-agnostic financial infrastructure that supports subscriptions, one-time charges, recurring direct debits, manual in-gym payments (Cash/POS), refunds, discounts, and webhook reconciliation.

### Core Architectural Principle: Decoupled Ownership

> **Payment records financial events. Payment does NOT own Membership.**

- **Organisation** owns `MembershipPlan`.
- **Member** holds `MemberMembership` (commercial entitlement to facility access).
- **Billing / Invoices** track receivables and amounts due.
- **PaymentTransactions** record gateway or manual ledger executions.
- **Payment-Membership Bridge** (`PaymentMembershipBridge`) listens to invoice settlement events (`onInvoicePaid`) and invokes `MembershipLifecycleService.activate()` or `MembershipRenewalService.renewMembership()`.
- The payment engine **never** directly updates `MemberMembership.status`.

---

## 2. Integer Minor Currency Units

All monetary values across the database, APIs, calculations, and mobile applications are strictly stored and computed as **integers in minor currency units** (e.g. cents for AUD, USD, EUR):

- `$119.99` $\rightarrow$ `11999`
- `$50.00` $\rightarrow$ `5000`
- `$0.00` $\rightarrow$ `0`

Floating-point numbers (`Float`, `Double`) are prohibited for monetary calculations, eliminating IEEE-754 rounding drift. `BillingCalculationService` and `MoneyUtil` handle addition, subtraction, multiplication, and percentage tax/discount calculations with deterministic rounding.

---

## 3. Provider Abstraction (`IPaymentProvider`)

To ensure FitCore is not locked into a single payment gateway (such as Stripe), all provider integrations implement the `IPaymentProvider` contract:

```typescript
export interface IPaymentProvider {
  readonly providerName: string;
  charge(request: PaymentIntentRequest): Promise<PaymentIntentResult>;
  refund(request: RefundRequest): Promise<RefundResult>;
  verifyWebhook(headers: Record<string, any>, rawBody: string | Buffer): Promise<WebhookVerificationResult>;
}
```

### Registered Providers:
1. **`MockPaymentProvider` (`MOCK`)**:
   - Local simulation for automated e2e testing and staging.
   - Simulates successes, declines (`CARD_DECLINED`), 3D-Secure actions (`REQUIRES_ACTION`), and refunds.
2. **`ManualPaymentProvider` (`MANUAL`)**:
   - Records in-gym front-desk cash, card terminal (EFTPOS/POS), or direct bank transfer payments.
   - Audits the staff member recording the transaction.
3. **Future Extensibility**:
   - Stripe, PayPal, GoCardless, Adyen can be plugged in by implementing `IPaymentProvider` and registering in `PaymentProviderFactory` without altering core domain logic.

---

## 4. Idempotency Protocol

To prevent double-charging on mobile retries or network drops:
1. Mobile clients send an `Idempotency-Key` header with each charge request.
2. `IdempotencyService` checks `idempotency_records` table (`organisationId + idempotencyKey`).
3. If already processed within 24 hours, returns the cached response with `_isIdempotentReplay: true`.
4. If new, executes transaction and stores the response in an atomic record.

---

## 5. Webhook Processing & Deduplication

1. Gateways send asynchronous event notifications to `/api/v1/webhooks/:provider`.
2. Signature verification is performed by `provider.verifyWebhook()`.
3. Replay attack protection checks `payment_webhook_events` (`provider + providerEventId`).
4. Duplicate events return `200 OK` with `status: 'IGNORED'`.
5. Valid payment confirmations trigger `PaymentMembershipBridge.onInvoicePaid()`.

---

## 6. Financial Refund Lifecycle

- Full and partial refunds are supported via `POST /api/v1/payments/refund`.
- **Cumulative Cap Enforcement**: Cumulative successful refunds for a transaction cannot exceed the original `amountMinor`.
- If partial: transaction status transitions to `PARTIALLY_REFUNDED`; linked invoice `amountPaidMinor` decreases, `amountDueMinor` increases, and invoice re-opens if it was `PAID`.
- If full: transaction status transitions to `REFUNDED`.
