# FitBeat Architecture: Advanced Visual Exercise Discovery, Muscle & Equipment Explorer (Day 69)

## 1. Executive Summary

Day 69 delivers the **Advanced Visual Exercise Discovery Experience** on top of the exercise foundation built across Days 61–68. It transforms FitBeat's Exercise Library from a simple filterable list into an interactive visual fitness knowledge platform.

Members can visually explore:
- **Muscles & Anatomy**: Interactive anterior & posterior body map visualization with target roles (Primary Mover, Secondary Target, Stabilizer).
- **Equipment**: Free weights, machines, accessories, and an explicit **No Equipment / Bodyweight** mode.
- **Movement Patterns**: Biomechanical movement planes (Squat, Hinge, Push, Pull, Lunge, Carry, Rotation, Isolation).
- **Categories & Training Goals**: Strength, Cardio, Mobility, Core, Recovery, HIIT, Hypertrophy, and Endurance.
- **Difficulty Distribution**: Real server-aggregated tiers (Beginner, Intermediate, Advanced, Expert).
- **Cross-Discovery**: Seamless multi-dimensional drilldown (e.g. Chest -> Dumbbells -> Beginner -> Push -> Strength).

---

## 2. Core User Journey

```text
EXPLORE → SELECT → UNDERSTAND → VIEW EXERCISES → LEARN → SAVE → USE
```

1. **Explore**:
   - Member opens the Exercise Library and selects the **Explore All** tab.
   - Visually browses the anterior or posterior **Body Map**, or browses visual cards for Equipment, Movements, and Categories.
2. **Select**:
   - Member taps **Chest (Pectorals)** on the anterior body map or taps the **Dumbbells** equipment card.
3. **Understand**:
   - The member is presented with **ExerciseDimensionDetailScreen**:
     - Visual badge breakdown (region, group, exercise count).
     - Target role breakdown (e.g., 42 total, 28 primary, 14 secondary).
     - Educational explanation of the muscle/movement mechanics (strictly fitness-oriented, zero medical claims).
     - Contextual **CrossDiscoveryFilterBar** displaying co-occurring equipment, movements, and difficulties.
4. **View Exercises**:
   - Filtered exercise cards display primary thumbnails, target badges, and difficulty pills.
5. **Learn & Save**:
   - Tapping an exercise card opens the interactive Day 66 **ExerciseDetailScreen** (movement phases, instruction steps, safety guidelines, common mistakes).
   - Tapping the heart icon toggles the exercise favorite bookmark with immediate optimistic feedback.
6. **Use**:
   - Member can add the exercise directly to a workout or track learning progress (Day 68).

---

## 3. System Architecture & Component Mapping

```text
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Client (React Native)              │
│                                                             │
│  ExerciseLibraryScreen                                      │
│  ├── [For You Tab] (Day 68 Personalized Hub)                │
│  └── [Explore All Tab] (Day 69 Visual Discovery Hub)        │
│        ├── BodyMapVisualizer (Anterior / Posterior)         │
│        ├── Browse by Equipment (DimensionExplorerCard)      │
│        ├── Browse by Movement Pattern                       │
│        └── Browse by Goal & Difficulty                      │
│                                                             │
│  ExerciseDimensionDetailScreen                              │
│  ├── Dimension Header & Breadcrumbs                         │
│  ├── Target Role Tabs (All / Primary / Secondary)           │
│  ├── CrossDiscoveryFilterBar (Co-occurring filters)        │
│  └── Exercise Cards Feed -> Navigates to Day 66 Detail     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP /api/v1/exercise-discovery
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     NestJS API Backend                      │
│                                                             │
│  ExerciseDiscoveryController                                │
│  ├── GET /exercise-discovery/overview                       │
│  ├── GET /exercise-discovery/categories                     │
│  ├── GET /exercise-discovery/muscles                        │
│  ├── GET /exercise-discovery/equipment                      │
│  ├── GET /exercise-discovery/movements                      │
│  ├── GET /exercise-discovery/goals                          │
│  ├── GET /exercise-discovery/difficulty                     │
│  └── GET /exercise-discovery/:dimension/:value              │
│                                                             │
│  ExerciseVisualDiscoveryService                             │
│  ├── Server-side Prisma groupBy aggregation                 │
│  ├── Co-occurrence calculation for related dimensions       │
│  ├── Representative media resolution & presigning           │
│  └── Strict Tenant & Active Status boundary enforcement     │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Queries
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database (Prisma)              │
│                                                             │
│  - exercises                                                │
│  - exercise_media                                           │
│  - exercise_muscle_relations                                │
│  - exercise_equipment_relations                             │
│  - exercise_instruction_steps                               │
│  - exercise_movement_phases                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Tenant Isolation & Zero-Trust Security

- **Strict Tenant Boundary Enforcement**:
  Every query in `ExerciseVisualDiscoveryService` strictly enforces:
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
- **IDOR Protection**:
  Private exercises belonging exclusively to Organisation B are never counted, previewed, or leaked in Organisation A's discovery overview or dimension detail views. Verified with 100% test coverage in `exercise-visual-discovery.e2e-spec.ts`.
- **Published Status**:
  Members only discover published, active exercises.

---

## 5. Accessibility & Responsive UX (WCAG 2.1 AA)

- **Interactive Body Map**:
  Provides a toggle between **Visual Diagram Mode** and **Accessible List / Grid Mode**.
- **Keyboard & Screen Reader Navigation**:
  All anatomical muscle regions and dimension explorer cards feature descriptive `accessibilityLabel` attributes (e.g. `"Chest (Pectorals), 42 exercises available"`), proper `accessibilityRole="button"`, and `accessibilityState={{ selected }}`.
- **Color Independence**:
  Selected states use high-contrast borders, badges, and distinct text color in addition to background color fills.
