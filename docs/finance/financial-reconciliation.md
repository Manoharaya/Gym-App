# Financial Reconciliation Architecture

## Overview

The FitCore Financial Intelligence layer provides an automated projection reconciliation engine (`FinancialReconciliationService`).

Its primary purpose is to ensure that the read-optimized financial projection table (`FinancialTransactionReference`) perfectly mirrors the authoritative `PaymentTransaction` and `PaymentRefund` records from Day 6 without discrepancies.

---

## Reconciliation Pipeline

1. **Source Collection**:
   - Queries `PaymentTransaction` records for the target organization, matching optional date range and currency filters.
   - Includes relations: `refunds`, `invoice`, and `memberMembership`.

2. **Projection Alignment**:
   - Compares authoritative count against existing `FinancialTransactionReference` rows.
   - Compares total gross and refund minor amounts between authoritative source and projection.

3. **Idempotent Upsert / Self-Healing**:
   - If missing projections or discrepancies are detected, `FinancialReconciliationService.reconcileScope()` executes an idempotent `upsert` for each transaction into `FinancialTransactionReference`.
   - Populates:
     - `amountMinor`
     - `currency`
     - `status`
     - `organisationId`
     - `outletId` (anchored to `memberMembership.originOutletId` or `null`)
     - `membershipPlanId`
     - `refundedAmountMinor`

4. **Audit Logging**:
   - Upon completion, records an authoritative audit entry:
     - Action: `FINANCIAL_RECONCILIATION_COMPLETED`
     - Entity: `FinancialTransactionReference`
     - Metadata: `{ transactionsProcessed, projectionsCreated, discrepanciesResolved }`
