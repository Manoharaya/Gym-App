# Communication & Outbox Recovery Guide

## 1. Outbox Pipeline & State Matrix
When communication workers recover, pending notifications must be evaluated before dispatching:

```text
[ Restored Message Record ]
            │
            ├── Sent Before Outage? ────────► Skip (Prevent Duplicate SMS/Email)
            │
            ├── Status: UNKNOWN? ──────────► Provider Lookup (Twilio/SendGrid Message SID)
            │                                  ├── Delivered: Mark SUCCEEDED
            │                                  └── Undelivered: Re-queue with Backoff
            │
            └── Marketing Blast? ──────────► Suppress Stale Marketing Notifications
```

---

## 2. Notification Storm Prevention
To prevent sending tens of thousands of delayed messages simultaneously:
1. Outbound rates are throttled to 50 req/sec.
2. Messages older than 24 hours (e.g. daily reminder push alerts) are auto-expired.
