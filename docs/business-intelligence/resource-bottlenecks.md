# Resource Bottleneck Detection & Human Decision Governance

## 1. Overview
The Bottleneck Detection engine continuously monitors aggregated resource utilization, class fill rates, waitlists, trainer schedules, and room availability to identify operational friction. Every detected bottleneck provides transparent empirical evidence and an advisory recommendation.

---

## 2. Bottleneck Taxonomy

| Type | Trigger Condition | Default Severity | Concrete Evidence Provided |
| :--- | :--- | :--- | :--- |
| `CLASS_CAPACITY_LIMIT` | Class session fill rate >= 95% with >= 5 waitlisted members | `HIGH` to `CRITICAL` | Fill rate (%), configured capacity, queued waitlist count, session timestamp. |
| `ROOM_CAPACITY_LIMIT` | Studio utilisation >= 90% during peak operating windows | `HIGH` | Operating hours booked, configured room capacity, average session occupancy. |
| `TRAINER_CAPACITY_LIMIT` | Combined trainer workload >= 85% of available hours | `HIGH` | PT delivered hours, class hours, shift available hours, schedule gaps count. |
| `EQUIPMENT_CAPACITY_LIMIT`| Equipment utilisation >= 85% or frequent booking contention | `MEDIUM` | Usage hours, booking frequency, collision attempts count. |
| `UNDERUTILISED_RESOURCE` | Studio or trainer utilization < 25% across >= 5 observation days | `LOW` | Idle hours, actual session count, average attendees per session. |
| `SCHEDULE_CONFLICT` | Overlapping sessions or room double-booking detections | `CRITICAL` | Resource ID, colliding session IDs, start/end timestamps. |

---

## 3. Strict Human Decision Mandate

```
┌─────────────────────────────────────────────────────────────┐
│                    FITCORE SAFETY INVARIANT                 │
│                                                             │
│   AI & Automated Services May OBSERVE, EXPLAIN, & ADVISE.   │
│   AI Must NEVER Autonomously Mutate Schedules or Rosters.   │
└─────────────────────────────────────────────────────────────┘
```

1. **Advisory Recommendations**: Every bottleneck payload outputs:
   - `recommendation`: A plain-language operational suggestion (e.g., *"Consider scheduling an additional parallel session during Tuesday 18:00 window"*).
   - `humanDecisionRequired`: Explicit string declaring the required administrative action (`'MANAGEMENT_REVIEW_RECOMMENDED'`).
2. **System Safeguards**: The system prohibits autonomous background jobs from executing cancellations, capacity reductions, or instructor reassignments without verified human confirmation through authenticated management dashboards.
