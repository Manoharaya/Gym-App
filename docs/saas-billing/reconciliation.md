# Billing Reconciliation & Audit

Detecting drift between FitCore and external payment providers.

## Scope
`SaasReconciliationService` performs bidirectional audits:
1. **Subscription Cross-check**: Verifies that every active `SaasSubscription` corresponds to an active subscription in Stripe or mock provider. Flags `MISSING_PROVIDER` or `STATUS_MISMATCH`.
2. **Invoice Audit**: Validates that invoices marked `PAID` in FitCore have an outstanding balance of 0 and match settlement records. Flags `AMOUNT_MISMATCH`.

Reports provide actionable discrepancies without mutating database records automatically.
