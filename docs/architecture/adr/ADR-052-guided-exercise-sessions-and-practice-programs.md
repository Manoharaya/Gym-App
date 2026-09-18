# ADR-052: Guided Exercise Sessions, Multi-Exercise Tutorial Flows & Structured Practice Programs

## Status
Accepted

## Date
2026-09-18

## Context
FitBeat 2.0 Day 75 established single-exercise interactive tutorials (Demonstration $\to$ Instructions $\to$ Movement Phases $\to$ Technique Coaching $\to$ Practice $\to$ Knowledge Check). However, members required structured, sequential learning programs that guide them through multi-exercise progression—such as learning a squat followed by a hinge, or transitioning from a core activation drill into a compound barbell movement, complete with warm-ups, non-diagnostic rehearsal intervals, rest breaks, and knowledge retention checks.

Key challenges and requirements:
1. **Separation from Physical Workout Logging**: Guided sessions must never pollute workout tracking (`Workout`, `WorkoutExercise`), set/rep metrics, volume load, or PR calculations with rehearsal attempts.
2. **Pedagogical Safety Boundaries**: No AI computer vision, video processing, or automatic rep counters. Rehearsal must use structured self-reflection, manual rep stepping, and countdown timers.
3. **Sequential Player Orchestration**: A state machine that guides members through `INTRO`, `WARMUP`, `EXERCISE_TUTORIAL`, `PRACTICE`, `REST`, `TRANSITION`, `KNOWLEDGE_CHECK`, `COOLDOWN`, and `SUMMARY` steps with deterministic resume capability.
4. **Reusability & Multi-Tenancy**: Global SYSTEM catalog sessions vs tenant-specific custom authoring with IDOR protection, validation rules, and session duplication.
5. **Component Reusability**: Seamless embedding of Day 75 `InteractiveExerciseTutorial` and Day 72 `KnowledgeCheckPlayer` without code duplication.

## Decisions

### 1. Educational Domain Model Separation
- Introduced `GuidedSession`, `GuidedSessionSection`, `GuidedSessionItem`, `UserGuidedSessionProgress`, and `UserGuidedSessionItemCompletion` models in Prisma.
- Rehearsals are stored strictly in `UserGuidedSessionItemCompletion` (`repetitionsCompleted`, `durationSpentSeconds`, `restSkipped`, `notes`).
- **No records are created in `Workout` or `WorkoutExercise`**, ensuring total integrity of athletic performance history.

### 2. Sequential Orchestration & Deterministic Resume
- The session flow enforces a linear or section-based progression with `currentStepIndex` maintained in `UserGuidedSessionProgress`.
- On launch, the player queries `GET /guided-sessions/resume` or the session progress to resume exactly where the user left off.
- Members can restart completed sessions via `{ resetProgress: true }`.

### 3. Non-Diagnostic Practice Rehearsal
- Practice steps feature a dual-mode interface: countdown timer for timed holds/stretches and an increment/decrement stepper for repetitions.
- A biomechanical checklist requires members to verify joint alignment and sensory cues before completing practice.
- Non-diagnostic disclaimers make clear that FitBeat does not verify movement using camera sensors.

### 4. Authoring, Duplication & Quality Validation
- Trainers and admins can build custom sessions, group items into sections, and reorder steps using an accessible modal.
- `validateGuidedSession` enforces minimum pedagogical standards (at least 2 items, at least 1 exercise tutorial, valid exercise/check foreign keys, contiguous sort ordering) before publishing.
- Trainers can duplicate SYSTEM or tenant sessions to their own organization as editable drafts.

### 5. Multi-Tenant Security & Immutability
- SYSTEM sessions have `organisationId: null` and cannot be modified or deleted by tenant trainers/admins (`ForbiddenException`).
- User progress endpoints enforce IDOR checks ensuring members can only read or update their own progress.

## Consequences

### Positive
- Delivers a cohesive, immersive learning experience that bridges theoretical fitness knowledge with practical movement rehearsal.
- Preserves absolute integrity of workout performance metrics and physical tracking data.
- Avoids safety and privacy risks associated with unverified computer vision / webcam tracking.
- Trainers gain powerful curriculum authoring capabilities with validation guarantees.

### Negative / Trade-offs
- Practice rehearsal relies entirely on self-reporting and honesty rather than automated physical verification.
- Reordering large sessions requires atomic transaction updates to preserve contiguous sequence ordering.
