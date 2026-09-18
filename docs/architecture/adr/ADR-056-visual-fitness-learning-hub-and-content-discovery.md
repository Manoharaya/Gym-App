# ADR-056: Visual Fitness Learning Hub, Content Discovery & Unified Education Home

## Status
Accepted (Day 80)

## Context
Across Days 61–79, FitBeat 2.0 engineered individual exercise learning and education capabilities:
- Visual exercise library & multi-angle demonstrations (Days 61, 77)
- Movement phases, instructions & biomechanics (Days 62–64, 74)
- Learning collections, paths, and curriculum tracks (Days 70, 73)
- Knowledge checks & assessments (Day 72)
- Interactive tutorials & guided rehearsal sessions (Days 75, 76)
- Learning personalization & adaptive tutorial modes (Day 78)
- Skill progression, funnel analytics & mastery intelligence (Day 79)

However, prior to Day 80:
1. Members had to navigate disjointed screens across the application to find, learn, practice, and review exercises.
2. There was no single landing destination synthesizing active courses, active tutorials, and active guided practice into a deterministic resume pipeline.
3. Recommendations lacked an aggregated surface with transparent explanation codes.
4. Content discovery across movements, muscles, equipment, and academy tracks lacked a unified search engine capable of returning cross-categorical results in a single query.

## Decisions

### 1. Consolidated Orchestration Service (`LearningHubService`)
- Created `LearningHubService` as an orchestration and read-model aggregation layer.
- Endpoint `GET /learning/hub` synthesizes 8 core sections in a single request:
  1. `continueLearning`: Merges in-progress Learning Paths, Tutorials (`ExerciseLearningProgress`), and Guided Sessions (`UserGuidedSessionProgress`) with calculated progress and deterministic resume pointers.
  2. `recommendedLearning`: Generates content recommendations based on user goals, active paths, and facility trends with transparent `reasonCode` and `reasonText`.
  3. `explore`: Assembles rich taxonomy dimensions (Movement Patterns, Muscles, Equipment, Categories) leveraging `ExerciseVisualDiscoveryService`.
  4. `guidedLearning`: Formats published Learning Paths, Curated Collections, and Guided Sessions with user enrollment context.
  5. `academy`: Surfaces Curricula tracks, completed lesson counts, and Glossary metrics.
  6. `reviewQueue`: Integrates the Day 79 targeted review queue for exercises scoring $< 70\%$ on knowledge checks.
  7. `myLearningSummary`: Compact learning summary (streak, learning hours, mastered exercises).
  8. `featuredExercises`: Visual exercise cards enriched with real-time `ContentMasteryBadge` statuses.

### 2. Cross-Categorical Unified Search Engine
- Implemented `GET /learning/hub/search?q={query}` to search concurrently across:
  - Exercises
  - Movement Patterns (Squat, Hinge, Push, Pull, Lunge, Carry, Rotation, Core)
  - Target Muscles (Primary & Secondary anatomy)
  - Equipment (Barbells, Dumbbells, Cables, Bodyweight, Machines)
  - Learning Paths
  - Curated Collections
  - Academy Curricula
  - Interactive Tutorials
- Strictly excludes non-`PUBLISHED` (Draft / Archived) content and enforces organization isolation.

### 3. Unified Mobile Client Experience (`LearningHomeScreen`)
- Modernized `apps/mobile/src/features/exercises/screens/LearningHomeScreen.tsx` into the unified **FitBeat Learning Hub**:
  - Integrated `LearningHubSearchBar` with debounced queries and categorized results.
  - Section filter pills (`All`, `Continue`, `Explore`, `Guided`, `Academy`, `Review`).
  - Interactive `LearningHubExploreGrid` for visual dimensional navigation.
  - `RecommendedLearningCard` featuring transparent recommendation reason badges.
  - Personalization settings gear triggering `PersonalizeLearningModal`.
  - Targeted Review Queue callout banner with 1-tap review actions.

### 4. Non-Diagnostic & Physical Workout Boundaries
- Educational telemetry and practice checklists are strictly isolated from physical workout logs (`Workout`, `WorkoutExercise`).
- The Learning Hub strictly disclaims automated athletic certification, camera pose estimation, and medical/orthopedic diagnosis.

## Consequences

- **Positive**:
  - Replaces fragmented educational navigation with a unified, state-of-the-art learning portal.
  - Reduces friction to continuing education through deterministic 1-tap resume pointers.
  - Increases discovery of high-value curriculum, multi-angle tutorials, and guided sessions.
  - Provides instant cross-categorical search across all educational dimensions.
  - Zero database bloat: 100% aggregation over existing models.
- **Neutral**:
  - Requires mobile client to render multiple horizontal carousels and tabs.
  - Handled via performant React Native components with memoization and lightweight primitives.
