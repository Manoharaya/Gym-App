# ADR-039: Exercise Visual Instructions & Step-by-Step Learning System

## Status
Accepted

## Context
Day 61 established the visual exercise foundation (taxonomy, biomechanics, movement phases, equipment relations, variations) and Day 62 established the media asset storage engine. Day 63 transforms exercise data into an interactive, step-by-step visual learning experience. Members require structured progression: understanding equipment setup, starting stance, step-by-step biomechanical execution, breathing cadence, isometric hold timing, visual cues, and safety considerations. Trainers require authoring and editing tools with zero-admin preview capabilities.

## Decisions

### 1. Hierarchical Master-Step Instruction Architecture
- **Master Overview (`ExerciseInstruction`)**: Represents the top-level pedagogical guide for an exercise (1:1 relation with `Exercise`). Contains executive overview, preparation & equipment station guidance, starting position, breathing rhythm summary, and safety contraindications, with versioning (`version: number`).
- **Sequential Steps (`ExerciseInstructionStep`)**: Detailed coaching checkpoints (1:N relation with `ExerciseInstruction`). Enhanced with `stepType`, `movementPhase`, `visualCue`, `visualCueCategory`, `detailedInstruction`, `tempo`, `breathing`, `durationSeconds`, `holdDurationSeconds`, `repetitions`, `trainerTip`, `safetyNote`, and `mediaId`.
- **Backward Compatibility**: `ExerciseInstructionStep` preserves direct relation to `Exercise` and existing legacy fields (`coachingCue`, `phase`) so pre-existing seeded content from Day 61 resolves seamlessly without schema migration breakage or data loss.

### 2. Media Asset Binding with Sub-Second Clip Timestamps
- Individual steps can bind directly to `ExerciseMedia` records created in Day 62.
- Supports precision video start and end offsets (`videoStartTimeSeconds`, `videoEndTimeSeconds`) to pinpoint movement phases (e.g. 0:02 to 0:05 for the eccentric phase) from longer demonstration clips.
- Server-side validation strictly enforces `videoStartTimeSeconds <= videoEndTimeSeconds`.

### 3. Atomic Sequence Reordering and Automatic Renumbering
- Reordering is performed transactionally via `POST /exercises/:id/instruction/reorder` using a two-pass assignment to ensure collision-free contiguous 1-based step indexing (`stepNumber: 1, 2, 3...`).
- Deleting a step automatically decrements subsequent steps in a single atomic transaction, guaranteeing no orphaned sequence gaps.

### 4. Publication Lifecycle & Guardrails
- Sequence statuses: `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED`.
- Publishing an instruction sequence requires at least one configured step; empty sequences reject publication with `400 Bad Request`.
- Publishing an instruction atomically transitions the parent guide and all related steps to `PUBLISHED`.

### 5. Zero-Trust Multi-Tenant Isolation
- Tenant staff cannot mutate or tamper with `SYSTEM` exercise instructions (`403 Forbidden`).
- Tenant A staff cannot view or mutate Tenant B custom exercise instructions (`403 Forbidden`).
- Members of all tenants can read published instructions for system exercises and their own organisation's exercises.

### 6. Interactive Step-by-Step Mobile Experience
- `ExerciseStepPlayer`: Mobile component featuring segmented progress indicators, visual media with clip offset indicators, biomechanical collapsible deep-dives, visual cue cards with category chips, rhythm metrics (breathing, tempo, hold duration), coach tips, and safety alerts.
- `ExerciseInstructionEditorModal`: Trainer/admin studio with real-time step reordering, visual media selection, and a "Preview as Member" zero-admin mode.

## Consequences
- **Positive**: Exercises transform from static text into pedagogical, interactive visual mastery guides; members learn safe form and proper tempo; trainers easily manage instructional sequences.
- **Trade-offs**: Detailed biomechanical step authoring requires thoughtful data input from trainers, mitigated by default templates and executive summaries.
