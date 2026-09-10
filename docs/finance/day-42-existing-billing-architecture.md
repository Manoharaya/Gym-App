# Day 42 — Existing Billing Architecture & Integration Foundation

## 1. Executive Summary

Day 42 builds the production foundation for **Recurring Billing & Collections** within the FitCore AI-Native Fitness Operating System.
Rather than constructing a secondary billing or payment system, Day 42 acts as a **billing orchestration layer** that coordinates:
- **Commercial Entitlement & Membership Lifecycle** (Day 5)
- **Authoritative Payments & Invoicing Foundation** (Day 6)
- **Communication Engine** (Day 28)
- **Automated Workflows & Staff Task Integration** (Day 30)
- **Financial Intelligence & Cash-Basis Analytics** (Day 41)

This document audits the authoritative sources of truth already in place and defines the exact integration boundaries for Day 42.

---

## 2. Inventory of Existing Authoritative Infrastructure

### 2.1 Payments & Billing Domain (Day 6)
The following models in `services/api/prisma/schema.prisma` are strictly authoritative and are **NEVER duplicated**:

| Model | Table | Responsibility & Authority |
| :--- | :--- | :--- |
| `Invoice` | `invoices` | Authoritative record of formally billed amount, taxes, discounts, line items, and amount due. |
| `InvoiceLineItem` | `invoice_line_items` | Itemized charges linked to membership plans, custom fees, or adjustments. |
| `PaymentTransaction` | `payment_transactions` | Authoritative money transaction record storing provider transaction IDs, minor units, currencies, and raw statuses. |
| `PaymentCustomer` | `payment_customers` | Links `MemberProfile` to external provider customer entities (e.g. Stripe `cus_...`). |
| `PaymentMethod` | `payment_methods` | Tokenized payment instruments (`providerPaymentMethodId`, card brand, last4, expiry). Zero PAN/CVV stored. |
| `PaymentRefund` | `payment_refunds` | Authoritative refund records tracking cumulative amounts refunded against a transaction. |
| `PaymentWebhookEvent` | `payment_webhook_events` | Idempotent webhook audit log with signature verification and replay defense. |
| `Discount` | `discounts` | Promotional percentage and fixed discounts applied during invoice calculation. |

#### Reused Payment Services (`services/api/src/payments/services/`):
- `InvoiceService`: Creates invoices with sequential numbering (`INV-YYYYMM-XXXX-XXXX`), calculates line items, applies discounts, and tracks `amountDueMinor` and `amountPaidMinor`.
- `PaymentTransactionService`: Coordinates provider execution via `PaymentProviderFactory`, creates `PaymentTransaction`, updates `Invoice` via `applyPayment()`, writes audit entries, and protects idempotency.
- `PaymentMethodService`: Manages tokenized card/bank records, ensures default payment method assignment, and validates ownership.
- `BillingCalculationService`: Pure calculation engine for subtotal, discount, fee, tax, and total in minor units.
- `PaymentWebhookService`: Deduplicates webhook payloads, validates cryptographic signatures, records events, and triggers domain bridges.
- `PaymentMembershipBridge`: Links paid invoices to `MembershipLifecycleService` (e.g. activates `PENDING` memberships or renews `EXPIRED` memberships).
- `MoneyUtil`: Minor-unit arithmetic (`add`, `subtract`, `multiply`, `percentage`, `toMinor`, `toMajor`).

### 2.2 Membership Domain (Day 5)
- `MemberMembership`: Commercial entitlement (`status`: `PENDING`, `ACTIVE`, `TRIAL`, `PAUSED`, `SUSPENDED`, `EXPIRED`, `CANCELLED`). Stores historical pricing snapshot (`planNameAtPurchase`, `priceAtPurchase`, `currencyAtPurchase`, `billingTypeAtPurchase`, `durationValueAtPurchase`, `durationUnitAtPurchase`).
- `MembershipPlan`: Plan template defining duration, retail price, and access scope.
- `MembershipLifecycleService` & `MembershipRenewalService`: Authoritative state machines for membership transitions.

### 2.3 Communication Engine (Day 28)
- `NotificationOrchestratorService`: Central pipeline for transactional notifications (`handleDomainEvent`).
- Handles consent verification, quiet hours, user preferences, templating, channel resolution (`EMAIL`, `SMS`, `PUSH`, `IN_APP`), queueing, and delivery tracking.
- **Rule**: Recurring billing and dunning **never** dispatch directly to Twilio, SendGrid, or WhatsApp. All reminders dispatch via `NotificationOrchestratorService`.

### 2.4 Automation Engine & Staff Tasks (Day 30)
- `TaskActionService`: Creates staff follow-up outreach tasks (`retentionOutreach` / `CollectionTask`) assigned to designated club staff or trainers.
- `WorkflowSchedulerService`: Job orchestration patterns for scheduled time delays and queue advancement.

### 2.5 Financial Intelligence (Day 41)
- `FinancialTransactionReference` & `FinancialDailySummary`: Fast projections of authoritative transactions.
- `FinancialReconciliationService`: Detects unprojected transactions and idempotently syncs projections.
- `FinancialMetricService`: Canonical cash-basis metric formulas ($Gross = \sum Succeeded$, $Net = Gross - Refunds$, $RefundRate$, etc.).

### 2.6 Core System Capabilities
- **Redis (`RedisService`)**: Distributed cache with automatic in-memory fallback for high availability.
- **Audit System (`AuditService`)**: Standardized audit logging to `AuditLog` table with actor, tenant, IP, and structured metadata.

---

## 3. What Day 42 Adds (The Billing Orchestration Layer)

Day 42 implements the missing orchestration components that bridge active memberships to recurring charges and handle collection failures:

```text
ACTIVE MEMBERSHIP (Day 5)
        ↓
BILLING SCHEDULE (Day 42)
        ↓
BILLING CYCLE (Day 42)
        ↓
INVOICE (Day 6)
        ↓
PAYMENT ATTEMPT (Day 42)
        ↓
PAYMENT TRANSACTION (Day 6)
        ↓
[SUCCESS] ──→ Update Invoice & Schedule ──→ Trigger Membership Bridge ──→ Financial Intelligence (Day 41)
    │
[FAILURE]
    ↓
RETRY POLICY (Day 42)
    ↓
DUNNING CASE & STEPS (Day 42)
    ↓
COMMUNICATION ENGINE (Day 28)
    ↓
COLLECTION QUEUE & STAFF TASKS (Day 42 / Day 30)
```

### 3.1 New Entities in Prisma Schema
1. `BillingSchedule`: Defines recurring subscription parameters (`billingInterval`, `intervalCount`, `amountMinor`, `nextBillingDate`, `status`, `paymentMethodId`, `startDate`, `endDate`, `timezone`).
2. `BillingCycle`: Represents one specific billing period (`cycleNumber`, `periodStart`, `periodEnd`, `scheduledBillingDate`, `invoiceId`, `status`, `amountMinor`, `currency`).
3. `PaymentAttempt`: Orchestration audit of each attempt to collect a recurring invoice (`billingCycleId`, `invoiceId`, `paymentTransactionId`, `attemptNumber`, `status`, `failureCode`, `failureCategory`, `nextRetryAt`).
4. `DunningCase`: Manages the recovery lifecycle for an unpaid invoice (`status`: `OPEN`, `RETRYING`, `CUSTOMER_ACTION_REQUIRED`, `PAYMENT_RECOVERED`, `STAFF_REVIEW`, `ESCALATED`, `RESOLVED`, `CANCELLED`, `EXPIRED`).
5. `DunningStep`: Ordered workflow steps (`PAYMENT_RETRY`, `EMAIL_REMINDER`, `SMS_REMINDER`, `IN_APP_REMINDER`, `STAFF_TASK`, `ESCALATE`).
6. `BillingPolicy`: Tenant-configurable retry rules, grace periods, dunning escalation timeouts, and communication channels.
7. `CollectionTask`: Staff tasks for handling escalated overdue accounts.

---

## 4. Architectural Boundaries & Non-Negotiable Rules

1. **No Duplicate Payment Records**:
   - `PaymentAttempt` references `PaymentTransaction` but does not replace it.
   - `BillingCycle` references `Invoice` but does not duplicate line items or taxes.
2. **Double-Charge Protection**:
   - Every payment attempt uses a deterministic idempotency key:
     `idempotencyKey = "rec_attempt_${billingCycleId}_${attemptNumber}"`.
   - Database unique constraint on `(billingScheduleId, cycleNumber)` prevents generating duplicate cycles for the same period.
3. **No Direct Physical Access Modification**:
   - Recurring billing does not call door locks or access controllers directly. Access decisions remain governed by `AccessDecisionService` (Day 7).
4. **No Direct Provider Calls**:
   - Recurring billing coordinates through `PaymentTransactionService` and `PaymentProviderFactory`.
5. **No Direct Third-Party Communication**:
   - Reminders flow through `NotificationOrchestratorService` to ensure user preferences, opt-outs, and quiet hours are strictly honored.
6. **Strict Multi-Tenant Isolation**:
   - Every schedule, cycle, attempt, dunning case, and task is scoped by `organisationId` and validated against user roles.
7. **No AI in Billing / Collection Decisions**:
   - Collection prioritization, retry schedules, and dunning workflows are 100% deterministic rules engines. Zero LLM calls exist in Day 42.

---

## 5. Summary Matrix: Reused vs New Components

| Subsystem | Existing Component (Reused) | Day 42 Component (New) |
| :--- | :--- | :--- |
| **Data Models** | `Invoice`, `PaymentTransaction`, `PaymentMethod`, `MemberMembership` | `BillingSchedule`, `BillingCycle`, `PaymentAttempt`, `DunningCase`, `DunningStep`, `BillingPolicy`, `CollectionTask` |
| **Pricing** | `BillingCalculationService`, `DiscountService`, `MoneyUtil` | Snapshot logic in `BillingCycleService` |
| **Execution** | `PaymentTransactionService.processPayment()` | `RecurringPaymentService` orchestration |
| **State Bridge** | `PaymentMembershipBridge.onInvoicePaid()` | `BillingSchedule` status transitions & grace period tracking |
| **Messaging** | `NotificationOrchestratorService.handleDomainEvent()` | Dunning communication step executors & email/SMS templates |
| **Tasks** | `retentionOutreach` / Day 30 staff integration | `CollectionQueueService` & `CollectionTask` resolver |
| **Analytics** | Day 41 `FinancialAnalyticsService`, `FinancialMetricService` | Recurring billing KPI cards & collections recovery rates |
