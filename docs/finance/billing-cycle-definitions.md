# Billing Cycle Definitions & Snapshot Integrity

## 1. Concept

A `BillingCycle` represents one discrete recurring subscription period (e.g. Month 1, Month 2) for a `BillingSchedule`. It is the formal link between the subscription intent and the authoritative financial `Invoice`.

---

## 2. Model Structure

```prisma
model BillingCycle {
  id                   String          @id @default(cuid())
  organisationId       String
  billingScheduleId    String
  memberProfileId      String
  memberMembershipId   String
  cycleNumber          Int
  periodStart          DateTime
  periodEnd            DateTime
  scheduledBillingDate DateTime
  invoiceId            String?
  status               String          @default("SCHEDULED")
  amountMinor          Int
  currency             String          @default("AUD")
  processedAt          DateTime?
  metadata             Json?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  @@unique([billingScheduleId, cycleNumber])
}
```

---

## 3. Cycle Status State Machine

```text
SCHEDULED ──→ PROCESSING ──→ INVOICED ──→ PAYMENT_PENDING ──→ PAID
                                 │
                                 └──→ FAILED ──→ PAST_DUE
```

- **`SCHEDULED`**: Cycle identified as upcoming; no invoice generated yet.
- **`PROCESSING`**: Generation job is actively processing this period.
- **`INVOICED`**: Authoritative `Invoice` created with line items; ready for collection.
- **`PAYMENT_PENDING`**: Payment attempt is in progress with provider.
- **`PAID`**: Payment transaction succeeded; invoice marked `PAID`.
- **`FAILED`**: Latest payment attempt failed; dunning active.
- **`PAST_DUE`**: Overdue past grace period.
- **`CANCELLED`**: Cancelled before invoice processing.
- **`SKIPPED`**: Period paused or skipped due to freeze credit.

---

## 4. Historical Pricing Snapshot

When a `BillingCycle` is generated, it captures an immutable snapshot of:
- `amountMinor`: Plan price at the moment of cycle generation.
- `currency`: Subscribed currency (e.g. `AUD`).
- Line item descriptions reflecting the cycle number.

> [!IMPORTANT]
> A future change to the membership plan's retail price or tax rate will **never** alter an existing `BillingCycle` or its associated `Invoice`.
