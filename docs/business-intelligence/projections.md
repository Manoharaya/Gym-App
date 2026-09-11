# Analytics Projections & Ephemeral Rollups

## Purpose & Scope
To provide instantaneous dashboard load times across large organizations with millions of check-ins and payments, FitCore utilizes **ephemeral analytics projections**.

> [!IMPORTANT]
> Projections are strictly derived analytics read-models. They are NOT a second source of truth. If a projection table is dropped or truncated, it can be regenerated at any time from authoritative PostgreSQL records.

---

## Database Models

### 1. `BusinessMetricProjection`
Stores pre-computed aggregations at daily, weekly, or monthly boundaries:
```prisma
model BusinessMetricProjection {
  id              String    @id @default(cuid())
  organisationId  String
  outletId        String?
  metricKey       String
  periodType      String    // DAILY, WEEKLY, MONTHLY
  periodStart     DateTime
  periodEnd       DateTime
  value           Float
  currency        String?
  sourceVersion   String    @default("v1.0")
  dataVersion     Int       @default(1)
  generatedAt     DateTime  @default(now())

  @@unique([organisationId, outletId, metricKey, periodType, periodStart, currency])
}
```

### 2. `BusinessMetricSnapshot`
Captures point-in-time domain JSON payloads for historical trend comparisons:
```prisma
model BusinessMetricSnapshot {
  id              String    @id @default(cuid())
  organisationId  String
  outletId        String?
  domain          String
  snapshotDate    DateTime
  currency        String?
  metrics         Json
  sourceVersion   String    @default("v1.0")
  generatedAt     DateTime  @default(now())

  @@unique([organisationId, outletId, domain, snapshotDate, currency])
}
```

---

## Idempotency & Versioning Guarantee

The `ProjectionService` provides concurrency-safe upserts:
1. Re-running the projection job for a given day overwrites the existing row with the latest authoritative recalculation.
2. `dataVersion` increments monotonically with each re-computation.
3. No duplicate rows can ever be generated for the same tenant, outlet, metric, period, and currency tuple.

---

## Redis Cache Invalidation

Cache keys are structured with tenant and role partitioning:
```
bi:{organisationId}:{outletId}:{userRole}:{metric}:{dateRange}:{comparisonRange}:{currency}:v{dataVersion}:{filterHash}
```
When projections are recomputed or manual sync is triggered, matching cache keys are purged via pattern matching.
