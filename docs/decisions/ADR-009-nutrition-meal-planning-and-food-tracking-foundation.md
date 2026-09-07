# ADR-009: Nutrition, Meal Planning & Food Tracking Foundation

## Status
Accepted

## Context
FitCore is expanding beyond exercise libraries and workout programming into nutritional fuel and meal planning (Day 16).
Nutritional data is highly sensitive, subject to frequent library modifications, and critical for long-term health tracking.
In legacy fitness platforms, food logs frequently become corrupted when food libraries are updated, allergy records leak to administrative/billing staff, and fake demo statistics are presented in place of real persisted data.

## Decisions

### 1. Invariant: Real Persisted Data Only (Zero Fake Nutrition)
- No mock calories, demo macros, or fake meal plans are permitted in the application.
- All nutritional rollups (calories, protein, carbs, fat, fiber, hydration, target adherence) must be derived from persisted rows in `FoodLog`, `WaterLog`, and `NutritionTarget`.
- If no logs exist for a day or member, the API returns empty datasets (`[]` or `null`) rather than synthetic averages.

### 2. Immutable FoodLog Nutritional Snapshots
- To preserve historical auditability, when a member logs a food (`FoodLog`), the exact macro and micro contributions (`calories`, `protein`, `carbohydrates`, `fat`, `fiber`, `sugar`, `sodium`) are calculated based on the logged quantity and persisted directly onto the `FoodLog` row.
- If the source `Food` item in the library is later updated or archived, old logs remain historically accurate and immutable.

### 3. Separation of Reusable Plans and Member Assignments
- Reusable `MealPlan` templates belong to the organisation.
- Members receive a `MemberMealPlanAssignment`.
- When an assignment is made, a complete JSON snapshot of the plan is captured (`planSnapshot`). Subsequent edits to the template increment its version without mutating active member assignments.

### 4. Zero-Trust Sensitive Health Privacy
- Allergies, food intolerances, and dietary restrictions are treated as sensitive personal health data.
- Authorization barrier rules:
  - **MEMBER**: Self-access only (`actor.id == member.userId`).
  - **TRAINER**: Only authorized for members with an active `TrainerClientAssignment`. Cross-client access is blocked (`TRAINER_UNASSIGNED_CLIENT`).
  - **OUTLET_MANAGER**: Outlet-scoped.
  - **ORGANISATION_OWNER**: Organisation-scoped.
  - **FINANCE & RECEPTION**: Strictly **0 access** to nutrition records (`ACCESS_DENIED_FINANCE_RESTRICTION`, `ACCESS_DENIED_RECEPTION_RESTRICTION`).

### 5. Idempotent Food Logging
- `FoodLog` creation accepts an optional `idempotencyKey`.
- Submitting an identical key returns the existing log without duplicating consumption records on mobile network retries.

### 6. Caching Strategy
- Daily summaries are cached in Redis with key `org:{orgId}:member:{memberId}:nutrition:summary:{dateStr}` and 300s TTL.
- Immediate event-driven invalidation occurs upon food logging, log deletion, or water recording.

### 7. AI & Medical Disclaimer Boundary
- Day 16 establishes the structured data foundation only.
- No AI meal generation, calorie prescriptions, automated disease diets, or medical claims are implemented.

## Consequences

### Positive
- Completely auditable, uncorruptible nutritional consumption history.
- Zero risk of sensitive allergy/health data exposure to billing or reception roles.
- High-speed daily summary responses via Redis caching with guaranteed freshness.
- Seamless foundation ready for future AI features without schema migrations.

### Negative / Trade-offs
- Storing nutritional snapshots on `FoodLog` adds ~60 bytes per log row, but eliminates complex point-in-time historical joins and protects historical integrity.
