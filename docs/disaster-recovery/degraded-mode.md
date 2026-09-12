# Degraded Mode & Fault Tolerance Guide

When an external integration or auxiliary subsystem experiences downtime, FitCore must degrade gracefully without taking down the core fitness club management operations.

## 1. Subsystem Degraded Mode Catalog

| Subsystem | Failure Scenario | Degraded Mode Fallback Strategy | Impact on Core Gym Operations |
| :--- | :--- | :--- | :--- |
| **AI Gateway** | OpenAI / Anthropic outage or HTTP 429/500 | Circuit breaker triggers fallback to static rule-based templates for workout advice and receptionist replies. | **NONE**: Class bookings, door access, and billing remain 100% operational. |
| **Turnstile Physical Access** | Cloud API or gym internet disconnected | Turnstile controllers evaluate cached active credentials and outlet access policies. For un-cached visitors, staff execute manual check-in override. | **LOW**: Fail-secure policy; doors never unlock all indiscriminately. Swipe events buffer in reader memory. |
| **Outbound Communication** | Twilio / SendGrid downtime | Non-urgent marketing comms suppressed; operational transactional SMS/emails queue in BullMQ with exponential backoff. | **LOW**: Zero lost messages; delayed delivery only. |
| **Accounting Integration** | Xero / QuickBooks outage | Financial invoices and payments remain authoritative inside FitCore PostgreSQL. External ledger synchronization outbox is paused. | **NONE**: Billing and payments continue uninterrupted. Sync catches up when provider recovers. |
| **Wearables** | Fitbit / Apple Health API downtime | Member profiles display last synced biometric baseline with "Reconnecting" badge. Workouts remain fully recordable manually. | **NONE**: Member gym experience unaffected. |

---

## 2. Fail-Secure Turnstile Invariant
Under emergency fire/evacuation, physical fire safety hardware overrides digital turnstiles via physical relay contacts. During cyber/network outages, turnstiles default to **Fail-Secure** (requiring local cached badge or staff badge override) to prevent unauthorized entry.
