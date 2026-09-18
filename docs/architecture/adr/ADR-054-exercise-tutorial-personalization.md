# ADR-054: Exercise Tutorial Personalization, Learning Difficulty Adaptation & Interactive Practice Intelligence

## Status
Accepted (Day 78)

## Context
FitBeat 2.0 provides guided interactive exercise tutorials (Day 75), multi-exercise structured sessions (Day 76), and 360° multi-angle technique comparisons (Day 77). Prior to Day 78, every learner received an identical tutorial structure and depth regardless of their training background, prior mastery of the exercise, or recent rehearsal performance.

Beginners encountering complex compound movements (such as the Barbell Back Squat or Snatch) were often overwhelmed with advanced biomechanical notes, while experienced lifters were forced to step through basic equipment definitions they had already mastered. Furthermore, members who struggled on a knowledge check or identified recurring form flaws had no tailored, targeted review mechanism to focus on their specific weak points.

## Decisions

### 1. Deterministic, Transparent Adaptation Rule Engine
- **No Black-Box AI / Generative Hallucinations**: Educational content, coaching cues, and difficulty adaptations are computed deterministically via `ExerciseLearningPersonalizationService`.
- **4 Educational Depth Levels**:
  - `BASIC`: For beginners on complex exercises or first-time viewings; focuses on primary setup, key visual demo, and essential safety cues at 0.75x demonstration speed.
  - `STANDARD`: Balanced visual walkthrough with all movement phases and baseline checklist items.
  - `DETAILED`: For learners reviewing exercises after incomplete mastery or scores < 70%; prioritizes turnaround and eccentric phases, common mistakes, tempo, and joint tracking.
  - `ADVANCED`: For learners who scored $\ge 80\%$ or mastered the movement; unlocks full biomechanics, secondary synergists, multi-angle comparison, and rapid checklist self-audit.
- **5 Tutorial Modes**: `PERSONALIZED` (adaptive), `QUICK_LEARN`, `STEP_BY_STEP`, `MOVEMENT_BREAKDOWN`, and `TECHNIQUE_CHECKLIST`.

### 2. Multi-Tenant Learning Personalization Profiles (`LearningPersonalizationProfile`)
- Member preferences are stored in PostgreSQL with strict tenant isolation (`organisationId`, `userId`).
- User customization: Members can override recommended depths, modes, demonstration angles (`FRONT`, `SIDE`, `REAR`, `THREE_QUARTER`, `CLOSE_UP`), playback speeds (`0.75x` to `1.5x`), and toggle granular content (anatomy, technique details, auto-advance).
- Instant Reset: A member can reset their preferences at any time to restore dynamic adaptive defaults without affecting their workout logs, streaks, or completion history.

### 3. Targeted Technique Review & Practice Intelligence
- When a member scores $< 70\%$ on a knowledge check or completes an exercise with flagged technique faults, the system generates a `TargetedReviewResponse`.
- Highlights specific vulnerable phases (e.g., turnaround/transition), prioritized common mistakes to avoid, and breathing cadence.
- Interactive rehearsal allows checking off cues during self-audit.

### 4. Non-Diagnostic Boundary & Workout Isolation
- **Educational Only**: The system does not use camera computer vision, real-time pose estimation, or automated movement scoring. No medical, therapeutic, or clinical claims are made.
- **Physical Workout Isolation**: Viewing tutorials, practicing cues, or completing knowledge checks NEVER creates entries in `Workout` or `WorkoutExercise` tables. Learning telemetry remains strictly within `TutorialUserProgress` and `ExerciseLearningMastery`.

## Consequences
- **Positive**:
  - Eliminates cognitive overload for beginners by scaffolding educational depth.
  - Accelerates mastery for experienced lifters via technique checklists and quick-learn modes.
  - Enhances retention by recommending targeted reviews for struggling phases.
  - Full auditability and member trust with zero generative drift.
- **Neutral**:
  - Adds one database entity (`LearningPersonalizationProfile`) with indexed lookups on `[userId, organisationId]`.
  - Tutorial payloads include personal plan metadata, slightly expanding JSON responses while maintaining sub-100ms response times.
