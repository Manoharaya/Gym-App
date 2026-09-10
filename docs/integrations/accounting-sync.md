# Accounting Synchronization & Idempotency Engine

## 1. Synchronization Lifecycle & Modes

FitCore supports four controlled synchronization patterns:

1. **Initial Sync**: Controlled sync following connection establishment. Previews total pending entities (contacts, invoices, payments) and requires confirmation before processing in bounded batches.
2. **Incremental Sync**: Periodic background job (`AccountingIncrementalSyncJob`) syncing records modified since `AccountingConnection.lastSuccessfulSyncAt`.
3. **Event-Driven Outbox Sync**: Asynchronous ingestion of financial domain events (`INVOICE_PAID`, `PAYMENT_SUCCEEDED`, `PAYMENT_REFUNDED`).
4. **Manual On-Demand Sync**: Finance staff triggered resynchronization for specific entities or date windows.

---

## 2. Synchronization Flow

```text
FitCore Entity (Invoice / Payment / Refund)
                 │
                 ▼
     AccountingNormalizerService
(Strips sensitive PII, formats line items)
                 │
                 ▼
      AccountingMappingService
(Resolves revenue account & tax code)
                 │
                 ▼
    AccountingExternalReference Check
(Verifies if external ID already exists)
   ├── Exists   ──> Update external entity (or skip if locked)
   └── Not Exists ──> Create external entity with Idempotency Key
                 │
                 ▼
        Provider Adapter API
                 │
                 ▼
Save/Update AccountingExternalReference & SyncRecord
```

---

## 3. Idempotency Guarantees

To ensure network retries or concurrent events never create duplicate external invoices or payments:
1. **External Reference Registry**:
   - `AccountingExternalReference` maintains a unique constraint on `(organisationId, connectionId, entityType, fitcoreEntityId)`.
   - Before any external creation call, this registry is queried.
2. **Deterministic Idempotency Keys**:
   - Outbound requests pass provider-supported idempotency headers (e.g. `Idempotency-Key: sync_${connectionId}_${entityType}_${entityId}_${version}`).
3. **Distributed Synchronization Locks**:
   - Redis-backed mutex `accounting_sync_lock_${organisationId}` ensures only one full sync runs at a time per organisation.
