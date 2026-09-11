# ADR-038: Multi-Outlet Intelligence & Benchmarking Architecture

## Status
Accepted

## Date
2026-09-11

## Context
Following the implementation of Day 45 Unified Business Intelligence, organisations operating multiple gym branches required comparative intelligence across locations.

Multi-branch gym management presents unique analytical pitfalls:
1. **Size Bias**: Comparing raw numbers naturally favors large suburban mega-gyms over boutique urban studios, penalising smaller facilities that may actually possess higher operational efficiency, engagement, or growth velocity.
2. **Harmful Single Leaderboards**: Generating a single universal "best outlet" composite score creates unhealthy competition, masks severe localized issues (such as high cancellations masked by high gross revenue), and relies on arbitrary subjective metric weighting.
3. **Multi-Currency Distortion**: Organisations operating across borders (e.g. Nepal and Australia) risk corrupted financial rollups if currencies are mixed into combined sums.
4. **Revenue Misallocation**: Transactions without clear branch origin can distort profitability if arbitrarily attributed.
5. **False Cohort Comparisons**: Single-outlet organisations can receive confusing zero-cohort warnings or meaningless self-comparisons if not handled gracefully.

## Decision

1. **Dual Absolute & Normalised Metric Presentation**:
   Every metric comparison supports real-time toggling between `ABSOLUTE` volume totals and normalised efficiency ratios (`PER_ACTIVE_MEMBER`, `PER_LEAD`, `PER_SESSION`, `PERCENTAGE`, `GROWTH_VS_BASELINE`).
   
2. **No Universal "Best Outlet" Composite Score**:
   FitCore eliminates single "best gym" ratings. Instead, the engine surfaces **Categorical Leaders** across seven distinct operational pillars:
   - `Revenue Leader`
   - `Growth Leader`
   - `Sales Conversion Leader`
   - `Attendance Leader`
   - `Class Utilisation Leader`
   - `Engagement Leader`
   - `Retention Watch`

3. **Strict Multi-Currency Siloing & Revenue Attribution**:
   Revenue metrics are partitioned strictly by fiat currency (`AUD` and `NPR` are never combined). Unattributed transactions are explicitly isolated under `unattributedRevenue` rather than inferred or heuristically distributed.

4. **8-Dimension Objective Health Evaluation**:
   Each location is evaluated across eight distinct dimensions (`MEMBERSHIP`, `SALES`, `FINANCE`, `ATTENDANCE`, `BOOKING`, `ENGAGEMENT`, `RETENTION`, `OPERATIONS`) producing an explainable status (`GOOD`, `STABLE`, `WATCH`, `ATTENTION_REQUIRED`) paired with non-punitive attention flags and growth opportunities.

5. **Single-Outlet Graceful Degradation**:
   When an organisation operates only 1 outlet (`outlets.length === 1`), the system switches to `singleOutletStatus: 'SINGLE_OUTLET'`, disables cross-outlet percentiles, and benchmarks the facility against its own historical baseline periods.

6. **Grounded AI Advisory (`multi_outlet_intelligence.v1`)**:
   Multi-outlet AI commentary is bound strictly to the in-memory verified metric snapshot, adheres to non-causal phrasing, resists prompt injection attempts, and supports fluent bilingual operations (English & Nepali).

7. **RBAC & Multi-Tenant IDOR Defenses**:
   Trainers and members are blocked (HTTP 403). Outlet Managers are restricted strictly to their assigned outlet (`assertCanAccessOutlet`). Cross-organisation access is blocked by tenant scoping.

8. **Spreadsheet Formula Injection Sanitization**:
   CSV exports neutralize CSV injection vectors by prepending sensitive formula trigger characters (`=`, `+`, `-`, `@`) with a single quote (`'`).

## Consequences

### Positive
- Fair, unbiased comparison across gym formats of varying scale.
- Transparent mathematical safety (zero denominators return `NOT_COMPARABLE`, sample sizes < 10 trigger caveats).
- Uncompromised multi-currency integrity across international franchise networks.
- Clean foundation ready for Day 47 Resource & Capacity Intelligence.

### Negative / Trade-offs
- Requires dual data queries and per-member normalization math at query time (mitigated by 5-minute TTL caching).
- Historical trend comparisons require consistent baseline logging across active outlets.
