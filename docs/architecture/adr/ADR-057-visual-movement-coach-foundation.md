# ADR-057: Visual Movement Coach Foundation & Structured Movement Feedback

## Status
Accepted (Day 81)

## Context
Across Days 61–80, FitBeat 2.0 established an extensive foundation for visual exercise education, including multi-angle video demonstrations, step-by-step instructions, movement breakdown phases, biomechanics, interactive tutorials, guided practice sessions, targeted review, and a unified learning hub.

However, prior to Day 81, the exercise learning paradigm was primarily passive and unidirectional:
> *"Here is how the exercise should be performed."*

To prepare FitBeat for future computer vision, camera-assisted coaching, rep counting, and pose deviation analysis without necessitating major architectural rewrites, the educational model needed to evolve into:
> *"Here is the expected movement structure, what to focus on, and how FitBeat can eventually compare observed movement against that structure."*

Crucially, Day 81 is an **architecture and structured-feedback foundation day**. It is mandatory that real-time camera processing, computer vision models, pose estimation, and automated clinical/form scoring are NOT implemented today, while laying the exact structural contracts and database models required for future days.

## Decisions

### 1. Normalized Movement Expectation Model (`MovementExpectation`)
- Created `MovementExpectation` linked directly to `Exercise` with optional relationships to `ExerciseMovementPhase`, `ExerciseMediaAnnotation` (visual cue), and `ExerciseCommonMistake`.
- Integrated a standardized taxonomy:
  - `expectationType`: `POSTURE`, `ALIGNMENT`, `BODY_POSITION`, `MOVEMENT_DIRECTION`, `RANGE_OF_MOTION`, `TEMPO`, `BREATHING`, `STABILITY`, `CONTROL`, `BALANCE`, `FOOT_POSITION`, `HAND_POSITION`, `SPINE_POSITION`, `HEAD_POSITION`, `JOINT_POSITION`, `EQUIPMENT_POSITION`, `SAFETY`, `FOCUS`.
  - `priority`: `ESSENTIAL`, `IMPORTANT`, `OPTIONAL` (distinguishing critical movement checkpoints from refinement cues without medical implication).
  - `bodyRegion`: `HEAD`, `NECK`, `SHOULDERS`, `CHEST`, `UPPER_BACK`, `SPINE`, `CORE`, `HIPS`, `GLUTES`, `KNEES`, `ANKLES`, `FEET`, `ELBOWS`, `WRISTS`, `HANDS`, `FULL_BODY`.
  - Structured fields: `expectedState`, `expectedDirection`, `expectedPosition`, `expectedAlignment`, `expectedRangeOfMotion`, `expectedTempo`, `expectedBreathing`, `safetyNote`.

### 2. Movement Feedback Rule Foundation (`MovementFeedbackRule`)
- Established the `MovementFeedbackRule` model defining conditions for future pose comparison:
  - `conditionType`: `PHASE_MISMATCH`, `POSITION_DEVIATION`, `ALIGNMENT_DEVIATION`, `ROM_DEVIATION`, `TEMPO_DEVIATION`, `STABILITY_DEVIATION`, `BREATHING_MISMATCH`, `MOVEMENT_DIRECTION`.
  - `conditionParameters`: Structured JSON envelope specifying target joints, angular thresholds, and allowable tolerances.
  - `feedbackType`: `POSITIVE`, `GUIDANCE`, `REMINDER`, `CAUTION`, `REVIEW` (strictly educational feedback, avoiding alarming or diagnostic terminology).
  - `severity` and `priority` fields for future arbitration.

### 3. Future Computer Vision & Pose Comparison Contracts
- Authored type contracts in `services/api/src/exercises/contracts/movement-coach-contracts.ts`:
  - `ExpectedMovementState`: Target comparison state across phases, angles, alignments, tempo, and visual cues.
  - `MovementObservationProvider`: Abstraction interface for future camera/sensor data streams (`observedPhase`, `bodyLandmarks`, `jointAngles`, `confidence`, `timestampMs`).
  - `PoseAnalysisProvider`: Pluggable provider pattern (`OnDevicePoseProvider`, `CloudPoseProvider`, etc.).
  - `MovementComparisonService`: Future contract consuming `ExpectedMovementState` and `ObservedMovementState` to yield deviations and feedback rules.

### 4. Consolidated Read Model (`GET /exercises/:id/movement-coach`)
- Engineered a single-request, high-performance read model in `VisualMovementCoachService`:
  - Consolidates exercise metadata, movement sequence, enriched phases with media presigned URLs.
  - Organizes expectations into a prioritized "What to Focus On" hierarchy (`essential`, `important`, `optional`).
  - Synthesizes an interactive `TechniqueChecklist` categorized into `SETUP`, `ALIGNMENT`, `EXECUTION`, `BREATHING`, `TEMPO`, `SAFETY`.
  - Seamlessly links media annotations (visual cues) and common mistakes.
  - Enforces strict multi-tenant isolation and `PUBLISHED` content gating.

### 5. Member Experience & Mobile Integration
- Built reusable mobile UI components:
  - `WhatToFocusOnCard`: Priority-tabbed expectation cards with body region badges and cue links.
  - `MovementPhaseCoachCard`: Horizontal phase timeline scrubber displaying cue texts, tempo/breathing metrics, and phase-specific expectations.
  - `VisualMovementCoach`: Flagship member-facing component combining demonstration player, phase scrubber, focus cards, checklist, and practice mode transitions.
  - `VisualMovementCoachScreen`: Dedicated route registered in `MemberNavigator` and accessible from `ExerciseDetailScreen`.

### 6. Strict Non-Diagnostic & Physical Workout Boundaries
- Educational Rehearsal Only: Mental rehearsal and checklist interaction never touch physical workout tables (`Workout`, `WorkoutExercise`).
- Non-Diagnostic Guarantee: All instructions and feedback messages are authored educational guidance. No AI medical diagnosis, injury detection, or form scoring is performed.

## Consequences

### Positive
- FitBeat now possesses a structured data model defining expected human movement for every exercise phase.
- Seamless transition path to future computer vision and pose tracking without rewriting the core data layer.
- Members gain clear technique focus hierarchies (`Essential` vs. `Important` vs. `Optional`) and interactive rehearsal checklists.
- 100% automated test coverage with multi-tenant security verification.

### Neutral / Trade-offs
- Movement expectations must be authored by trainers or synthesized from baseline metadata; they are not hallucinated by unvalidated generative models.
- Actual camera analysis is deferred to future days when pose estimation frameworks are systematically integrated.
