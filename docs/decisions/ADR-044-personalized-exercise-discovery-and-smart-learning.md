# ADR-044: Personalized Exercise Discovery & Smart Learning Foundation

## Status
Accepted

## Context
Following the completion of Days 61–67 (Visual Exercise Library Foundation, Media Management, Visual Instructions, Movement Phases, Metadata Intelligence, Interactive Exercise Detail, and Visual Library Discovery), members were able to browse and search the complete exercise catalog.

However, displaying an unfiltered catalog of 100+ movements creates cognitive friction for members with specific goals, limited equipment, or different experience levels. Members require:
1. An intelligent, personalized discovery experience tailored to their goals, hardware, and experience.
2. A transparent, deterministic system that explains *why* an exercise is recommended (e.g. "Matches your chest goal", "Compatible with dumbbells").
3. A way to track educational progress across step-by-step technique guides ("Step 2 of 5 completed") and resume where they left off.
4. Complete control to edit their discovery preferences or reset them to profile defaults.
5. Strict zero-trust multi-tenant isolation ensuring no cross-gym data leakage.

## Decisions

### 1. Deterministic Multi-Signal Scoring Engine (Not Blackbox LLM)
Rather than delegating library sorting to a non-deterministic LLM at runtime, we implemented a deterministic rule-based scoring engine in `ExercisePersonalizationService`:
- **Goal Match (+35)**: Bidirectional mapping between member goals and exercise categories/tags.
- **Equipment Compatibility (+25)**: Compatible with member's gear or bodyweight.
- **Difficulty Match (+20)**: Matches member experience level.
- **Favorite Signal (+15)**: Bookmarked by member.
- **Category Preference (+10)**: Matches preferred movement style.
- **Recent Interest (+5)**: Recently viewed or practiced.

**Rationale**:
- Deterministic scoring is instant (<20ms query time).
- 100% explainable to the member through badge chips.
- Zero AI hallucinations or variable latency.
- Completely predictable and verifiable via automated unit and E2E testing.

### 2. Dedicated Persistence Models
- `MemberExercisePreference`: Stores explicit goals, equipment, difficulty, and location overrides, isolating preference changes from the member's core account credentials.
- `ExerciseLearningProgress`: Persists step numbers, completed instruction counts, exploration flags, and completion timestamps per `(userId, exerciseId)`.

### 3. Diversity Guardrails
To prevent top recommendations from being flooded by one movement pattern (e.g. 10 chest press variations), the engine enforces a maximum of 3 exercises per primary muscle group in the top "For You" feed.

### 4. Segmented Discovery Experience on Mobile
In `ExerciseLibraryScreen.tsx`, we introduced a dual-tab architecture:
- **"For You"**: Displays the Personalized Discovery Hub with summary banner, Continue Learning card carousel, and categorized horizontal carousels with reason tags.
- **"Explore All"**: Preserves the complete Day 67 search, filter modal, category discovery chips, and infinite catalog list.

### 5. Smart Educational Tracking in Detail Screen
In `ExerciseDetailScreen.tsx`, exploring biomechanical movement phases or instructional steps automatically updates `ExerciseLearningProgress`, while a dedicated "Mark Mastered" button lets members celebrate and track technique mastery.

## Consequences

### Positive
- High engagement through personalized recommendations and clear visual progress.
- Clean separation between member preference overrides and core profile defaults.
- Zero-trust IDOR multi-tenant security verified by comprehensive E2E test suite.
- Reusable presentation components (`ContinueLearningCard`, `PersonalizedExerciseSection`, `PersonalizationSettingsModal`) adhering to FitBeat design system.

### Negative / Trade-offs
- Two new database tables (`MemberExercisePreference`, `ExerciseLearningProgress`) with associated indexes.
- Signal scoring rules must be maintained if new fitness goal taxonomies are added in future iterations.
