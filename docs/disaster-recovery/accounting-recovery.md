# Accounting Integration & Ledger Reconciliation Guide

## 1. Authoritative Ledger Invariant
> **INVARIANT**: FitCore's internal PostgreSQL database is the single source of truth for gym financial invoices, payments, refunds, and taxes. External accounting systems (Xero, QuickBooks) are downstream integration mirrors.

---

## 2. Post-Disaster Re-Sync Procedure
1. External synchronization is paused during initial recovery.
2. The accounting outbox queue re-evaluates all transactions created within the disaster window:
   ```sql
   SELECT * FROM accounting_outbox WHERE status = 'PENDING' ORDER BY created_at ASC;
   ```
3. Outbox sync uses FitCore's internal invoice/transaction ID as the external reference (`invoiceNumber` / `InvoiceID` in Xero).
4. If an invoice already exists in the external provider, the job links the external reference and updates status to `SYNCED` without recreating the invoice.
