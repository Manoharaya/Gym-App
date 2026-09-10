# Staff Collection Workflows & Prioritization Queue

## 1. Overview

For failed accounts that cannot be resolved through automated retries, FitCore provides an operational **Collection Queue** designed for finance and front-desk reception staff.

---

## 2. Deterministic Priority Scoring

Collection items are ordered by a transparent, deterministic mathematical score (zero black-box algorithms or AI profiling):

$$\text{Priority Score} = (\text{daysOverdue} \times 2) + (\text{failedAttempts} \times 5) + \text{actionPenalty} + \text{escalationBonus}$$

Where:
- $\text{daysOverdue}$: Number of days elapsed past the invoice due date.
- $\text{failedAttempts}$: Number of unsuccessful payment attempts.
- $\text{actionPenalty}$: $+15$ if status is `CUSTOMER_ACTION_REQUIRED`.
- $\text{escalationBonus}$: $+25$ if status is `ESCALATED`.

### Priority Bands:
- **`URGENT`** ($\ge 35$ points or $\ge 14$ days overdue): Immediate personal phone call or management review.
- **`HIGH`** ($20 - 34$ points or $\ge 7$ days overdue): Front desk outreach upon member check-in.
- **`MEDIUM`** ($10 - 19$ points): Automated email/SMS dunning active.
- **`LOW`** ($< 10$ points): Recent initial failure.

---

## 3. Staff Collection Tasks

Staff follow-ups are tracked via `CollectionTask`:
- Fields: `assignedStaffId`, `dueDate`, `status` (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `DISMISSED`).
- Staff can record contact attempts and payment notes.
- When an invoice is paid (online or in person), linked collection tasks automatically mark as `COMPLETED`.

---

## 4. Front Desk Manual Payments

When a member pays an overdue invoice in gym:
1. Reception records payment via `POST /api/v1/payments/manual`.
2. Method: `CASH`, `POS`, `BANK_TRANSFER`.
3. Day 6 `PaymentTransactionService` creates the transaction and applies it to the `Invoice`.
4. Payment bridge marks invoice `PAID` and triggers `DunningService.resolveDunningForCycle('MANUAL_PAYMENT')`.
5. The member is immediately cleared from the collection queue.
