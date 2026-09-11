# Multi-Outlet Intelligence Testing Guide

## 1. Test Suite Architecture

The Day 46 Multi-Outlet Intelligence test suite is implemented in [`services/api/test/multi-outlet-intelligence.e2e-spec.ts`](file:///c:/Users/msi/OneDrive/Desktop/GYM%20APP/services/api/test/multi-outlet-intelligence.e2e-spec.ts) and contains **25 automated end-to-end tests** across 10 functional suites:

1. **Single Outlet vs Multi-Outlet Scenarios**:
   * Validates `SINGLE_OUTLET` status when an organisation has only 1 outlet.
   * Validates full comparative intelligence when organisation has 2 or more outlets.
2. **Categorical Leaders & Nuanced Evaluation**:
   * Verifies no single universal "best outlet" composite score is exposed.
   * Tests evaluation of distinct categorical leaders (Revenue, Growth, Sales, Attendance, Booking, Engagement, Retention).
3. **Absolute vs Normalised Metric Toggling**:
   * Verifies `PER_ACTIVE_MEMBER` normalisation recalculates rankings based on efficiency.
   * Verifies `ABSOLUTE` normalisation presents raw volumes.
4. **Explicit Denominators & Zero-Denominator Safety**:
   * Verifies zero-denominator baseline returns `direction: 'NOT_COMPARABLE'` and `percentageChange: null`.
   * Verifies small sample caveats (< 10 records / < 5 leads).
5. **Multi-Currency Partitioning & Unattributed Revenue**:
   * Verifies strict segregation of `AUD` and `NPR` totals into isolated groups.
   * Verifies unallocated payments are surfaced in `unattributedRevenue`.
6. **Objective 8-Dimension Outlet Health Evaluation**:
   * Verifies evaluation of all 8 canonical dimensions (`MEMBERSHIP`, `FINANCE`, `SALES`, `ATTENDANCE`, `BOOKING`, `ENGAGEMENT`, `RETENTION`, `OPERATIONS`).
   * Verifies trigger conditions for `WATCH` and `ATTENTION_REQUIRED` statuses.
7. **RBAC & IDOR Defenses**:
   * Asserts HTTP 403 Forbidden for `MEMBER` and `TRAINER` roles.
   * Asserts Outlet Managers cannot query another outlet's health or metrics (IDOR defense).
   * Asserts Outlet Managers can access their own assigned outlet.
8. **RFC 4180 CSV Export & Formula Injection Prevention**:
   * Asserts RFC 4180 CSV format with proper headers and escaping.
   * Neutralizes formula injection attack vectors (`=`, `+`, `-`, `@` prepended with `'`).
9. **Grounded AI Insights & Safety Defense**:
   * Asserts non-causal grounded multi-outlet strategic observations.
   * Asserts prompt injection refusal.
   * Asserts bilingual Nepali support.
10. **REST Endpoints Completeness**:
    * Tests `/metrics`, `/freshness`, `/health`, and `/attention` endpoints.

---

## 2. Running the Test Suite

```bash
# Run Day 46 Multi-Outlet E2E test suite
pnpm --filter @fitcore/api test test/multi-outlet-intelligence.e2e-spec.ts

# Run Day 45 BI regression test suite
pnpm --filter @fitcore/api test test/business-intelligence.e2e-spec.ts
```
