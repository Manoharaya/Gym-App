# Member Recurring Billing Recovery Guide

## 1. Scope & Isolation
Member recurring billing (Day 6 / Day 42) is owned by gym organisations billing individual gym members. It must never be confused with SaaS billing (FitCore billing the gym organisation).

---

## 2. Invariant Checklist Post-Disaster
1. **No Duplicate Invoices**:
   - Billing cycles check for existing `Invoice` records matching `(billingScheduleId, cycleStartDate)`.
2. **No Double Charges**:
   - Payment attempts enforce idempotency keys: `sub_charge_${scheduleId}_${periodStart}`.
3. **Grace Period Extension**:
   - If recurring billing was paused due to downtime, dunning grace periods are extended by the duration of the outage to prevent false member suspension.
