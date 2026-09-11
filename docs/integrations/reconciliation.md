# Integration Reconciliation & Data Integrity

## Overview
Syncing domain entities across FitCore and third-party accounting, payment, or scheduling systems invariably faces network drops, clock skew, or manual edits directly in the external UI. The **Reconciliation Engine** compares FitCore domain records against external records, detects anomalies, and generates audit reports.

---

## Reconciliation Status Types

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `MATCHED` | FitCore and External record match identically on reference ID, amount, and timestamp. | None. Auto-cleared. |
| `MISSING_EXTERNAL` | Exists in FitCore (e.g. invoice created), but absent in external system. | Resync / push to external. |
| `MISSING_FITCORE` | Exists in external system (e.g. manual payment received), but absent in FitCore. | Pull into FitCore or flag for manager review. |
| `AMOUNT_MISMATCH` | Reference ID matches, but ledger currency amounts diverge. | Flag for finance review. |
| `STATUS_MISMATCH` | FitCore status is `PAID`, but external status is `PENDING` or `VOID`. | Trigger status sync update. |
| `CURRENCY_MISMATCH` | Incompatible ISO-4217 currencies detected between systems. | Halt sync and alert finance admin. |
| `DUPLICATE` | Multiple external records share the same FitCore reference ID. | Deduplication workflow. |
| `STALE` | Record last synced older than configured threshold (e.g. 7 days). | Queue for full sync cycle. |
| `CONFLICT` | Both sides updated concurrently with conflicting values. | Manual review or timestamp winner strategy. |

---

## Conflict Resolution Strategies

1. **FitCore Authority (Default for Gym Operations)**:
   FitCore is authoritative for Members, Bookings, Subscriptions, and Point of Sale transactions. External systems receive one-way updates.
2. **External Authority (Default for Banking & General Ledger)**:
   Bank reconciliations and tax rates from Xero or QuickBooks override local estimations.
3. **Timestamp Winner (LWW)**:
   The entity with the most recent `updatedAt` timestamp prevails.
4. **Manual Hold**:
   Transactions exceeding financial thresholds ($500) trigger human approval before ledger sync.
