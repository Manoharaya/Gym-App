# Accounting Conflict Management & Resolution

## 1. Conflict Genesis

Conflicts arise when external accounting staff manually alter invoices or payments directly inside Xero or QuickBooks without synchronizing through FitCore, or when tax rounding discrepancies occur:

- **Amount Mismatch**: A $120.00 invoice in FitCore is recorded as $100.00 externally.
- **External Deletion / Voiding**: An active FitCore invoice is voided or deleted inside the accounting system.
- **Status Mismatch**: An invoice marked PAID in FitCore remains UNPAID externally due to a failed payment sync.
- **Tax Variance**: Discrepancies between FitCore tax rounding and provider internal tax engines.

---

## 2. Non-Destructive Conflict Recording

FitCore isolates all discrepancies in `AccountingConflict` records:
- `conflictType`: `AMOUNT_MISMATCH`, `STATUS_MISMATCH`, `EXTERNAL_DELETION`, `EXTERNAL_MODIFICATION`, `TAX_MISMATCH`
- `fitcoreValue`: Original authoritative value
- `externalValue`: Value reported by the external provider
- `status`: `UNRESOLVED`, `RESOLVED`, `IGNORED`

FitCore will **NEVER** automatically overwrite operational member accounts, balances, or invoices when a conflict is detected.

---

## 3. Resolution Pathways

Finance staff review conflicts via `GET /api/v1/accounting/conflicts`:
1. **Push FitCore to External (`PUSH_TO_EXTERNAL`)**: Re-synchronizes FitCore's authoritative state to overwrite the external accounting record.
2. **Accept Variance (`ACCEPT_VARIANCE`)**: Marks the conflict as resolved with explanatory audit notes (e.g., "Accountant processed manual credit adjustment in Xero").
3. **Manual Adjustment (`MANUAL_ADJUSTMENT`)**: Staff makes an operational adjustment in FitCore (e.g. issuing a formal credit note) to reconcile the books.

Every resolution records `resolvedByUserId`, `resolutionNotes`, and emits an `ACCOUNTING_CONFLICT_RESOLVED` audit log.
