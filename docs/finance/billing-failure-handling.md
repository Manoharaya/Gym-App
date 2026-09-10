# Billing Failure Handling & Grace Periods

## 1. Physical Access Decoupling

A core architectural tenet of FitCore is that recurring billing logic **never** interacts directly with access hardware, door controllers, or turnstiles:

```text
Payment Failure
       ↓
Dunning Engine
       ↓
Grace Period Evaluation (BillingPolicy)
       ↓
Membership State Machine (MembershipLifecycleService)
       ↓
Access Decision Engine (AccessDecisionService)
```

Recurring billing failure does not instantly lock gym doors. Access decisions remain governed by the organisation's configured **Grace Period Policy**.

---

## 2. Grace Period Policy (`BillingPolicy`)

Each organisation configures:
- `gracePeriodDays` (Default: 7 days): Window of time after payment due date during which the member retains gym access.
- `gracePeriodAccessAllowed` (Default: `true`): Whether the member may check in during the grace period.

### Operational Scenarios:
1. **Day 0 (Initial Payment Failure)**:
   - Invoice marked `OPEN`, dunning case `RETRYING`.
   - Member access remains active.
   - Front desk terminal displays subtle reminder badge upon check-in.
2. **Day 1–7 (Within Grace Period)**:
   - Automated retries and email/SMS reminders occur.
   - Access continues uninterrupted if `gracePeriodAccessAllowed = true`.
3. **Day 8+ (Grace Period Expired)**:
   - `BillingSchedule` status transitions to `PAST_DUE`.
   - If configured by organisation policy, `MembershipLifecycleService.suspend()` is invoked.
   - `AccessDecisionService` evaluates suspended status and denies entry at turnstile.
