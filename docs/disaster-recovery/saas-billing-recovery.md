# SaaS Billing & Organisation Plans Recovery Guide

## 1. Scope & Isolation
SaaS billing (Day 55) governs commercial subscriptions between FitCore and gym organisations (e.g. Starter, Growth, Enterprise plans).

---

## 2. Invariants Preserved Post-Restore
1. **Entitlements & Limits Intact**:
   - `saas_subscriptions` remain linked to immutable `saas_plans`.
   - Restoring a backup does not reset organisation resource limits or revoke active outlets.
2. **Deterministic Proration**:
   - Upgrades and downgrades calculate proration based on UTC timestamps recorded in `saas_invoices`.
3. **Usage Metering Rollup**:
   - Usage events are ingested idempotently using `idempotencyKey`; replaying missed metering records does not double-count.
