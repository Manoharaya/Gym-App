# Resource Health Evaluation & Objective Scoring

## 1. Overview
The Resource Health engine evaluates physical gym resources across **six independent operational dimensions**. Rather than reducing operational health to an arbitrary composite number, FitCore provides explainable, dimension-specific diagnoses with clear remediation flags.

---

## 2. Six Operational Health Dimensions

```
┌─────────────────────────────────────────────────────────────┐
│                    RESOURCE HEALTH MATRIX                   │
├──────────────────┬──────────────────┬───────────────────────┤
│ 1. UTILISATION   │ 2. CAPACITY      │ 3. DEMAND             │
│   Time booked vs │   Fill rate vs   │   Waitlist pressure & │
│   idle windows   │   room limits    │   turnover velocity   │
├──────────────────┼──────────────────┼───────────────────────┤
│ 4. AVAILABILITY  │ 5. CONFLICTS     │ 6. DATA QUALITY       │
│   Operational vs │   Collisions &   │   Telemetry & schema  │
│   maintenance    │   double-booking │   completeness        │
└──────────────────┴──────────────────┴───────────────────────┘
```

1. **UTILISATION**:
   - Optimal: 65% to 85% (`GOOD`).
   - Saturated: > 90% (`WATCH`).
   - Idle: < 25% with >= 5 sessions (`WATCH`).
   - Insufficient data: Denominator is zero or no sessions recorded (`INSUFFICIENT_DATA`).
2. **CAPACITY**:
   - Measures occupancy comfort against fire/safety limits.
   - Sessions operating within safe limits earn score 90 (`GOOD`).
   - Sessions at or over theoretical limit trigger `WATCH` with `MAX_CAPACITY_REACHED` flag.
3. **DEMAND**:
   - Assesses member interest velocity.
   - Classes with waitlists (>= 5 members) trigger `WATCH` for `UNMET_DEMAND_WAITLIST`.
   - Zero bookings with zero waitlist across scheduled sessions trigger `LOW_DEMAND_ATTENTION`.
4. **AVAILABILITY**:
   - Monitors operational readiness.
   - Resource marked `ACTIVE` scores 100 (`EXCELLENT`).
   - Resource under `MAINTENANCE` scores 40 (`CRITICAL`) with `RESOURCE_OFFLINE_MAINTENANCE` flag.
5. **CONFLICTS**:
   - 0 conflicts: Score 100 (`EXCELLENT`).
   - Overlapping bookings detected: Score drops to 20 (`CRITICAL`) with `OVERLAPPING_SCHEDULES_DETECTED`.
6. **DATA QUALITY**:
   - Telemetry integrity check: verifies valid capacity > 0 and populated timestamps. Score 90 (`EXCELLENT`).

---

## 3. Overall Health Status Classification

| Status | Overall Score Range | Operational Meaning |
| :--- | :--- | :--- |
| `EXCELLENT` | **>= 90** | Flawlessly operating resource with balanced demand, zero conflicts, and high telemetry quality. |
| `GOOD` | **75 – 89** | Stable, sustainable operational performance. |
| `WATCH` | **50 – 74** | Friction detected (either excessive saturation or unmonetized idle capacity). |
| `CRITICAL` | **< 50** | Immediate intervention required (hardware maintenance, severe scheduling collision, or zero utilization). |
| `INSUFFICIENT_DATA` | **N/A** | Denominator is zero or fewer than 3 historical records exist. |
