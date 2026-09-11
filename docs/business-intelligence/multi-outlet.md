# Multi-Outlet Intelligence & Benchmarking Overview

## 1. Primary Purpose
The Multi-Outlet Intelligence and Benchmarking domain provides organisation-wide operational comparison, metric normalisation, relative benchmarking, and comprehensive outlet health evaluation across multi-location gym networks.

In fitness operations with multiple physical branches, raw aggregates can be profoundly misleading. A 3,000-member suburban mega-facility will naturally generate more gross revenue than a boutique 200-member city studio. Without proper normalisation, comparative intelligence defaults to rewarding size rather than operational efficiency, growth velocity, class engagement, or retention quality.

FitCore's Multi-Outlet Intelligence engine addresses this by:
1. **Never equating size with operational health** — metrics are presented with dual visibility: absolute performance alongside normalised per-member and per-capacity efficiency.
2. **Eliminating single composite scores** — avoiding gamified, arbitrary "best outlet" ratings in favor of multi-dimensional categorical leadership (`Revenue Leader`, `Growth Leader`, `Sales Conversion Leader`, `Attendance Leader`, `Class Utilisation Leader`, `Retention Watch`).
3. **Protecting multi-currency integrity** — strictly siloing financial aggregations by currency (e.g. `AUD` vs `NPR`), prohibiting cross-currency summation.
4. **Enforcing strict revenue attribution** — requiring all monetary flows to trace back to an origin outlet or explicitly flag unattributed balances.
5. **Handling single-outlet organisations gracefully** — switching seamlessly to a dedicated baseline comparison mode without false cohort warnings.

---

## 2. Architectural Principles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FitCore Authoritative Domains                        │
│  [Membership]  [Billing/Finance]  [Leads/Sales]  [Classes]  [Retention] │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Read-only Queries
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Multi-Outlet Intelligence Layer                        │
│  • OutletMetricService (Raw aggregation & currency grouping)            │
│  • OutletNormalisationService (Zero-safe denominators & sample sizes)   │
│  • OutletBenchmarkService (Percentiles, medians, org distributions)     │
│  • OutletRankingService (Contextual leaders & ranking bounds)           │
│  • OutletHealthService (8-dimension objective scoring & flags)          │
│  • OutletDataQualityService (Telemetry coverage & sync freshness)       │
│  • OutletPermissionService (Strict RBAC & outlet scoping)               │
│  • OutletInsightService (Grounded AI advisory with bilingual support)   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Exposes
                                     ▼
             [REST API: /api/v1/business-intelligence/multi-outlet]
                 │                                        │
                 ▼                                        ▼
      [Mobile Executive Screen]               [RFC 4180 CSV Export]
```

### Zero-Copy Read-Only Design
The multi-outlet intelligence module does not replicate transactional data or maintain a duplicate shadow ledger. All aggregations query authoritative operational domains directly via Prisma with non-blocking indexed queries and in-memory TTL caching (5-minute default) to prevent database overload during executive reviews.

### Single-Outlet Mode
When an organisation operates only a single outlet (`outlets.length === 1`), the system:
* Sets `isSingleOutlet: true` and `singleOutletStatus: 'SINGLE_OUTLET'`.
* Suppresses cross-outlet percentile rankings.
* Evaluates the outlet against its own historical baseline periods rather than non-existent peers.
* Informs management: *"Organisation operates 1 outlet. Cross-outlet benchmarking is disabled; historical self-benchmarking active."*

---

## 3. Core API Endpoints

All endpoints are hosted under `/api/v1/business-intelligence/multi-outlet` and enforce JWT authentication with role-based scoping:

| Endpoint | Method | Role Access | Description |
| :--- | :--- | :--- | :--- |
| `/overview` | GET | Org Owner/Admin, Outlet Mgr | Multi-outlet summary with currency groupings & leaders |
| `/compare` | GET | Org Owner/Admin, Outlet Mgr | Multi-outlet comparative matrix for a specified metric |
| `/benchmarks` | GET | Org Owner/Admin, Outlet Mgr | Organisational benchmark distributions (min, p25, median, p75, max) |
| `/category-leaders` | GET | Org Owner/Admin, Outlet Mgr | Contextual leaders across revenue, growth, sales, attendance, etc. |
| `/rankings` | GET | Org Owner/Admin, Outlet Mgr | Ranked comparison list for a metric with dual normalised views |
| `/health` | GET | Org Owner/Admin, Outlet Mgr | Comprehensive health evaluation for all or filtered outlets |
| `/health/:outletId` | GET | Org Owner/Admin, Outlet Mgr | Deep 8-dimension health report for a specific outlet |
| `/trends` | GET | Org Owner/Admin, Outlet Mgr | Time-series trend comparison across multiple outlets |
| `/data-quality` | GET | Org Owner/Admin, Outlet Mgr | Telemetry coverage, sync freshness, and data anomalies |
| `/export` | GET | Org Owner/Admin, Outlet Mgr | RFC 4180 compliant CSV export with formula injection defense |
| `/ai/insights` | GET | Org Owner/Admin, Outlet Mgr | Precomputed grounded AI strategic observations |
| `/ai/query` | POST | Org Owner/Admin, Outlet Mgr | Grounded AI interactive queries with prompt injection defense |
