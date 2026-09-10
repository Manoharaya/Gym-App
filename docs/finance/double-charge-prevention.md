# Double-Charge Prevention & Concurrency Architecture

## 1. Threat Vectors

In recurring subscription systems, inadvertent double charges can occur due to:
1. Two background workers concurrently processing the same due billing schedule.
2. Webhook replay or duplicate gateway payment events.
3. Network timeout where payment succeeds at the provider but the client or worker crashes before recording the result.
4. Staff member clicking manual retry while an automated background job is mid-flight.

---

## 2. Multi-Layered Defense Strategy

FitCore implements a defense-in-depth model across database constraints, deterministic idempotency keys, and state validations.

### Layer 1: Database Unique Constraints
- **Billing Schedule $\times$ Cycle Number**:
  ```prisma
  @@unique([billingScheduleId, cycleNumber])
  ```
  Guarantees that no two workers can create duplicate cycles for the same subscription period.
- **Billing Cycle $\times$ Attempt Number**:
  ```prisma
  @@unique([billingCycleId, attemptNumber])
  ```
  Guarantees that attempt number increments sequentially and cannot collide.

### Layer 2: Deterministic Attempt Idempotency Key
Every payment attempt sent to `PaymentTransactionService` uses a strictly deterministic key:
```typescript
const idempotencyKey = `rec_attempt_${cycle.id}_${attemptNumber}`;
```
If a network timeout occurs and the retry job executes with the same attempt number, Day 6 `IdempotencyService` intercepts the request and returns the stored transaction result without charging the card a second time.

### Layer 3: Cycle Status Pre-Validation
Before initiating a charge, `RecurringPaymentService` checks:
```typescript
if (cycle.status === 'PAID') {
  throw new BadRequestException(`Billing cycle '${cycleId}' is already fully paid`);
}
```
If an invoice was paid via online self-service or staff cash entry, any background collection job immediately aborts.

### Layer 4: Provider Webhook Deduplication
Incoming webhooks pass through `PaymentWebhookService`, which rejects replayed `providerEventId` payloads before any business logic executes.
