# FitBeat Architecture: Exercise Detail & Visual Learning Experience (Day 66)

## 1. Executive Summary

Day 66 unifies the visual exercise foundation (Day 61), media management (Day 62), instructional authored steps (Day 63), movement intelligence and phases (Day 64), and muscle/equipment taxonomy intelligence (Day 65) into an interactive, member-facing **Exercise Detail & Visual Learning Experience**.

The goal is to provide members with Apple-grade educational clarity: within seconds of opening any exercise, they can visually comprehend what the movement is, observe proper form from multiple camera angles, scrub or loop individual movement phases with sub-second precision, learn tempo and breathing rhythms, identify key joint alignments, inspect targeted and synergist muscles, verify required equipment and alternatives, and seamlessly progress, regress, or substitute movements.

---

## 2. Core Architecture & Design Principles

```
                                  +---------------------------------------+
                                  |   ExerciseDetailScreen (Day 66)       |
                                  +---------------------------------------+
                                                      |
         +--------------------+-----------------------+-----------------------+--------------------+
         |                    |                       |                       |                    |
         v                    v                       v                       v                    v
+------------------+ +------------------+ +-----------------------+ +--------------------+ +----------------------+
| ExerciseHeroMedia| |ExerciseQuickFacts| | ExerciseMovementPlayer| | ExerciseMuscleCard | | ExerciseRelationship |
| (Video/Loop/3D)  | | (Attributes/Goal)| | (Phases/Cues/Breathing| | (Anatomy/Synergist)| |       Section        |
+------------------+ +------------------+ +-----------------------+ +--------------------+ |(Progress/Regress/Swap|
         |                                            |                                    +----------------------+
         +<====== Sync Active Phase Loop <============+
```

### 2.1. Single-Query Aggregation Architecture (`findVisualContent`)
To eliminate mobile N+1 waterfall requests and screen pop-in:
- The backend endpoint `GET /api/v1/exercises/:id/visual-content` returns the unified visual learning bundle in a single query:
  - Base Exercise attributes (difficulty, mechanics, category, tempo, breathing instructions, goals, tags).
  - Presigned Media collection (HD demonstration videos, multi-angle imagery, 3D assets).
  - Ordered Movement Phases with sub-second video timestamps, breathing patterns, tempo seconds, visual cues, and joint alignments.
  - Step-by-Step Instruction Steps linked to parent phases and visual assets.
  - Structured Muscle Relations (Primary, Secondary, Stabilizer roles with activation intensities).
  - Equipment Relations with requirement types, equipment categories, and home/gym/outdoor availability.
  - Categorized Variations: Pre-grouped into `progressions`, `regressions`, `variations`, and `substitutes` with directional inversion for target exercises.
  - Biomechanically Related Movements: Top recommendations matching `primaryMuscleGroup` or `movementPattern`.

### 2.2. Phase-Loop Timestamp Synchronization
- When a member selects a movement phase in `ExerciseMovementPlayer` (e.g., Phase 2: Eccentric Descent), the component notifies `ExerciseHeroMedia`.
- If the phase includes authored timestamps (`videoStartTimeSeconds` and `videoEndTimeSeconds`), the player automatically restricts demonstration playback to loop seamlessly over that sub-second interval.
- A "Phase Loop ON" pill provides 1-tap toggling between full exercise flow and phase-specific isolation.

### 2.3. Multi-Tier Graceful Degradation
- Exercises without uploaded videos render an athletic dark aesthetic canvas with dynamic movement pattern vector iconography, badges, and biomechanical indicators.
- Exercises without structured phases fall back gracefully to sequential instruction steps and text coaching tips without crashing or displaying empty spaces.

---

## 3. Component Hierarchy & Responsibilities

| Component | Directory | Responsibility |
| :--- | :--- | :--- |
| `ExerciseHeroMedia` | `apps/mobile/src/features/exercises/components/` | Multi-format demonstration viewer (video, image, 3D placeholder), angle switcher, sub-second loop playback, and fallback canvas. |
| `ExerciseQuickFacts` | `apps/mobile/src/features/exercises/components/` | Compact visual bar highlighting pattern, mechanics, difficulty, equipment requirements, muscle targets, tempo, and training goals. |
| `ExerciseMovementPlayer` | `apps/mobile/src/features/exercises/components/` | Interactive phase stepper, active phase cue banner, breathing rhythm, tempo chip, joint alignment checklist, sub-steps, and phase loop controls. |
| `ExerciseRelationshipSection`| `apps/mobile/src/features/exercises/components/` | Segmented tabs for Progressions (level up), Regressions (scale back), Variations (angles/grips), and Substitutes (equipment swaps), plus related movements carousel. |
| `ExerciseMuscleCard` | `apps/mobile/src/features/exercises/components/` | Anatomical muscle engagement breakdown with Primary, Secondary, and Stabilizer categorization. |
| `ExerciseStepPlayer` | `apps/mobile/src/features/exercises/components/` | Step-by-step how-to execution player with coaching cues and audio cues. |
| `ExerciseCompletenessScoreCard`| `apps/mobile/src/features/exercises/components/` | Real-time metadata audit score indicator. |
| `ExerciseDetailScreen` | `apps/mobile/src/features/exercises/screens/` | Master screen assembling the visual learning hub, native sharing, bookmarking, and trainer studio access. |

---

## 4. Multi-Tenant Security & Isolation
- The `findVisualContent` service verifies tenant access:
  - System exercises (`ownershipType: 'SYSTEM'`) are globally accessible read-only assets.
  - Organisation-owned custom exercises (`ownershipType: 'ORGANISATION'`) require `organisationId` match.
  - Any cross-tenant access attempts immediately reject with `NotFoundException` (404), preventing IDOR leakage.

---

## 5. Verification & Testing
- Automated E2E test suite in `services/api/test/exercise-visual-learning.e2e-spec.ts`:
  - Validates unified single-response visual learning bundle.
  - Validates variation categorization into progressions, regressions, and substitutes.
  - Validates directional inversion when an exercise is the target.
  - Validates biomechanically matched related exercise recommendations.
  - Validates strict tenant isolation between Organisation A and Organisation B.
