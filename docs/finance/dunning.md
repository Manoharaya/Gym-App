# Dunning Workflow Engine

## 1. Purpose

Dunning manages the automated recovery lifecycle for unpaid recurring invoices. When a payment attempt fails, a `DunningCase` is initiated to schedule communications, track retry attempts, and escalate unresolved accounts to staff.

---

## 2. Dunning Statuses

```text
OPEN ──→ RETRYING ──→ PAYMENT_RECOVERED (Success)
  │          │
  │          └──→ STAFF_REVIEW ──→ ESCALATED ──→ RESOLVED
  │
  └──→ CUSTOMER_ACTION_REQUIRED ──→ PAYMENT_RECOVERED
```

- **`OPEN`**: Dunning case initialized upon first payment failure.
- **`RETRYING`**: Automated retries are actively scheduled.
- **`CUSTOMER_ACTION_REQUIRED`**: Card requires 3D Secure verification or update.
- **`PAYMENT_RECOVERED`**: Payment successfully collected via retry or self-service update.
- **`STAFF_REVIEW`**: Automated retries exhausted or non-retryable error encountered.
- **`ESCALATED`**: Account overdue beyond organisation threshold (default: 14 days).
- **`RESOLVED`**: Manually resolved by authorized staff (manual payment, dispute resolved, etc.).
- **`CANCELLED`**: Subscription or invoice cancelled by administrator.
- **`EXPIRED`**: Collection term ended without recovery.

---

## 3. Communication Integration (Day 28)

Dunning steps **never** communicate with external messaging gateways directly. All reminders dispatch via `NotificationOrchestratorService`, ensuring:
- Communication preferences and quiet hours are strictly honored.
- Consent verification and unsubscribe requests are observed.
- Multi-channel delivery (`EMAIL`, `SMS`, `IN_APP`) is managed centrally.

---

## 4. Dunning Resolution Types

When a dunning case is closed, an explicit resolution type must be recorded:
1. `PAYMENT_RECOVERED`: Automated retry or member online payment succeeded.
2. `PAYMENT_METHOD_UPDATED`: Member entered new card details, followed by successful charge.
3. `MANUAL_PAYMENT`: Member paid cash or POS card in gym with staff.
4. `INVOICE_VOIDED`: Administrator cancelled the charge.
5. `INVOICE_ADJUSTED`: Bill adjusted or credited.
6. `MEMBERSHIP_CANCELLED`: Commercial contract terminated.
7. `STAFF_RESOLVED`: Finance manager approved custom arrangement.
8. `CUSTOMER_DISPUTE`: Formal dispute under review.
