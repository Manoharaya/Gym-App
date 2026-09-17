# ADR-043: Member Visual Exercise Library and Discovery Experience

## Status
Accepted

## Context
Across Days 61 through 66, FitBeat developed comprehensive foundational systems for exercises:
- Day 61: Visual Exercise Data Foundation (Entities, schema, tenancy)
- Day 62: Exercise Media & Asset Management (Upload, storage, CDN, 3D, LOD)
- Day 63: Exercise Visual Instructions (Step-by-step cues, images, coaching tips)
- Day 64: Movement Steps & Phases Intelligence (Biomechanical order, pacing, tempo)
- Day 65: Muscles, Equipment & Exercise Metadata Intelligence (Taxonomies, target muscle mapping)
- Day 66: Interactive Exercise Detail & Visual Learning Experience (Flagship detail screen)

For Day 67, the challenge was to create a cohesive **Member Visual Exercise Library & Discovery Experience** that allows members to effortlessly browse, search, filter, preview, and bookmark exercises while naturally connecting to the Day 66 interactive guide.

Crucial architectural requirements:
1. Multi-tenant isolation: Members may only discover system-wide exercises or custom exercises belonging to their active gym organisation.
2. Single-source dynamic metadata: Discovery filters and active counts must not be hardcoded on the mobile client.
3. User favorites and view history: Bookmarking and recent views must be persisted cleanly without altering the core exercise entity or causing data corruption.
4. Seamless integration: Must feel like an integral part of FitBeat, accessible directly from the member home dashboard.

## Decision
1. **Dynamic Filter Metadata (`GET /exercises/filter-metadata`)**:
   Implemented backend aggregation grouping active exercises accessible to the tenant by category, muscle group, equipment, movement pattern, and difficulty. Returns accurate live counts for all discovery tags.

2. **Tenant-Safe User Favorites & Recent Views (`UserExerciseFavorite`, `UserExerciseRecentView`)**:
   Added dedicated non-destructive models in Prisma with composite keys (`[userId, exerciseId]`).
   - `toggleFavorite`: Idempotent upsert/delete verifying exercise access.
   - `recordRecentView`: Chronological timestamp upsert for history shelf.
   - `findAll` and `findVisualContent`: Enriched with `isFavorite: boolean` flag for the active user.

3. **Discovery Components in Mobile UI**:
   - `ExerciseCategoryDiscovery`: Fast horizontal carousel with icons and count badges.
   - `ExerciseCard`: Visual card with thumbnail/halo branding, muscle pills, difficulty badge, video indicator, favorite heart button, "Quick Preview", and "Learn Movement".
   - `ExerciseFilterModal`: In-depth multi-dimensional filter sheet with instant reset.
   - `ExerciseQuickPreviewModal`: Fast glance at equipment and mechanics without context switching.
   - `ExerciseLibraryScreen`: Unified discovery dashboard with recent views carousel, debounced multi-keyword search, and empty states.
   - `MemberHomeScreen`: Promotional discovery hero card connecting home dashboard to the exercise library.

## Consequences
### Positive
- Discovery experience feels responsive, alive, and educational.
- Live category counts reflect active catalog changes automatically without mobile app updates.
- Complete multi-tenant isolation and IDOR protection maintained across all endpoints.
- 100% backward compatible with existing workout builders and Day 61–66 workflows.

### Trade-offs & Mitigations
- Calculating aggregate counts across all dimensions on `filter-metadata` could add database load at high concurrency.
  *Mitigation*: Queries are scoped to indexed fields (`status`, `ownershipType`, `organisationId`) and can be cached with a short TTL in Redis if needed.
