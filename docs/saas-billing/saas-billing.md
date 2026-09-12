# FitCore SaaS Billing & Organisation Plans Documentation

Comprehensive guide for Day 55 commercial SaaS billing architecture.

## Overview
FitCore SaaS Billing governs the commercial relationship between FitCore (the SaaS platform) and customer gym organisations subscribing to the platform.

```
FITCORE PLATFORM
      ↓
ORGANISATION
      ↓
SAAS PLAN & VERSION
      ↓
SUBSCRIPTION
      ↓
ENTITLEMENTS & QUOTAS
      ↓
USAGE METERS (AI, COMM, VOICE, API)
      ↓
PERIOD FINALIZATION
      ↓
SAAS INVOICE (IMMUTABLE)
      ↓
PAYMENT COLLECTION
```

## Key Modules
1. **Plans & Versions**: `SaasPlansService` manages plans and immutable versions.
2. **Subscriptions**: `SaasSubscriptionsService` manages state machines (`TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`).
3. **Usage Limits**: `SaasUsageLimitService` provides fail-closed quota enforcement.
4. **Idempotent Ingestion**: `SaasUsageService` ingests usage events and tracks period aggregates.
5. **Invoices**: `SaasInvoicesService` finalizes billing periods and compiles immutable itemized lines.
6. **Proration**: `SaasProrationService` calculates exact minor-cent mid-cycle plan change adjustments.
7. **Dunning**: `SaasDunningService` manages failed payment retries and graceful administrative suspensions.
8. **Reconciliation**: `SaasReconciliationService` cross-checks internal states against payment providers.
