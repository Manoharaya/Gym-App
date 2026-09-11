# ADR-039: Resource & Capacity Intelligence Architecture

## Status
Accepted

## Date
2026-09-11

## Context
Following the implementation of Day 45 Unified Business Intelligence and Day 46 Multi-Outlet Intelligence & Benchmarking, FitCore required an authoritative, production-grade intelligence layer to evaluate how physical facilities, rooms, studios, trainers, classes, and equipment are utilized.

Operational scheduling and capacity planning in fitness clubs face several critical challenges:
1. **Deceptive Metric Conflation**: Gyms frequently conflate booking fill rate with physical attendance. A class can be 100% booked on paper, while 75% of studio spots sit empty due to member no-shows, blocking other members while underutilizing the facility.
2. **Autonomous Scheduling Risks**: Allowing automated systems or AI agents to unilaterally cancel classes, reassign instructors, or shrink session caps creates massive labor disputes, member backlash, and scheduling chaos.
3. **Shadow Database Trap**: Building a second scheduling calendar or detached analytics datastore duplicates business logic and inevitably creates data divergence against active bookings and access control systems.
4. **Trainer Burnout vs Idle Overhead**: Organizations struggle to balance instructor workload; over-allocated trainers (> 85% capacity) face fatigue, while under-allocated trainers (< 30%) represent unmonetized labor overhead.
5. **Uncaptured Member Demand**: Class waitlists are often treated as mere queue overflow rather than a vital commercial demand signal indicating where additional sessions or studio upgrades are urgently warranted.
6. **Timezone Complexities**: Class schedules stored in database UTC timestamps must be projected accurately into outlet local time to produce dependable 24x7 peak hour matrices without daylight-saving distortions.

---

## Decision

1. **Authoritative Operational Single Source of Truth**:
   The Resource & Capacity Intelligence module relies solely on existing authoritative FitCore domains (`Resource`, `ClassSession`, `Booking`, `WaitlistEntry`, `TrainerAvailability`, `PersonalTrainingSession`, and `AttendanceRecord`). It builds zero shadow scheduling tables.

2. **Strict Separation of Booking Fill Rate and Attendance Utilisation**:
   The engine strictly isolates:
   - **Booking Fill Rate**: $\left(\frac{\text{Confirmed Bookings}}{\text{Configured Capacity}}\right) \times 100$
   - **Attendance Utilisation**: $\left(\frac{\text{Physically Checked-In}}{\text{Configured Capacity}}\right) \times 100$
   - **No-Show Rate**: $\left(\frac{\text{Confirmed Bookings} - \text{Checked-In}}{\text{Confirmed Bookings}}\right) \times 100$

3. **Strict Human Decision Safeguard**:
   AI and automated services are constrained strictly to `OBSERVE → MEASURE → COMPARE → IDENTIFY BOTTLENECK → EXPLAIN → RECOMMEND → HUMAN DECISION`. No autonomous schedule cancellations, trainer reassignments, or capacity modifications occur.

4. **Timezone-Aware 24x7 Peak Hour Matrix (168 Cells)**:
   Session and check-in timestamps in UTC are projected into each outlet's authoritative local timezone (e.g. `Australia/Sydney`, `Asia/Kathmandu`), evaluating hourly utilization and classifying demand levels (`PEAK`, `HIGH`, `MODERATE`, `LOW`, `OFF_PEAK`).

5. **Waitlist Pressure as Uncaptured Demand Signal**:
   Queued waitlist records are quantified as unserved demand ratio:
   $$\text{Waitlist Pressure} = \left(\frac{\text{Waitlisted Members}}{\text{Configured Capacity}}\right) \times 100$$
   Sessions reaching $\ge 95\%$ fill rate with active waitlists generate concrete capacity bottleneck warnings.

6. **6-Dimension Resource Health Evaluation**:
   Physical assets and rooms are evaluated across six distinct, non-punitive dimensions:
   `UTILISATION`, `CAPACITY`, `DEMAND`, `AVAILABILITY`, `CONFLICTS`, and `DATA_QUALITY`.

7. **Multi-Tenant Isolation & IDOR Defenses**:
   - `MEMBER`: Blocked with `403 Forbidden` across all endpoints.
   - `TRAINER`: Permitted only to view their own workload analytics (`/trainers`); blocked from executive overview and cross-outlet comparisons (`403 Forbidden`).
   - `OUTLET_MANAGER`: Confined strictly to their assigned `outletId`. Cross-outlet queries trigger `403 Forbidden`.

8. **Spreadsheet Formula Injection Defense**:
   CSV exports neutralize injection vectors by prepending sensitive trigger characters (`=`, `+`, `-`, `@`) with a single quote (`'`).

9. **Grounded AI Advisory with Bilingual Support**:
   Advisory queries are bound strictly to verified metrics via `ModelGatewayService` using `RESOURCE_CAPACITY_INTELLIGENCE_PROMPT_DEFINITION` (v1.0.0), supporting both English (`en`) and Nepali (`ne`) with explicit prompt injection refusal.

---

## Consequences

### Positive
- Transparent visibility into the gap between booking demand and physical floor attendance.
- Elimination of operational risk through enforced human-in-the-loop decision governance.
- Reliable 24x7 peak hour heatmaps aligned with local operational timezones.
- Zero duplicate scheduling engines or shadow calendar databases.
- Clean architectural handoff prepared for Day 48 Integrations Platform.

### Negative / Trade-offs
- Aggregating attendance records and session durations across 168 hourly time slots requires near-realtime caching (`ResourceCacheService`, 180s TTL) to maintain low latency under high concurrency.
- Waitlist pressure calculations assume waitlisted members would attend if a slot opened; multi-class waitlisting may introduce slight demand overestimation.
