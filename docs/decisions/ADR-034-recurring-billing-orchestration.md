# ADR-034: Recurring Billing & Collections Orchestration Architecture

## Status
Accepted

## Date
2026-09-10

## Context
FitCore requires automated recurring subscription billing for memberships, payment attempts, retry logic, dunning workflows, customer communications, and staff collection management.
The system previously implemented:
- Day 5: Member memberships and membership plans.
- Day 6: Authoritative Payments, Invoices, PaymentMethods, and PaymentTransactions.
- Day 28: Communication Engine.
- Day 30: Automated Workflows & Staff Task integrations.
- Day 41: Financial Intelligence analytics.

The key architectural risk was creating a duplicate ledger or secondary billing tables that diverge from Day 6 authoritative financial records.

## Decision
1. **Orchestration, Not Duplicate Ledger**:
   - `PaymentTransaction` and `Invoice` remain the sole authoritative financial source-of-truth.
   - `BillingSchedule`, `BillingCycle`, and `PaymentAttempt` are orchestration and auditing references.
2. **Double-Charge Prevention**:
   - Every recurring attempt is guarded by a deterministic idempotency key (`rec_attempt_${cycle.id}_${attemptNumber}`).
   - Relational database unique constraints (`billingScheduleId + cycleNumber`, `billingCycleId + attemptNumber`) guarantee that concurrent workers cannot double-bill.
3. **Decoupled Physical Access**:
   - Failed billing attempts do NOT directly revoke physical turnstile access.
   - Any access changes are governed by the organisation's `BillingPolicy` (grace periods) and flow through Day 5 `MembershipLifecycleService` and Day 7 `AccessDecisionService`.
4. **Authoritative Communication Flow**:
   - Dunning messages must never call Twilio or SendGrid directly. All reminders dispatch via Day 28 `NotificationOrchestratorService`.
5. **Deterministic Intelligence**:
   - All collection prioritizations, retry policies, and metrics are deterministic. Zero AI or LLM calls are used for billing decisions.

## Consequences
- **Positive**: Zero risk of dual-ledger financial drift; airtight double-charge protection; robust auditability; compliance with user communication preferences.
- **Negative**: Recurring payment operations require coordinating across multiple services (Invoice, PaymentTransaction, Dunning, Communication).
