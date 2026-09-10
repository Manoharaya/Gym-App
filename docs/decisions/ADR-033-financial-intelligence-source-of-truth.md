# ADR-033: Financial Intelligence Source of Truth, Cash-Basis Recognition, and Multi-Currency Architecture

## Status
Accepted

## Date
2026-09-10

## Context
Day 41 introduces the **Financial Intelligence Foundation** for the FitCore AI-Native Fitness Operating System.

Prior to Day 41:
- Day 6 established the authoritative billing domain (`PaymentTransaction`, `Invoice`, `InvoiceLineItem`, `PaymentRefund`, `PaymentMethod`).
- Day 5 established membership subscriptions and plans (`MemberMembership`, `MembershipPlan`).
- No unified executive financial analytics layer existed to view cash-basis recognized revenue, net revenue, refund rates, multi-outlet attribution, or invoice aging.
- Risk of architectural deviations: creating duplicate ledgers, billing v2 tables, speculative currency conversions, or mixing cash receipts with unpaid invoices.

---

## Decision

### 1. Zero Duplicate Ledger (Authoritative SOT Consumption)
The Financial Intelligence layer does NOT create a shadow payment system, duplicate billing table, or alternate ledger:
- Authoritative transactions remain strictly in `PaymentTransaction` and `PaymentRefund` (Day 6).
- Authoritative invoices remain strictly in `Invoice` (Day 6).
- Read-optimized projections (`FinancialTransactionReference`, `FinancialDailySummary`) are strictly derived and synchronizable via `FinancialReconciliationService`.

### 2. Cash-Basis Recognized Revenue
Revenue is recognized strictly upon successful cash receipt, not upon invoice issuance:
$$\text{Gross Revenue} = \sum_{\substack{t \in \text{Transactions} \\ \text{status} = \text{SUCCEEDED}}} t.\text{amountMinor}$$
$$\text{Net Revenue} = \text{Gross Revenue} - \text{Total Refunds}$$
- Open and Past-Due invoices are tracked exclusively under `outstandingBalance` and never counted toward revenue until paid.

### 3. Strict Integer Minor Units & Zero Floating-Point Drift
- All internal storage and intermediate arithmetic execute in integer minor units (`amountMinor: Int`).
- Decimal conversion to major units (`amountMinor / 100`) occurs exclusively at the final DTO/presentation layer.

### 4. Multi-Currency Isolation
- Currencies (`AUD`, `USD`, `NPR`, etc.) are partitioned into separate buckets.
- Financial aggregations never mix currencies or apply speculative conversion rates without explicit conversion records.
- Each currency generates its own distinct `grossRevenue`, `netRevenue`, `totalRefunds`, and `outstandingBalance`.

### 5. Strict Outlet Attribution & Non-Guessing Policy
- Transactions are attributed to outlets via:
  $$\text{PaymentTransaction} \longrightarrow \text{MemberMembership}.\text{originOutletId} \longrightarrow \text{Outlet}$$
- If `originOutletId` is null, the system classifies the revenue as `UNATTRIBUTED` (`"Unattributed / Cross-Outlet"`). The system NEVER guesses or assigns transactions to arbitrary outlets.

### 6. Role-Based Scoping & IDOR Isolation
- Server-side scope resolution enforces:
  - `SUPERADMIN`: Platform-wide or organisation-level visibility.
  - `ORGANISATION_OWNER`: All authorised outlets under the organisation.
  - `OUTLET_MANAGER`: Confined strictly to authorised outlet(s). Cross-outlet requests are blocked with HTTP 403.
  - `MEMBER`: Confined strictly to personal financial records (`memberId = user.id`).
  - `TRAINER`: Explicitly forbidden from organisation-wide financial analytics (HTTP 403).

### 7. Grounded Context for Day 44 AI Finance Assistant
- `FinancialContextService` formats grounded, auditable financial snapshots for future AI consumption.
- Zero LLM API calls or autonomous financial decisions are permitted on Day 41.

---

## Consequences

### Positive
- Authoritative financial records are preserved with 100% auditable fidelity.
- Zero floating-point drift ensures mathematically exact financial reporting.
- Clear separation between recognized cash flow and accounts receivable (invoices).
- Prevents cross-currency distortion in multi-national gym operations.
- Strong security posture prevents unauthorized staff from viewing organization financial health.

### Negative / Trade-offs
- Outlets with unlinked member memberships must be resolved via data quality remediation to eliminate `UNATTRIBUTED` buckets.
- Multi-currency reporting requires viewing separate currency tabs rather than a single converted total.
