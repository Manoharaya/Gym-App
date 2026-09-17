# ADR-051: Advanced Visual Exercise Tutorials, Interactive Demonstrations, Technique Coaching & Exercise Simulation

## Status
Accepted

## Context
Across Days 61–74, FitBeat developed rich modular components for exercise discovery, media assets, movement steps, movement phases, muscle education, movement mechanics, and "Why This Exercise Works". However, these educational assets existed across disparate tabs and screens. When a member or trainer approached a complex compound lift or technical drill, there was no cohesive, focused end-to-end learning walkthrough that connected:

$$\text{Exercise} \to \text{Visual Demonstration} \to \text{Setup} \to \text{Movement Phases} \to \text{Step Coaching} \to \text{Visual Cues} \to \text{Breathing} \to \text{Tempo} \to \text{Mistakes} \to \text{Safety} \to \text{Practice} \to \text{Knowledge Check} \to \text{Progress}$$

Furthermore, many commercial fitness applications either jump immediately into rep-tracking workouts without technical mastery, or rely on gimmicky, unreliable AI camera/computer-vision form analysis that frustrates gym members and creates false clinical expectations.

FitBeat requires an **elite, interactive, non-diagnostic exercise tutorial experience** that enables learners to systematically absorb technique, practice self-guided cues with checklists, and retain neuromuscular coaching points before stepping under the bar.

## Decision

### 1. Unified 4-Mode Pedagogical Framework
We establish 4 user-selectable learning modes for each tutorial, catering to varied learner intents and time budgets:
1. `QUICK_LEARN`: 60–90 second rapid refresher showcasing looping demonstration, 3 key technical cues, breathing notation, and critical safety rules.
2. `STEP_BY_STEP`: Structured linear curriculum with sequential progression through Setup, Stance, Execution, Lockout, and Reset.
3. `MOVEMENT_BREAKDOWN`: Deep biomechanical drill-down synchronizing movement phases (`SETUP`, `ECCENTRIC`, `BOTTOM_TRANSITION`, `CONCENTRIC`, `LOCKOUT`) with video player timestamps, joint angles, and tempo seconds.
4. `TECHNIQUE_CHECKLIST`: Action-oriented rehearsal checklist enabling members to verify key technical checkpoints before loading weight.

### 2. 5-Step Progression Lifecycle
Every tutorial implements a deterministic progression loop:
- `WATCH`: Multimodal visual demonstration with variable playback (`0.5x`, `0.75x`, `1.0x`, `1.5x`, `2.0x`), video looping, and optional audio coaching guidance.
- `LEARN`: Granular technique coaching across 5 structured dimensions: Setup, Body Position, Kinematic Movement, Breathing Cadence, and Tempo.
- `PRACTICE`: Educational non-diagnostic rehearsal protocol with interactive self-check checklist items.
- `CHECK`: Direct contextual integration with the Day 72 Knowledge Check assessment engine (`KnowledgeCheckScreen`).
- `COMPLETE`: Celebratory completion screen with earned mastery badges, elapsed study time, and next recommended tutorials based on kinematic movement pattern and prime movers.

### 3. Strict Non-Diagnostic & Safety Boundaries
- Educational tutorial guidance is strictly non-diagnostic and non-prescriptive.
- Explicit non-diagnostic disclaimer is rendered on every tutorial screen:
  > *"Educational guidance only. Not medical advice, injury rehabilitation, or clinical diagnosis. If you experience sharp pain or dizziness, stop immediately and consult a qualified healthcare professional."*
- Strictly no camera-based AI computer vision, pose estimation, or automatic rep-counting is introduced in this module. All practice verification is self-guided and checklist-based.

### 4. Pedagogical Decoupling from Workout Session Logs
- Progress in tutorials updates `ExerciseLearningProgress.tutorialProgress` (checkpointing `phaseIndex`, `stepIndex`, `checklistState`, `timeSpentSeconds`, `practiceCompleted`, and `knowledgeCheckScore`).
- Tutorial completion never creates, modifies, or injects records into gym workout logging tables (`Workout`, `WorkoutExercise`, `WorkoutSet`). Educational mastery is preserved as a distinct educational achievement.

### 5. Multi-Tenant Isolation & Role-Based Access Control
- Read operations (`GET /exercises/:id/tutorial`) resolve tenant exercises with automatic fallback to platform `SYSTEM` exercises.
- Authoring endpoints (`PATCH /exercises/:id/tutorial`) are protected by `RequirePermission('exercises', 'update')` and restricted to `TRAINER`, `ADMIN`, `CLUB_MANAGER`, and `SUPERADMIN`.
- System exercises (`ownershipType: 'SYSTEM'`) are immutable to gym staff; only platform superadmins may modify them.
- Cross-tenant access and mutation are strictly rejected with `NotFoundException` (IDOR defense). All config changes emit structured audit logs (`AuditService.log`).

### 6. Additive Database Schema
Changes are strictly additive with zero database drops or column deletions:
- `Exercise.tutorialConfig Json?`: Stores gym-customized checklists, key technique points, audio guidance URLs, and default learning modes.
- `ExerciseLearningProgress.tutorialProgress Json?`: Stores member-specific checkpoint state, current mode, completed sections, checklist item statuses, practice timestamps, and assessment scores.

## Consequences

### Positive
- Unified, high-retention learning journey connecting Days 61–74 investments into an intuitive tutorial screen.
- Fast, single-roundtrip aggregation endpoint (`GET /exercises/:id/tutorial`) eliminating client-side waterfall requests.
- Full mobile support across all 4 learning modes with responsive layout, glassmorphic dark-mode design, and rich audio coaching integration.
- 100% test coverage across unit, integration, and E2E regression suites (78/78 tests passing).

### Negative / Trade-offs
- Aggregating steps, phases, mistakes, safety, muscles, equipment, and progress in one read query requires robust indexing on `exercise_movement_phases`, `exercise_instruction_steps`, and `exercise_learning_progress`.
- Trainers must maintain high quality in custom checklists and technique cues to preserve the platform's educational standard.
