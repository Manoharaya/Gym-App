# FitBeat Exercise Visual Instructions & Step-by-Step Learning Architecture

## 1. System Overview

The FitBeat Exercise Visual Instructions & Step-by-Step Learning System transforms exercises into structured, interactive pedagogical experiences. Members can explore an exercise chronologically: from preparation station setup and starting stance, through granular execution phases, isometric holds, breathing rhythms, tempo guidance, and safety contraindications.

```text
FITBEAT STEP-BY-STEP LEARNING ARCHITECTURE
┌────────────────────────────────────────────────────────┐
│               Exercise Record (Exercise)               │
└───────────────────────────┬────────────────────────────┘
                            │ 1 : 1
                            ▼
┌────────────────────────────────────────────────────────┐
│         Master Instruction (ExerciseInstruction)       │
│  - Preparation Guide       - Starting Position Stance  │
│  - Execution Summary       - Breathing Cadence Rhythm  │
│  - Safety Summary          - Status & Version Tracker  │
└───────────────────────────┬────────────────────────────┘
                            │ 1 : N
                            ▼
┌────────────────────────────────────────────────────────┐
│      Sequential Steps (ExerciseInstructionStep)        │
│  - Step Type (PREP, START, EXECUTION, HOLD, FINISH)    │
│  - Movement Phase (SETUP, ECCENTRIC, CONCENTRIC, etc.) │
│  - Visual Focus Cue & Category (ALIGNMENT, POSTURE...) │
│  - Cadence: Tempo (3-1-1-0), Breathing, Hold Duration  │
│  - Video Clip Offsets (StartTime, EndTime seconds)     │
│  - Coach Pro-Tip & Safety Considerations               │
└───────────────────────────┬────────────────────────────┘
                            │ N : 1
                            ▼
┌────────────────────────────────────────────────────────┐
│             Media Asset (ExerciseMedia)                │
│  - High-res Demo Videos, GIF Loops, Step Posters       │
│  - Pre-signed Temporary Access URLs                    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Schema Architecture & Domain Model

### 2.1 Master Instruction (`ExerciseInstruction`)
The `ExerciseInstruction` entity represents the top-level pedagogical blueprint for an exercise:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (UUID/CUID)` | Primary key |
| `exerciseId` | `String @unique` | Foreign key referencing `Exercise` |
| `organisationId` | `String?` | Tenant ID for custom exercises |
| `title` | `String?` | Instructional headline |
| `overview` | `String?` | Executive exercise overview |
| `preparationGuide` | `String?` | Equipment station and warm-up setup |
| `startingPosition` | `String?` | Stance, grip, and joint alignment |
| `executionSummary` | `String?` | Full movement execution summary |
| `breathingSummary` | `String?` | Breathing pattern and intra-abdominal pressure guidance |
| `completionSummary` | `String?` | Movement completion and re-racking safety |
| `safetySummary` | `String?` | Safety warnings and contraindications |
| `status` | `String` | `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED` |
| `version` | `Int` | Monotonically incrementing revision number |

### 2.2 Granular Step Checkpoints (`ExerciseInstructionStep`)
Each step encapsulates a distinct phase of movement execution:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String` | Primary key |
| `exerciseId` | `String` | Backward-compatible direct exercise reference |
| `instructionId` | `String?` | Foreign key to `ExerciseInstruction` |
| `stepNumber` | `Int` | 1-based sequential ordering index |
| `stepType` | `InstructionStepType` | `PREPARATION`, `START_POSITION`, `EXECUTION`, `HOLD`, `RETURN`, `BREATHING`, `COMPLETION` |
| `movementPhase` | `InstructionMovementPhase` | `SETUP`, `START`, `ECCENTRIC`, `TRANSITION`, `CONCENTRIC`, `HOLD`, `FINISH` |
| `title` | `String` | Step title |
| `description` | `String` | Primary concise instruction |
| `detailedInstruction`| `String?` | In-depth anatomical and biomechanical walkthrough |
| `visualCue` | `String?` | Visual focal cue (e.g. "Knees tracking over second toes") |
| `visualCueCategory` | `VisualCueCategory` | `POSTURE`, `ALIGNMENT`, `BREATHING`, `TEMPO`, `RANGE_OF_MOTION`, `SAFETY`, `FOCUS` |
| `breathing` | `String?` | Step-specific breathing rhythm (e.g. "Inhale on descent") |
| `tempo` | `String?` | Cadence notation (e.g. "3-1-1-0") |
| `durationSeconds` | `Float?` | Expected step duration |
| `holdDurationSeconds`| `Float?` | Isometric hold duration at apex/bottom |
| `repetitions` | `Int?` | Repetition count for this step if partitioned |
| `trainerTip` | `String?` | Coach performance tip or cue |
| `safetyNote` | `String?` | Injury prevention note |
| `mediaId` | `String?` | Foreign key to `ExerciseMedia` |
| `videoStartTimeSeconds`| `Float?` | Sub-clip start playback offset |
| `videoEndTimeSeconds` | `Float?` | Sub-clip end playback offset |
| `status` | `String` | `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED` |

---

## 3. Visual Cues & Biomechanical Categorization

To support multi-modal learning, cues are classified into functional categories:

1. **POSTURE**: Spine neutrality, scapular retraction, pelvic positioning.
2. **ALIGNMENT**: Joint tracking (knees over toes, elbows tucked at 45 degrees).
3. **BREATHING**: Diaphragmatic inhalation, Valsalva maneuver, exhalation past sticking point.
4. **TEMPO**: Controlled eccentric cadence, pause duration, explosive concentric drive.
5. **RANGE_OF_MOTION**: Hip crease below knee joint, full lockout, chest to floor.
6. **SAFETY**: Neck alignment, avoiding lumbar rounding, bar stability.
7. **FOCUS**: Gaze angle, ground push intention, mind-muscle targeting.

---

## 4. Video Clip Offsets & Media Integration

Instead of requiring individual trimmed video files for each step, FitBeat supports **sub-second video timestamp offsets**:
* A full demonstration video (e.g. 15 seconds) can be attached to multiple steps.
* Step 1 sets `videoStartTimeSeconds: 0.0, videoEndTimeSeconds: 3.5` (Setup phase).
* Step 2 sets `videoStartTimeSeconds: 3.5, videoEndTimeSeconds: 7.0` (Descent phase).
* Step 3 sets `videoStartTimeSeconds: 7.0, videoEndTimeSeconds: 10.0` (Concentric push).
* Server enforces `videoStartTimeSeconds <= videoEndTimeSeconds` and validates asset ownership before binding.

---

## 5. Sequence Management & Atomic Reordering

Instruction steps maintain strict contiguous ordering:
1. **Reordering (`POST /exercises/:id/instruction/reorder`)**:
   * Accepts an ordered array of step UUIDs.
   * Executes in a Prisma `$transaction` using two-phase index assignment to avoid collision conflicts.
2. **Step Deletion (`DELETE /exercise-instruction-steps/:id`)**:
   * Deletes the target step.
   * Decrements `stepNumber` for all subsequent steps in the same transaction, maintaining a gapless 1, 2, 3 sequence.

---

## 6. Publication Lifecycle & Guardrails

* Status lifecycle: `DRAFT` -> `REVIEW` -> `PUBLISHED` -> `ARCHIVED`.
* Guardrail: Publishing an instruction guide with zero configured steps is rejected with `400 Bad Request`.
* Publication atomically promotes `ExerciseInstruction.status` and all associated `ExerciseInstructionStep.status` values to `PUBLISHED`.
* Draft steps remain visible to staff and trainers for verification and preview, but hidden from regular members.

---

## 7. Zero-Trust Security & Multi-Tenancy

* **System Exercises (`ownershipType: 'SYSTEM'`)**:
  * Read-accessible to all tenants.
  * Strictly immutable to tenant staff (`403 Forbidden`).
* **Tenant Exercises (`ownershipType: 'ORGANISATION'`)**:
  * Scoped to the owning organisation.
  * Cross-tenant read and write operations are strictly blocked (`403 Forbidden`).

---

## 8. Mobile Learning Experience

1. **`ExerciseStepPlayer`**:
   * Interactive segmented progress bar.
   * Embedded visual media with video timestamp pills.
   * Collapsible biomechanical deep-dive walkthrough.
   * Visual focus cue cards with category chips.
   * Rhythm & dynamics pill strip (Breathing, Tempo, Hold Duration).
   * Navigation controls with auto-progress and guide completion trigger.
2. **`ExerciseInstructionEditorModal`**:
   * Full-featured authoring studio for gym staff and personal trainers.
   * Drag/move controls to adjust step order.
   * Comprehensive step editor with visual cue categorizers and media picker.
   * "Preview as Member" toggle allowing instant verification of member UX.
