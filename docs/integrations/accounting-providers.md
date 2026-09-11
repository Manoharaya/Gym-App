# Accounting Integration Architecture

## Overview
FitCore connects with external accounting suites (Xero, QuickBooks Online) to sync invoices, customer ledgers, chart of accounts, and payment settlements established in Day 43.

---

## Architectural Alignment

The Day 48 Integration Platform acts as the overarching lifecycle and security manager for Day 43 financial adapters:
* **Connection Lifecycle**: Tracks connection status, OAuth 2.0 PKCE refresh flows, and multi-scope tenant permissions.
* **Credentials**: Cryptographically stored via AES-256-GCM authenticated envelopes.
* **Sync Scheduler**: Triggers checkpoint-based incremental syncs for invoices and payments.
* **Audit & Rate Limits**: Proactively limits calls to 60 req/min for Xero and 500 req/min for QuickBooks.

---

## Supported Providers

| Provider | Scope | Auth Mechanism | Capabilities |
|----------|-------|----------------|--------------|
| **Xero** | ORGANISATION | OAuth 2.0 with PKCE | Accounts, Invoices, Payments, Tax Rates, Contact Sync |
| **QuickBooks Online** | ORGANISATION | OAuth 2.0 with RealmId | Customers, Invoices, Payment Receipts, Chart of Accounts |

---

## Reconciliation

Ledger balances and invoice payment statuses are reconciled against FitCore transactions. Discrepancies generate `IntegrationReconciliationStatus` alerts (`AMOUNT_MISMATCH`, `MISSING_EXTERNAL`) allowing accountants to remediate records before financial year-end closing.
