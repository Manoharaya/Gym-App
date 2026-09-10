# Payment Retry Policy & Failure Classification

## 1. Retry Philosophy

FitCore employs an intelligent, safe retry strategy that distinguishes between **transient (retryable)** and **fatal (non-retryable)** payment failures. Blindly retrying cards that are permanently stolen, expired, or blocked damages merchant standing and frustrates customers.

---

## 2. Failure Classification Matrix

| Failure Category | Raw Provider Codes | Retryable? | Default Action |
| :--- | :--- | :--- | :--- |
| `INSUFFICIENT_FUNDS` | `insufficient_funds`, `not_enough_balance` | **Yes** | Schedule retry in 2–3 days; send gentle email reminder. |
| `CARD_DECLINED` | `do_not_honor`, `generic_decline` | **Yes** | Schedule retry in 2 days; prompt member to contact bank. |
| `NETWORK_ERROR` | `timeout`, `connection_error`, `api_error` | **Yes** | Immediate retry in 1 hour or next day. |
| `RATE_LIMITED` | `rate_limit`, `too_many_requests` | **Yes** | Retry with exponential backoff. |
| `AUTHENTICATION_REQUIRED` | `3d_secure`, `sca`, `requires_action` | **No** | Mark attempt `REQUIRES_ACTION`; send secure 3D Secure completion link. |
| `CUSTOMER_ACTION_REQUIRED` | `customer_action_required` | **No** | Do not auto-retry; prompt member for account action. |
| `EXPIRED_PAYMENT_METHOD` | `expired_card`, `card_expired` | **No** | Do not auto-retry; request card replacement. |
| `INVALID_PAYMENT_METHOD` | `invalid_number`, `card_not_supported` | **No** | Do not auto-retry; prompt for valid payment method. |
| `FRAUD_REVIEW` | `stolen_card`, `lost_card`, `fraud` | **No** | Lock payment method; escalate to staff security review. |

---

## 3. Configurable Retry Intervals

Organisation policies configure retry intervals (e.g. `[2, 3, 3]` days):
- **Attempt 1**: Day 0 (Scheduled billing date).
- **Attempt 2**: Day 2 (Day 0 + 2 days).
- **Attempt 3**: Day 5 (Day 2 + 3 days).
- **Attempt 4**: Day 8 (Day 5 + 3 days) — Final automated attempt before escalation.

Once `retryMaxAttempts` is exhausted without success, the dunning case transitions to `STAFF_REVIEW` or `ESCALATED`.
