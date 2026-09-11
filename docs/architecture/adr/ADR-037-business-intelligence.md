# ADR-037: Unified Business Intelligence Architecture

## Status
Accepted

## Date
2026-09-11

## Context
FitCore has evolved rich operational domain subsystems across membership, sales, finance, attendance, training, engagement, retention, communication, and AI. However, executive stakeholders, gym owners, and outlet directors lacked a unified, multi-tenant dashboard to assess overall gym performance.

A naive approach would create a separate analytics database or CRM data lake, replicating operational state. This inevitably leads to:
1. Two conflicting sources of truth.
2. Data synchronization lag and reconciliation drift.
3. Summing heterogeneous multi-currency transactions without proper exchange rate governance.
4. Vulnerability to hallucinated metrics or fabricated numbers when paired with AI.

## Decision

1. **Authoritative Operational Domains as Sole Source of Truth**:
   Existing PostgreSQL domain tables (`MemberMembership`, `PaymentTransaction`, `Invoice`, `Lead`, `SalesOpportunity`, `CheckIn`) remain the sole authoritative source of truth. The BI module derives metrics through deterministic query aggregation and ephemeral projection rollups (`BusinessMetricProjection`, `BusinessMetricSnapshot`).

2. **Strict Multi-Currency Isolation**:
   Financial metrics are partitioned strictly by ISO currency code (`AUD`, `USD`, `NPR`). Currencies are never summed into arbitrary mixed totals without verified FX services.

3. **Deterministic Net Member Change Integrity**:
   Net membership change is strictly computed as $\text{New Members} + \text{Reactivated Members} - \text{Cancelled Members}$. Returning and reactivated members are explicitly recognized to reflect real growth dynamics.

4. **Explicit Denominator Transparency**:
   All percentage and rate metrics expose their explicit mathematical denominators (e.g. conversions / totalLeads, successful payments / total attempts, attendance visits / active members) to avoid ambiguous or misleading indicators.

5. **Small Sample Protection & Zero-Denominator Safety**:
   Calculations with $< 10$ samples receive explicit advisory caveats. Comparisons against zero baselines yield `direction: 'NOT_COMPARABLE'` and `percentageDifference: null`, preventing `Infinity` or `NaN` errors.

6. **Grounded AI Advisory Platform**:
   The AI advisory service (`business_intelligence.v1`) executes strictly against in-memory verified metric snapshots. It rejects prompt injections, refuses requests to invent or override metrics, and provides non-punitive, constructive operational recommendations in English and Nepali.

7. **RBAC & Multi-Tenant IDOR Defenses**:
   Trainers and members are forbidden (HTTP 403) from executive BI endpoints. Outlet managers are constrained strictly to their assigned outlet. Cross-tenant leakage between organizations is blocked server-side.

## Consequences

### Positive
- Guaranteed data consistency with zero second-source-of-truth drift.
- Full mathematical transparency with explicit denominators and sample-size caveats.
- Multi-currency safety across international fitness franchises.
- Resilient AI platform integration that cannot be tricked into fabricating financial figures.
- Seamless interface contract ready for Day 46 Multi-Outlet Intelligence.

### Negative / Trade-offs
- Ephemeral daily rollups require scheduled background recomputation (`ProjectionService`).
- Historical comparisons are limited to captured time windows and snapshots rather than arbitrary unbounded real-time scans on large datasets.
