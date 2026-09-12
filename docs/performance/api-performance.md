# API Performance & Latency Engineering Guide

## 1. Latency Budgets & Service Level Objectives (SLOs)

FitCore categorizes API endpoints into strict latency tiers based on user experience and business criticality:

| Tier | Latency Budget (P95) | Latency Budget (P99) | Key Endpoints / Operations | Design Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0: Physical Access** | `< 20ms` | `< 50ms` | `/access/decision`, Turnstile token validation | In-memory / 60s Redis caching, minimal single-query joins, zero external HTTP dependencies |
| **Tier 1: Interactive Member / Staff** | `< 100ms` | `< 200ms` | `/members/profile`, `/schedule/sessions`, `/bookings/mine` | Strict composite indexing on `[orgId, memberId]`, projection of required fields only |
| **Tier 2: Transactional Mutations** | `< 150ms` | `< 300ms` | `/bookings/book`, `/payments/charge`, `/check-ins` | Pessimistic row-level locking (`FOR UPDATE`) on scarce resource, atomic in-transaction idempotency |
| **Tier 3: Analytics & Reporting** | `< 500ms` | `< 1000ms` | `/analytics/revenue`, `/analytics/attendance`, `/admin/reports` | Read-replica routing, composite indexes with date filters, aggregation rollups |

---

## 2. Anti-Patterns Eliminated

### A. Offset-Based Pagination Eliminated
- **Problem**: `OFFSET 10000 LIMIT 20` scans 10,020 rows in PostgreSQL before returning 20, degrading exponentially as datasets grow.
- **Solution**: Cursor-based pagination using monotonic IDs or timestamp-ID pairs:
  ```sql
  WHERE (created_at, id) < ($last_seen_created_at, $last_seen_id)
  ORDER BY created_at DESC, id DESC
  LIMIT 25;
  ```

### B. Payload Bloat Elimination
- **Problem**: Returning complete user models with full permission trees, membership histories, and audit trails when only name and badge status are needed.
- **Solution**: Explicit Prisma `select` / `include` projections. Large nested arrays are separated into dedicated sub-resource routes.

### C. Downstream Blocking & Deadlines
- **Problem**: API threads held open waiting for payment gateways, webhook receivers, or email sending.
- **Solution**: Strict 3,000ms HTTP timeout deadlines on all outbound HTTP calls, with transactional queuing (BullMQ) for all asynchronous side-effects.

---

## 3. Caching Architecture

```
[ Client / Gate Controller ]
           │
           ▼
[ API Gateway / NestJS ]
     │                │
     │ Cache Hit      │ Cache Miss
     ▼                ▼
[ Redis / In-Memory ]  [ PostgreSQL Master ]
  (TTL: 60s - 300s)     (Indexed Lookups)
```

1. **Outlet Configuration & Rules**: Cached for 60s with local invalidation on outlet settings update.
2. **Member Active Entitlements**: Cached with write-through invalidation when a membership payment fails or is revoked.
3. **Class Capacity Cache**: Redis counter for fast availability previews, backed by authoritative PostgreSQL row locks at final booking commit.
