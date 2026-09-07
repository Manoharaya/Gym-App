# ADR-008: Progress Tracking, Assessments & Training Analytics Foundation

## Status
Accepted

## Context
FitCore is an enterprise multi-tenant fitness SaaS platform.
Following the implementation of the Exercise Library & Workout Execution (Day 13) and Training Plans & Programming (Day 14), Day 15 establishes the **Progress Tracking, Assessments & Training Analytics Foundation**.

Prior to this architecture, fitness tracking systems commonly suffered from:
1. Hardcoded demo statistics and ungrounded "mock" analytics disconnected from actual persisted workout data.
2. Inconsistent adherence calculations that penalized members for cancelled sessions (e.g., gym closed, trainer cancelled) rather than true missed sessions.
3. Leaks of sensitive personal health data (body composition, circumferences, fitness assessments) to administrative and financial roles.
4. Conflation of workout execution entities with analytical snapshots, leading to race conditions and performance degradation.

## Decisions

### 1. Invariant: Real Persisted Data Only (Zero Fake Analytics)
- No mock analytics, placeholder graphs, or hardcoded trends are permitted.
- All training metrics (total volume/tonnage, sets, reps, personal records, adherence rates, assessment score deltas) must be derived from real persisted rows in `WorkoutSet`, `Workout`, `BodyMeasurement`, and `AssessmentResult`.
- If no historical data exists for a metric or time period, the API returns clean zero/empty sets (`[]` or `null`) rather than synthesized estimates.

### 2. Domain Separation & Read-Only Observability
- Progress tracking is an **observer** of workout execution, not a controller.
- `Workout`, `WorkoutExercise`, and `WorkoutSet` remain strictly owned by the workout execution domain (Days 13 & 14).
- `PersonalRecord` and `ProgressSnapshot` maintain foreign key lineage (`workoutId`, `workoutSetId`, `exerciseId`, `memberProfileId`) without mutating or locking workout execution tables.
- Workout set deletion or modification triggers automated, idempotent PR recalculation (`recalculateAllPRsForMemberExercise`) to preserve historical integrity.

### 3. Deterministic Adherence Calculation
- Workouts can be `COMPLETED`, `IN_PROGRESS`, `SCHEDULED`, `SKIPPED`, or `CANCELLED`.
- Cancelled workouts (e.g. gym maintenance, holiday closure, trainer illness) must NOT penalize member adherence.
- Adherence rate formula:
  $$\text{effectiveScheduled} = \max(0, \text{totalScheduled} - \text{cancelled})$$
  $$\text{adherenceRate} = \begin{cases} 0.0 & \text{if } \text{effectiveScheduled} = 0 \\ \min\left(100.0, \frac{\text{completed}}{\text{effectiveScheduled}} \times 100\right) & \text{otherwise} \end{cases}$$
- Example: 10 scheduled workouts, 7 completed, 2 skipped, 1 cancelled results in $\frac{7}{10 - 1} = \frac{7}{9} \approx 77.78\%$, not $70.0\%$.

### 4. Bidirectional Goal Progress Mathematics
- Training goals (`TrainingGoal`) can be increasing (e.g., strength PR, weight gain) or decreasing (e.g., body fat reduction, weight loss).
- For increasing goals:
  $$\text{progressPct} = \frac{\text{currentValue} - \text{baselineValue}}{\text{targetValue} - \text{baselineValue}} \times 100$$
- For decreasing goals:
  $$\text{progressPct} = \frac{\text{baselineValue} - \text{currentValue}}{\text{baselineValue} - \text{targetValue}} \times 100$$
- Goals automatically update their `currentValue` and status (`COMPLETED` when progress $\ge 100\%$) upon new `BodyMeasurement` or `PersonalRecord` events.

### 5. Zero-Trust Privacy & Health Data Boundary
- Body measurements, health assessments, and personal physical records are categorized as **sensitive personal health information**.
- Role-based authorization rules:
  - **MEMBER**: May only access their own records (`actor.memberProfileId == targetMemberId`).
  - **TRAINER**: May only access records for members actively assigned to them via `TrainerClientAssignment` (`isActive == true` and `organisationId == actor.organisationId`).
  - **OUTLET_MANAGER**: May access records for members enrolled in their managed outlet (`MemberOutlet`).
  - **ORGANISATION_OWNER**: May access records for members within their organisation.
  - **FINANCE / AUDITOR**: Strictly **0 access** to health, measurement, and assessment data (`ACCESS_DENIED_FINANCE_RESTRICTION`).
- Cross-tenant IDOR attempts are rejected with `403 Forbidden` or `404 Not Found`.

### 6. Two-Tier Caching & Invalidation Architecture
- Heavy analytical rollups (e.g., 90-day volume distributions, period-over-period delta comparisons) are cached in Redis with keys partitioned by tenant and member:
  `org:{orgId}:member:{memberId}:progress:{period}`
- Time-to-live (TTL) is set to 300 seconds (5 minutes).
- Immediate, deterministic cache invalidation occurs whenever:
  1. A new `BodyMeasurement` is logged.
  2. A new `Assessment` is recorded.
  3. A `Workout` is marked `COMPLETED` or `WorkoutSet` is updated.

## Consequences

### Positive
- Strict auditability and verifiable historical integrity for all personal records and measurements.
- Complete privacy protection for member biometric data with zero exposure to financial or external roles.
- Accurate, fair member adherence rates that do not punish members for external cancellations.
- Sub-50ms analytical response times via Redis caching, with guaranteed data freshness via event-driven cache invalidation.

### Negative / Trade-offs
- Recomputing personal records upon workout set deletion requires scanning chronological set history for the exercise, though scoped strictly to the single member and exercise.
- Trainer access requires an explicit join query against `TrainerClientAssignment` on every progress request, adding minor overhead (~1-2ms) to safeguard member privacy.
