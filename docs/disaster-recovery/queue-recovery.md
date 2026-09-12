# Queue Recovery & Worker Topology

## 1. Asynchronous Event Pipeline Recovery

FitCore decouples heavy background tasks via BullMQ running on persistent Redis:
- `payments`: Processing webhooks and invoice settlements.
- `notifications`: Outbound SMS, email, and push communications.
- `ai-processing`: Summaries, retention outreach drafts.
- `accounting-sync`: General ledger transaction pushes to Xero/QuickBooks.

---

## 2. Post-Disaster Worker Restart Sequence

```text
[ Redis Restored ]
        │
        ▼
[ 1. Inspect DLQ Queues via QueueTelemetryService ]
        │
        ▼
[ 2. Pause Outbound Communication Queues (Prevent Storm) ]
        │
        ▼
[ 3. Start Payment & Invoicing Workers (Concurrency: 10) ]
        │
        ▼
[ 4. Drain & Reconcile Idempotent Transactions ]
        │
        ▼
[ 5. Resume Notification & AI Workers with Provider Rate Throttling ]
```
