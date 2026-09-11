# Integration Sync Engine Architecture

## Overview

The FitCore Integration Sync Engine coordinates initial, incremental, full, entity, and reconciliation synchronization jobs between FitCore and external systems (e.g. Xero, QuickBooks, Google Calendar, Fitbit).

---

## 1. Sync Modes

| Mode | Purpose | Cursor Behavior |
| :--- | :--- | :--- |
| **INITIAL** | Run upon initial connection to seed historical records | Establishes the baseline sync cursor |
| **INCREMENTAL** | Delta sync fetching records modified since last sync | Advances cursor to latest timestamp/version |
| **FULL** | Complete audit resync of all domain records | Overwrites cursor with current snapshot |
| **ENTITY** | Ad-hoc single record synchronization (e.g. invoice #1002) | Does not update the main connection cursor |
| **RECONCILIATION** | Compares external vs FitCore entities to detect mismatches | Emits audit discrepancy reports |

---

## 2. Checkpoint & Cursor Semantics

For providers supporting incremental synchronization, FitCore stores:
- `lastSyncAt`: Timestamp of the last completed sync.
- `cursor`: Provider-specific bookmark (opaque token, ISO 8601 timestamp, sequence number, or pagination token).

This prevents re-reading millions of historical rows and guarantees that network drops allow resuming from the exact last confirmed checkpoint.

---

## 3. Sync Job & Record Tracking

Every synchronization execution creates:
1. `IntegrationSyncJob`:
   - High-level job record tracking `status`, `recordsProcessed`, `recordsSucceeded`, `recordsFailed`, `startedAt`, `completedAt`.
2. `IntegrationSyncRecord`:
   - Itemized per-entity sync tracking `fitcoreEntityId`, `externalEntityId`, `operation` (`CREATE`, `UPDATE`, `DELETE`, `SKIP`), `status` (`SYNCED`, `FAILED`, `CONFLICT`).
