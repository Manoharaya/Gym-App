# Resource Data Quality & Telemetry Audit

## 1. Overview
The Data Quality service guarantees statistical integrity, prevents divide-by-zero crashes, and identifies missing operational configuration (such as resources lacking capacity limits or trainers with missing availability shifts).

---

## 2. Safe Division Protocol

Every quotient calculation in Day 47 passes through `ResourceDataQualityService.safeDivide`:

```typescript
const division = this.qualityService.safeDivide({
  numerator: bookedHours,
  denominator: availableHours,
  minimumSample: 10,
  metricLabel: 'Room Utilisation',
  asPercentage: true,
  previousValue: historicalUtilisation,
});
```

### Safety Rules:
1. **Zero Denominator Protection**:
   - Returns `value: null`.
   - Returns `direction: 'NOT_COMPARABLE'`.
   - Returns `dataQuality: 'INSUFFICIENT_DATA'`.
   - Returns `sampleSizeCaveat: '<Metric>: Denominator is zero. Calculation is undefined.'`.
2. **Small Sample Warnings**:
   - If `denominator < minimumSample` (e.g. fewer than 10 sessions or 5 leads):
   - Sets `dataQuality: 'MEDIUM'` (or `'LOW'` if < 3).
   - Generates advisory caveat: `"Small sample size (X records). Value should be interpreted with caution."`
3. **Directionality Tracking**:
   - Compares current value against `previousValue`.
   - Sets `direction: 'UP' | 'DOWN' | 'UNCHANGED'`.

---

## 3. Data Quality Audit Endpoint
`GET /api/v1/resource-capacity-intelligence/data-quality`:
Returns an audit payload containing:
- `overallQuality`: `'HIGH' | 'MEDIUM' | 'LOW'`
- `telemetryCoverageRate`: Percentage of resources with active tracking telemetry.
- `missingCapacityResourcesCount`: Count of resources where `capacity <= 0` or undefined.
- `missingTrainerAvailabilityCount`: Count of active trainers lacking configured availability records.
- `overlappingSessionsCount`: Count of concurrent schedule collisions detected.
- `auditTimestamp`: ISO 8601 timestamp of audit execution.
