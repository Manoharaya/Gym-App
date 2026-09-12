# Database Performance & Indexing Review — Day 57

## 1. Indexing Inventory & Benefit Matrix

| Table | Index Columns | Type | Query Benefited | Write Overhead | Status |
|:---|:---|:---|:---|:---|:---|
| `bookings` | `[classSessionId, status]` | B-Tree | `count({ classSessionId, status })` capacity checks | Minimal | Active |
| `bookings` | `[organisationId, memberProfileId, status]` | B-Tree | Member booking lookups & timetable | Minimal | Active |
| `bookings` | `[classSessionId, memberProfileId]` | B-Tree | Duplicate booking prevention checks | Minimal | Active |
| `class_sessions` | `[organisationId, outletId, startsAt]` | B-Tree | Timetable & class schedule discovery | Minimal | Active |
| `class_sessions` | `[outletId, status, startsAt]` | B-Tree | Active session availability filter | Minimal | Active |
| `member_memberships`| `[organisationId, memberProfileId, status]` | B-Tree | Turnstile access entitlement checks | Minimal | Active |
| `check_ins` | `[organisationId, outletId, checkedInAt]` | B-Tree | Club live occupancy & capacity gauges | Low | Active |
| `payment_transactions` | `[organisationId, status, createdAt]` | B-Tree | Settlement reporting & financial BI | Low | Active |
| `saas_usage_events` | `[organisationId, meterKey, occurredAt]` | B-Tree | SaaS billing metering rollups | Low | Active |

## 2. N+1 Query Elimination Patterns
- **Problem**: Querying memberships, trainers, or class types inside `.map()` loops.
- **Solution**: Explicit Prisma `include` with relations (single query with joins) or batched `findMany({ where: { id: { in: ids } } })`.

## 3. Transaction Scope Reduction
- In `BookingService`: Read-only membership eligibility check runs outside the transaction. Only the final row lock (`FOR UPDATE`) and booking insertion run inside the transaction, minimizing transaction hold time to < 15ms.
