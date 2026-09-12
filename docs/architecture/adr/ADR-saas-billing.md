# ADR 055: FitCore SaaS Billing & Commercial Organisation Plans

## Status
Accepted

## Context
FitCore requires a commercial SaaS billing layer where **FitCore bills the Gym/Organisation**. Historically, Days 5, 6, and 42 introduced member billing where **Gym bills the Member** (`Organisation -> MemberProfile -> MemberMembership -> Invoice -> PaymentTransaction`).

It was critical to prevent domain pollution:
1. SaaS billing models must never overwrite, mutate, or share state with gym member billing records.
2. A gym falling past-due on their FitCore SaaS plan must never cause arbitrary immediate revocation of member physical door access credentials.
3. Currency calculations must strictly prevent IEEE-754 floating-point inaccuracies.

## Decisions
1. **Architectural Isolation**:
   Created a dedicated `services/api/src/saas-billing/` module and distinct database models (`SaasPlan`, `SaasPlanVersion`, `SaasPlanEntitlement`, `SaasSubscription`, `SaasBillingCustomer`, `SaasInvoice`, `SaasInvoiceLine`, `SaasUsageMeter`, `SaasUsageEvent`, `SaasUsageAggregate`, `SaasBillingPeriod`, `SaasCreditBalance`, `SaasCreditTransaction`).
2. **Deterministic Minor Units**:
   All monetary amounts are strictly modeled as integer minor units (cents) via `MoneyUtil`. No floating point money is permitted.
3. **Immutable Finalization**:
   Once generated and finalized at period end, `SaasInvoice` and its `SaasInvoiceLine` items are immutable. Adjustments, promotional credits, and discounts use explicit ledgers (`SaasCreditBalance` / `SaasCreditTransaction`).
4. **Fail-Closed Entitlements**:
   `SaasUsageLimitService` and `SaasEntitlementService` evaluate active subscription versions. If an organisation has no active subscription or unknown quota, the system fails closed (`PLAN_REQUIRED` or `LIMIT_REACHED`).
5. **Graceful SaaS Dunning Policy**:
   Overdue SaaS invoices trigger retry schedules (Day 0, 2, 5, 8) and administrative warning notices. Gym member door credentials and memberships remain completely untouched.

## Consequences
- Clean commercial separation between platform revenue and gym operational revenue.
- Safe, audit-compliant subscription versioning preserving historical pricing.
- Complete compatibility with superadmin observability and multi-tenant security boundaries.
