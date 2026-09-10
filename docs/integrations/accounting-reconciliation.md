# Accounting Reconciliation Engine

## 1. Objective & Philosophy

The Reconciliation Engine audits data consistency between FitCore and external accounting platforms.

FitCore is the **authoritative operational ledger**. External accounting data is verified against FitCore records to surface missing records, timing drifts, and value mismatches. Under no circumstances does reconciliation overwrite FitCore source records.

---

## 2. Discrepancy Detection Classifications

The `AccountingReconciliationService` evaluates records against the following status taxonomy:

| Status | Description | Action Required |
| :--- | :--- | :--- |
| `MATCHED` | Invoice/Payment amounts and statuses match exactly | None (healthy) |
| `MISSING_EXTERNAL` | Exists in FitCore but has no external reference | Queued for synchronization |
| `MISSING_FITCORE` | Discovered in external ledger but not in FitCore | Flagged for audit investigation |
| `AMOUNT_MISMATCH` | External total minor does not equal FitCore total minor | Logged as Accounting Conflict |
| `STATUS_MISMATCH` | External status differs (e.g. FitCore PAID vs External VOID) | Logged as Accounting Conflict |
| `CURRENCY_MISMATCH` | Currency codes do not match | Critical alert; manual review |
| `DUPLICATE` | Multiple external entities point to the same FitCore entity | Flagged for deduplication |

---

## 3. Reconciliation Execution & Reports

1. Staff or scheduled jobs run: `POST /api/v1/accounting/reconciliation/run?startDate=...&endDate=...`.
2. Compares all `Invoice` and `PaymentTransaction` records in the window against `AccountingExternalReference` and provider records.
3. Generates an `AccountingReconciliationReport` with summary metrics:
   - `matchedCount`
   - `missingExternalCount`
   - `missingFitcoreCount`
   - `amountMismatchCount`
   - `statusMismatchCount`
4. Provides full drill-down for finance users to inspect and resolve individual items.
