# Payment & Financial Reconciliation Recovery Guide

## 1. Primary Invariant
> **CRITICAL INVARIANT**: Under no circumstances should FitCore automatically charge a member again if a transaction is in `UNKNOWN`, `PROCESSING`, or `PENDING` state following a disaster or restore!

Double-charging members damages gym reputation, triggers credit card chargebacks, and violates PCI-DSS/consumer protection laws.

---

## 2. In-Flight State Matrix

| State Before Disaster | Strategy on Restore | Action Taken |
| :--- | :--- | :--- |
| **COMPLETED / SUCCEEDED** | Authoritative | Retain state. Do not re-process. |
| **FAILED** | Authoritative | Retain state. Member or automated dunning job can re-attempt when appropriate. |
| **PENDING / PROCESSING** | Provider Reconciliation Required | 1. Check idempotencyKey against succeeded transactions.<br>2. If duplicate exists, mark `FAILED` (`RECONCILIATION_SUPPRESSED`).<br>3. If gateway provider transaction ID exists, poll Stripe/GoCardless API.<br>4. If gateway reports charged, update to `SUCCEEDED`.<br>5. If gateway reports uncharged, mark `REQUIRES_ACTION` for manual finance review. |

---

## 3. Recurring Billing Cycle Protection

When background billing workers recover:
1. Every scheduled charge executes within a transaction guarded by unique idempotency keys (`sub_bill_${cycleId}_${date}`).
2. If the cycle was already finalized prior to disaster, the worker detects the existing transaction and skips re-execution.
3. Overages are metered against usage counters stored in PostgreSQL; restored records prevent re-invoicing.
