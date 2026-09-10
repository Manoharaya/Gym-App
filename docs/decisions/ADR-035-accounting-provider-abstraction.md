# ADR-035: Provider-Neutral Accounting Integration & Financial Synchronization

## Status
Accepted

## Date
2026-09-11

## Context
FitCore requires bidirectional financial visibility with external accounting software, primarily **Xero** and **QuickBooks Online**. However, coupling core billing services directly to proprietary provider SDKs introduces severe fragility, vendor lock-in, and risk of external outages crashing operational fitness workflows. Furthermore, external accounting platforms have distinct semantics for contacts, invoice states, tax rounding, and credit allocations.

## Decision
1. **Provider-Neutral Abstraction Layer**:
   All accounting interactions execute behind a unified `AccountingProvider` interface, interrogated via an `AccountingProviderRegistry` and `AccountingProviderCapabilities` registry. Core modules never invoke Xero or Intuit APIs directly.
2. **FitCore as the Single Source of Truth**:
   FitCore is the sole operational and financial source of truth for members, memberships, invoices, payments, refunds, schedules, and door access. External accounting is an integration destination. External webhooks and accounting actions cannot silently overwrite FitCore state.
3. **Decoupled Asynchronous Synchronization**:
   Core payment transactions never call accounting APIs synchronously. Synchronization operates via event-driven outbox patterns and background workers (`AccountingIncrementalSyncJob`, `AccountingRetryJob`). External outages (HTTP 503/429) do not disrupt billing or gym operations.
4. **Token Security at Rest**:
   OAuth access and refresh tokens are encrypted at rest using AES-256-GCM authenticated encryption with random IVs via `AccountingCredentialService`. Plaintext tokens are scrubbed from API outputs and logs.
5. **Strict Data Privacy**:
   Customer synchronization transmits only minimal billing contact details. PAR-Q responses, health data, injury logs, wearable metrics, and trainer notes are strictly excluded.
6. **Non-Destructive Reconciliation & Conflict Engine**:
   Discrepancies between FitCore and external records are isolated into `AccountingConflict` entities for finance staff review rather than initiating automated destructive overwrites.

## Consequences
- **Positive**: Clean architectural separation, vendor replaceability, immunity of core checkout/access to accounting downtimes, GDPR/HIPAA compliance regarding member health privacy, clear audit trails.
- **Negative**: Requires maintaining mapping tables (`AccountingMapping`, `AccountingTaxMapping`) and asynchronous reconciliation processes.
