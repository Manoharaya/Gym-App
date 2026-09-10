# Recurring Billing & Collections Guide

## 1. Overview

FitCore's **Recurring Billing & Collections** engine orchestrates automated subscription charges for active gym memberships. Built on top of the authoritative Day 6 Payments foundation and Day 41 Financial Intelligence, it manages subscription lifecycles, billing schedules, billing cycles, payment retries, dunning workflows, customer communications, and staff collection queues.

---

## 2. Core Architecture

The architecture maintains strict decoupling between commercial subscriptions, invoicing, physical access, and payments:

```text
Active MemberMembership (Day 5)
          ↓
   BillingSchedule (Day 42)
          ↓
    BillingCycle (Day 42)
          ↓
     Invoice (Day 6)
          ↓
  PaymentAttempt (Day 42)
          ↓
PaymentTransactionService (Day 6)
   │
   ├── [SUCCEEDED] ──→ Advance Next Billing Date ──→ Member Renewal Bridge ──→ Financial Intelligence (Day 41)
   └── [FAILED]
           ↓
    Failure Classifier (Day 42)
           ↓
     Retry Policy & Dunning Engine (Day 42)
           ↓
     Communication Engine (Day 28)
           ↓
     Staff Collection Queue (Day 42 / Day 30)
```

---

## 3. Billing Schedule Lifecycle

A `BillingSchedule` tracks how and when a membership entitlement is billed:

- **`DRAFT`**: Configured but not yet activated.
- **`ACTIVE`**: Actively processed during recurring billing runs.
- **`PAUSED`**: Temporarily frozen (e.g. member freeze); recurring billing runs skip this schedule.
- **`PAST_DUE`**: One or more payment attempts failed; dunning active.
- **`SUSPENDED`**: Grace period elapsed without recovery; membership state transition triggered.
- **`CANCELLED`**: Permanently cancelled; no future cycles generated.
- **`COMPLETED`**: Reached end date for fixed-term commitments.
- **`EXPIRED`**: Term expired without renewal.

---

## 4. Supported Billing Intervals

| Interval | Calculation Rule | Example |
| :--- | :--- | :--- |
| `WEEKLY` | Current Date + 7 days | Every Monday |
| `BIWEEKLY` | Current Date + 14 days | Every alternate Friday |
| `MONTHLY` | Current Month + 1 month (with end-of-month clamping) | Jan 31 $\rightarrow$ Feb 28/29 $\rightarrow$ Mar 31 |
| `QUARTERLY` | Current Month + 3 months | Jan 1 $\rightarrow$ Apr 1 $\rightarrow$ Jul 1 |
| `SEMI_ANNUALLY` | Current Month + 6 months | Jan 1 $\rightarrow$ Jul 1 |
| `ANNUALLY` | Current Year + 1 year | Jan 1, 2026 $\rightarrow$ Jan 1, 2027 |
| `CUSTOM` | Current Date + ($30 \times \text{count}$) days | Configurable days |

---

## 5. Security & Isolation

1. **Multi-Tenant Isolation**: Every schedule, cycle, attempt, dunning case, and collection task is scoped to `organisationId`.
2. **Access Control**:
   - `MEMBER`: Accesses only `/api/v1/me/billing/*` for their own schedules and invoices.
   - `TRAINER`: Strictly forbidden (403) from administrative billing and collection queues.
   - `OUTLET_MANAGER`: Scoped strictly to members belonging to their assigned outlet.
   - `ORGANISATION_OWNER` & `FINANCE`: Full organisation-wide billing visibility.
3. **No Payment Secrets**: Raw PAN, CVV, and provider credentials are never accepted or stored. Only tokenized `PaymentMethod` references are utilized.
