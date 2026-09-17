# ADR-042: Interactive Exercise Detail & Visual Learning Experience

## Status
Accepted

## Context
Across Days 61 through 65, FitBeat established foundational data models and operational workflows for:
1. Visual Exercise Library Foundation (Day 61)
2. Media & Asset Management with presigned storage (Day 62)
3. Visual Step-by-Step Instructions & Coaching Cues (Day 63)
4. Movement Steps, Biomechanical Phases, and Joint Alignments (Day 64)
5. Structured Muscles, Equipment Relations, and Classification Intelligence (Day 65)

However, these capabilities were fragmented across distinct modals and separate queries, creating the potential for client-side N+1 waterfalls and disjointed member experiences.

Members need an integrated, Apple-grade **Exercise Detail & Visual Learning Experience** where:
- Opening an exercise provides instant clarity on what the movement is, what it looks like from various angles, how to set up, how to perform each phase, how to breathe, what tempo to maintain, and what errors to avoid.
- Movement phases and demonstration media operate in sync: tapping a phase highlights the movement and triggers a sub-second loop of that specific phase on the video player.
- Biomechanical progressions, regressions, and equipment swaps are categorized and accessible with 1-tap navigation.
- All visual, instructional, anatomical, equipment, and variation data load in a single optimized query with multi-tenant zero-trust protection.

## Decisions

### 1. Unified Single-Query API (`findVisualContent`)
We decided to extend `exercisesService.findVisualContent(organisationId, id)` to act as the single source of truth for the entire visual learning experience:
- It aggregates the exercise entity, presigned media URLs, movement phases, instruction steps, muscle relations, equipment relations, common mistakes, and safety guidelines in one database query.
- It calculates categorized variations (`progressions`, `regressions`, `variations`, and `substitutes`) with inverted directionality when the current exercise is the target of a relationship.
- It computes top biomechanically matched `relatedExercises` matching `primaryMuscleGroup` or `movementPattern`.

### 2. Multi-Format Demonstration & Sub-Second Phase Looping
We decided to implement `ExerciseHeroMedia` with:
- Multi-angle switcher for exercises with multiple demonstration angles (Front, Side, Isometric).
- Phase-loop synchronization: when an active phase with `videoStartTimeSeconds` and `videoEndTimeSeconds` is selected in `ExerciseMovementPlayer`, the media player isolates and loops that sub-second interval.
- Athletic fallback vector canvas for exercises without uploaded media, ensuring zero broken images or awkward empty states.

### 3. Interactive Movement Stepper (`ExerciseMovementPlayer`)
Rather than static text lists, we decided to build `ExerciseMovementPlayer`:
- Sequential phase stepper: Setup → Eccentric → Bottom/Hold → Concentric → Lockout/Finish.
- Real-time coaching cue banner with distinct visual accents.
- Dynamic chips for breathing rhythms (e.g., Inhale Descents, Exhale Effort) and tempo benchmarks (e.g., 3.0s eccentric).
- Joint alignment checklists and sub-steps linked to the active phase.
- Dedicated "Phase Loop" toggle syncing with the hero demonstration.

### 4. Categorized Progression & Substitution Section (`ExerciseRelationshipSection`)
We decided to present variations through structured segmented tabs:
- **Progressions**: Movements to level up once mastery is achieved.
- **Regressions**: Scaled-down alternatives for mobility or strength limitations.
- **Variations**: Grip, stance, or angle variations.
- **Substitutes**: Equipment and machine swaps for busy gym environments.
- **Related Movements**: Horizontal carousel recommending biomechanically adjacent exercises.

### 5. Multi-Tenant IDOR Protection
- Global system exercises (`ownershipType: 'SYSTEM'`) are accessible to all authenticated tenants in read-only mode.
- Custom organisation exercises (`ownershipType: 'ORGANISATION'`) strictly enforce matching `organisationId`.
- Unauthorized tenant requests return `NotFoundException` (404), eliminating IDOR leakage.

## Consequences

### Positive
- **Instant Visual Comprehension**: Members understand the exercise biomechanics, tempo, and breathing in seconds.
- **Zero Waterfall Loading**: Single network request returns all visual assets, phases, steps, muscles, and alternatives.
- **Cohesive Synchronization**: Sub-second phase video looping bridges the gap between static text instruction and visual form demonstration.
- **Reliable Fallbacks**: Graceful degradation ensures exercises without media or phases render cleanly without crashing.

### Negative / Trade-offs
- The payload for `findVisualContent` is larger than a simple exercise lookup. This is mitigated by selecting only required projection fields and presigning URLs with short TTL caching.
- Native video playback requires sub-second seeking capabilities, which depends on keyframe intervals in uploaded video assets.
