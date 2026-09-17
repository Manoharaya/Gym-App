# ADR-045: Advanced Visual Exercise Discovery, Muscle & Equipment Explorer

## Status
Accepted

## Date
2026-09-17 (FitBeat Day 69)

## Context
Across Days 61–68, FitBeat established a foundation for exercise intelligence:
- Day 61: Visual Exercise Data Foundation
- Day 62: Exercise Media & Asset Management
- Day 63: Exercise Visual Instructions
- Day 64: Movement Steps & Phases Intelligence
- Day 65: Muscles, Equipment & Exercise Metadata Intelligence
- Day 66: Interactive Exercise Detail & Visual Learning Experience
- Day 67: Member Visual Exercise Library & Discovery Experience
- Day 68: Personalized Exercise Discovery & Smart Learning Foundation

In Day 69, members required a natural, visual discovery paradigm to browse exercises beyond plain text search. Members think:
- *"I want to explore chest movements."*
- *"I only have dumbbells at home."*
- *"I want to explore beginner push exercises."*
- *"I want to understand anterior vs. posterior muscle groups."*

The architecture needed to:
1. Provide visual discovery across categories, muscles, equipment, movement patterns, goals, and difficulty.
2. Deliver an interactive anterior/posterior body map without heavy medical 3D rendering overhead.
3. Compute genuine server-side counts and co-occurrences (no client-side counting or hardcoded mock numbers).
4. Preserve zero-trust multi-tenant isolation, IDOR protection, and published-only visibility for members.
5. Connect seamlessly into Day 66 `ExerciseDetailScreen` and Day 68 Personalization.

## Decisions

### 1. Dedicated Visual Discovery Service & Controller
We created `ExerciseVisualDiscoveryService` and `ExerciseDiscoveryController` with route prefix `exercise-discovery`:
- `GET /exercise-discovery/overview`: Server-side aggregation of categories, anterior/posterior muscles, equipment, movement patterns, goals, and difficulty tiers with real counts and representative media.
- `GET /exercise-discovery/:dimension/:value`: Deep exploration endpoint calculating co-occurring dimensions (related equipment, related movements, difficulty distribution) and preview exercises.
- Enforced strict tenant boundary composition:
  ```ts
  AND: [
    {
      OR: [
        { ownershipType: 'SYSTEM', organisationId: null },
        { ownershipType: 'ORGANISATION', organisationId },
      ],
    },
    dimensionCondition,
  ]
  ```

### 2. Anatomical Anterior/Posterior Taxonomy Foundation
Muscles are partitioned into:
- **Anterior (Front)**: Chest (Pectorals), Shoulders (Deltoids), Biceps, Forearms, Abdominals, Obliques, Quadriceps, Adductors, Hip Flexors, Calves.
- **Posterior (Back)**: Traps (Trapezius), Upper Back (Rhomboids), Lats (Latissimus Dorsi), Triceps, Lower Back (Erectors), Glutes, Hamstrings, Calves.
Target roles distinguish **Primary Target**, **Secondary Target**, and **Stabilizer** without making unsupported medical claims.

### 3. Accessible Body Map Foundation (`BodyMapVisualizer`)
Implemented a lightweight interactive anatomical component supporting:
- Visual interactive anterior/posterior region highlighting.
- High-contrast touch feedback.
- Accessible alternative List/Grid mode fully compliant with WCAG 2.1 AA standards for screen readers and keyboard navigation.

### 4. Cross-Discovery Drilldown (`CrossDiscoveryFilterBar`)
Co-occurrences are computed dynamically on the server:
- While exploring "Chest", members see connected chips for Dumbbells, Barbells, Push movements, and difficulty levels.
- Clicking chips applies multi-dimensional filtering seamlessly.

### 5. Explicit No-Equipment Mode
Equipment exploration provides an explicit **No Equipment / Bodyweight** mode that filters for `equipment IN ('BODYWEIGHT', 'NONE')` or `equipmentRequirement = 'NONE'`.

## Consequences

### Positive
- **Visual Engagement**: Transforms the exercise library into an interactive fitness encyclopedia.
- **Performance**: High performance through database grouping and indexed joins; avoids loading thousands of exercise objects to the client.
- **Security**: Strict multi-tenant isolation verified by automated E2E tests. Zero leakage between organisations.
- **Continuity**: Preserves all existing features from Days 61–68.

### Neutral / Trade-offs
- No full medical 3D anatomy engine was implemented today (by design, keeping bundle lightweight and mobile-reliable for Day 69).
