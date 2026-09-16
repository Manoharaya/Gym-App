# ADR-040: Exercise Movement Steps, Phases & Movement Intelligence Layer

## Status
Accepted

## Context
Day 61 established the visual exercise data foundation, Day 62 created the media asset storage engine, and Day 63 provided the step-by-step visual instructional system. Day 64 upgrades the exercise system to treat exercises as structured, machine-readable biomechanical movement lifecycles. Rather than just unstructured text or generic steps, exercises are decomposed into precise movement phases (`SETUP`, `START_POSITION`, `ECCENTRIC`, `TRANSITION_BOTTOM`, `ISOMETRIC_HOLD`, `CONCENTRIC`, `TRANSITION_TOP`, `LOCKOUT_FINISH`, `RESET_RETURN`) with joint alignment guidance, tempo breakdowns, breathing cadences, and sub-second video loops.

This establishes the foundational intelligence required for future AI coaching, form analysis, and computer vision (Day 69+) without implementing premature computer vision algorithms today.

## Decisions

### 1. Movement Phase Intelligence Architecture (`ExerciseMovementPhase`)
- Extended the existing `ExerciseMovementPhase` Prisma model to preserve full backward compatibility with seeded Day 61 exercise data (`phaseName`, `cueText`, `timestampMs`, `keyCheckpoints`).
- Enriched with machine-readable biomechanical attributes:
  - `phaseType`: Standardized phase enum (`SETUP`, `START_POSITION`, `ECCENTRIC`, `TRANSITION_BOTTOM`, `ISOMETRIC_HOLD`, `CONCENTRIC`, `TRANSITION_TOP`, `LOCKOUT_FINISH`, `RESET_RETURN`).
  - `bodyPosition` and `bodyOrientation`: Anatomical positions (`STANDING`, `SQUATTING`, `HINGED`, `SUPINE`, `PRONE`, etc.) and spatial orientations (`UPRIGHT`, `HORIZONTAL`, `INCLINED`, etc.).
  - `jointAlignments`: Array of structured biomechanical constraints (`joint`, `alignment`, `status`: `OPTIMAL`/`ACCEPTABLE`/`FAULT`, `cue`, `angleDegrees`).
  - `rangeOfMotionType` & `rangeOfMotionNotes`: Quantitative ROM targets (`FULL`, `PARTIAL`, `DEEP`, `PARALLEL`, `TERMINAL`, `ISOMETRIC`).
  - `breathingPattern` & `breathingNotes`: Respiratory coordination markers (`INHALE_DESCENT`, `EXHALE_EFFORT`, `HOLD_VALSALVA`, `CONTINUOUS_RHYTHMIC`, `EXHALE_RECOVERY`).
  - `tempoSeconds` & `holdDurationSeconds`: Cadence benchmarks for time-under-tension analysis.
  - `visualCues` & `commonMistakes`: Phase-specific visual guidance and pitfall corrections.

### 2. Top-Level Movement Structure Blueprint (`Exercise`)
- Extended `Exercise` with:
  - `secondaryMovementPatterns`: Array of secondary pattern classifications (e.g. `['HINGE', 'ROTATION']`).
  - `repetitionType`: Cadence model (`REPETITION`, `ISOMETRIC_HOLD`, `DISTANCE_INTERVAL`, `TIME_INTERVAL`, `COMPLEX`).
  - `tempoStructure`: Four-digit cadence blueprint (`eccentricSeconds`, `bottomHoldSeconds`, `concentricSeconds`, `topHoldSeconds`, `notes`).

### 3. Media Binding with Sub-Second Loop Timestamps
- Movement phases link directly to `ExerciseMedia` records via `mediaId`.
- Includes `videoStartTimeSeconds` and `videoEndTimeSeconds` for looping specific movement segments (e.g. 1.2s to 4.5s for the eccentric descent).

### 4. Relational Step-to-Phase Binding
- `ExerciseInstructionStep` has an optional `phaseId` pointing to `ExerciseMovementPhase`.
- Deleting a phase unlinks referenced instruction steps, common mistakes, and safety guidelines without deleting the parent steps.

### 5. AI Movement Intelligence Readiness
- Implemented `aiMovementIntelligence` payload compilation in `ExerciseMovementService` and enriched `ExerciseKnowledgeService.getExerciseKnowledge`.
- Delivers grounded, structured biomechanical parameters ready for future AI coaching and form analysis engines.

### 6. Zero-Trust Multi-Tenant Isolation
- Tenant staff cannot mutate or tamper with `SYSTEM` exercise movement data (`403 Forbidden`).
- Cross-tenant modifications are strictly forbidden (`403 Forbidden`).
- Reordering and media attachment validate entity ownership.

### 7. Interactive Mobile UX
- `ExerciseMovementTimeline`: Mobile interactive phase stepper with active phase deep-dive, joint alignment status cards, tempo/breathing callouts, and sub-second loop playback markers.
- `ExerciseMovementBuilderModal`: Phase authoring studio allowing trainers and coaches to configure phases, joint alignments, checkpoints, and video loops.

## Consequences
- **Positive**: Complete structured biomechanical lifecycle for exercises; members visualize exact joint alignments and tempos; future AI systems have grounded, structured metadata for rep counting and form feedback.
- **Trade-offs**: Requires rich data authoring for custom exercises; mitigated by sensible defaults (`ECCENTRIC` default phase, optional joint alignment arrays).
