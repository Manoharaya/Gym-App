# ADR-058: Visual Movement Coach — Guided Practice Sessions & Movement Feedback Experience

## Status
Accepted (Day 82)

## Context
Following Day 81's establishment of the structured movement coach architecture (`MovementExpectation`, `MovementFeedbackRule`, `TechniqueChecklist`, and future CV contracts), the next logical step in the FitBeat 2.0 educational roadmap was turning this static structural foundation into an engaging, deliberate **Guided Movement Practice Experience**.

Prior to Day 82, a member could review expectations and tick checklist items on the detail page, but lacked a dedicated practice session flow that walked them through:
1. Environment and setup preparation.
2. Step-by-step deliberate rehearsal of each movement phase with focus cues and timer/rep recording.
3. Structured self-reflection on movement fidelity.
4. Technique knowledge checks.
5. Actionable educational learning feedback without diagnostic claims.

Crucially, Day 82 remains a **pre-camera implementation**. It does NOT implement computer vision, webcam pose estimation, automatic rep counting, or injury risk scoring. Furthermore, movement rehearsal must never mutate physical workout logging tables (`Workout`, `WorkoutExercise`).

## Decisions

### 1. Persistence Model: `MovementPracticeSession`
- Implemented `MovementPracticeSession` in Prisma schema with full multi-tenant isolation (`organisationId`, `userId`, `exerciseId`).
- Added relations to `User`, `Exercise`, and `ExerciseMovementPhase`.
- Tracked session state machine:
  - `status`: `NOT_STARTED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `ABANDONED`.
  - `currentStep`: `INTRO`, `PREPARATION`, `PHASE_LEARNING`, `PHASE_PRACTICE`, `PHASE_REVIEW`, `SELF_REVIEW`, `KNOWLEDGE_CHECK`, `SUMMARY`, `COMPLETED`.
  - `phasePracticeData`: JSON array recording completed reps, duration in seconds, and timestamps per phase.
  - `checklistState`: JSON map storing checked technique items across phases.
  - `selfReflection`: JSON storing member-selected reflection focus topics and optional notes.
  - `knowledgeCheckScore` & `knowledgeCheckCompleted`: Quiz tracking for the session.

### 2. Practice Service & Endpoints (`MovementPracticeService`)
- Created `services/api/src/exercises/services/movement-practice.service.ts` and `MovementPracticeController`:
  - `GET /api/v1/exercises/:id/guided-practice`: Aggregates exercise setup instructions, safety guidelines, ordered phases with expectations/cues/mistakes, technique checklists, and stripped knowledge check questions (answer keys sanitized).
  - `POST /api/v1/exercises/:id/guided-practice/session`: Starts or resumes a guided practice session.
  - `GET /api/v1/movement-practice-sessions/:id`: Retrieves session state with tenant & actor validation.
  - `PATCH /api/v1/movement-practice-sessions/:id`: Updates step, checklist state, or pauses session.
  - `POST /api/v1/movement-practice-sessions/:id/phases/practice`: Records phase repetition count and timer duration.
  - `POST /api/v1/movement-practice-sessions/:id/phases/:phaseId/review`: Records phase technique checklist validation and updates overall progress percentage.
  - `POST /api/v1/movement-practice-sessions/:id/complete`: Finalizes session, generates educational learning feedback, synchronizes `ExerciseLearningProgress` (`practiceCompleted: true`), and emits learning activity telemetry via `ExerciseLearningMasteryService`.
  - `GET /api/v1/movement-practice-sessions/active`: Retrieves in-progress session for easy resumption.

### 3. Strict Boundary Guarantees
- **Non-Mutation of Physical Workouts**: Rehearsal sessions do NOT alter physical workout history (`Workout`, `WorkoutExercise`). Verified by automated E2E tests checking zero delta in workout rows before and after completion.
- **Non-Diagnostic Tone**: All feedback is framed around educational rehearsal, checklist completion, and theoretical comprehension (e.g., "Movement learning and structured rehearsal complete. Solid technique comprehension established.") rather than diagnostic validity ("Form 95% safe").
- **Zero Heavy ML / Camera Overhead**: Flow functions reliably on all mobile devices and offline-cached profiles without needing camera permissions or high battery consumption.

### 4. Mobile Client Architecture (`apps/mobile`)
- Extended `ExerciseService` with Day 82 static methods and TypeScript interfaces.
- Built modular UI components in `src/features/exercises/components/`:
  - `GuidedPracticeIntroCard`: Exercise overview, badges, estimated time, 4-step practice preview, and pre-camera educational notice.
  - `GuidedPracticePreparationCard`: Equipment inspection, environment clearance checklist, starting posture verification, and safety guidelines.
  - `PhasePracticeInteractiveCard`: Phase indicator, coaching cue callouts, key focus checkpoints, common mistakes, interactive rep counter, and stopwatch timer.
  - `GuidedPracticeSummaryCard`: Celebration header, rehearsal statistics (phases, checkpoints, quiz score), educational form feedback, and repeat/return CTAs.
- Created `GuidedMovementPracticeScreen` in `src/features/exercises/screens/`:
  - Full-screen state machine orchestrating Intro $\to$ Preparation $\to$ Phase Practice $\to$ Self-Review $\to$ Knowledge Check $\to$ Summary.
  - Registered route in `MemberNavigator` and navigation types.
  - Connected navigation triggers from `VisualMovementCoachScreen` and `ExerciseDetailScreen`.

## Consequences

### Positive
- **Structured Progression**: Transforms passive video viewing into active deliberate practice.
- **Clean Separation of Concerns**: Educational movement practice is completely decoupled from workout sets/reps logging.
- **Future Camera Readiness**: Because phases, reps, durations, and checklists are recorded structurally, Day 83+ pose estimation can plug in seamlessly as an alternate or enhanced input provider without changing the session lifecycle.
- **High Test Confidence**: Verified by comprehensive backend E2E tests (13/13 passing) and 0 mobile TypeScript errors.

### Trade-offs
- Movement fidelity is currently self-assessed by the user through checklists and self-reflection rather than automated sensor analysis. This is deliberate by design for Day 82.
