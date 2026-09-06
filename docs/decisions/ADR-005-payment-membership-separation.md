# ADR-005: Decoupled Separation of Payment and Membership Domains

## Status
Accepted

## Context
FitCore is an enterprise multi-tenant fitness platform supporting subscriptions, recurring direct debits, in-gym retail, personal training sessions, and access turnstiles.
In typical monolithic gym management systems, payment engines directly mutate membership status, creating tight coupling where:
1. Failed payments corrupt member profiles.
2. The membership domain cannot support manual payments, third-party ledger integrations, or corporate sponsorships.
3. Financial reconciliation bugs lead to accidental facility lockouts or unauthorized entries.

## Decision
1. **Ownership Model Locked**:
   - `Organisation` owns `MembershipPlan`.
   - `Member` receives `MemberMembership` (commercial entitlement).
   - Payment is an independent financial domain:
     `Organisation` $\rightarrow$ `Member` $\rightarrow$ `MemberMembership` $\rightarrow$ `Invoice` $\rightarrow$ `PaymentTransaction` $\rightarrow$ `PaymentProvider`.
2. **Decoupled Bridge Architecture**:
   - `PaymentTransactionService` and `InvoiceService` record financial state.
   - When an invoice tied to a `memberMembershipId` is settled (`PAID`), `PaymentMembershipBridge.onInvoicePaid()` invokes `MembershipLifecycleService.activate()` or `MembershipRenewalService.renewMembership()`.
   - The payment domain never writes directly to the `member_memberships` table.
3. **Provider-Agnostic Interface**:
   - Core domain code never imports gateway-specific SDKs (e.g. Stripe, PayPal, Adyen).
   - All gateway communication routes through `IPaymentProvider` contract resolved dynamically by `PaymentProviderFactory`.
4. **Minor Currency Units**:
   - Zero floating-point numbers in the ledger. All calculations are executed in integer minor units (cents) via deterministic math.

## Consequences
### Positive
- Gateways can be changed or added per country/tenant without modifying membership or access control business logic.
- Robust financial auditing, idempotency, and anti-IDOR security.
- Clear separation of concerns simplifies testing and compliance (PCI-DSS scope minimization).

### Negative
- Requires maintaining an explicit bridge service (`PaymentMembershipBridge`) rather than direct database updates.
