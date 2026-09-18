# FitBeat Architecture: Visual Movement Coach Foundation & Structured Movement Feedback

## 1. Executive Summary & Paradigm Shift

Day 81 transforms FitBeat's exercise learning and tutorial system from a passive demonstration paradigm into a structured, expectations-driven architecture:

```
From: "Here is how the exercise should be performed."
To:   "Here is the expected movement structure, what to focus on, and how FitBeat can eventually compare observed movement against that structure."
```

Day 81 delivers an **architectural and structured-feedback foundation**. It normalizes expected human movement mechanics into discrete, verifiable checkpoints across each phase of an exercise, constructs an authoring and rule foundation for movement deviations, and exposes future provider interfaces for camera input and pose comparison—**without** running camera models, computer vision dependencies, automatic rep counting, or clinical form scoring today.

---

## 2. End-to-End Conceptual Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Exercise Definition                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Expected Movement Structure              │
│    (Body Position, Movement Pattern, Tempo, ROM)       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Movement Sequence & Phases                 │
│    (Setup → Descent → Bottom → Ascent → Lockout)       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Technique Expectations                 │
│      (Essential, Important, Optional by Region)        │
└─────────────┬──────────────────────────────┬───────────┘
              │                              │
              ▼                              ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│        Visual Cues        │  │   Technique Checklist   │
│ (Media Spatial/Time Cues) │  │  (Rehearsal Checkpoints)│
└─────────────┬─────────────┘  └─────────────┬───────────┘
              │                              │
              └──────────────┬───────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│              Movement Feedback Rules                   │
│ (Alignment, ROM, Tempo, Stability Condition Envelopes) │
└────────────────────────────┬───────────────────────────┘
                             │
       ==============================================
         FUTURE VISION INTEGRATION BOUNDARY (Day 81+)
       ==============================================
                             │
                             ▼
                 [ Future Camera Capture ]
                             │
                             ▼
                 [ Future Pose Analysis ]
                             │
                             ▼
            [ Future Expected vs Observed Engine ]
                             │
                             ▼
                 [ Future Member Guidance ]
```

---

## 3. Normalized Database Models & Taxonomies

### 3.1 `MovementExpectation` Model
Normalized entity representing an authored technique requirement linked to an `Exercise` and optionally a specific `ExerciseMovementPhase`, `ExerciseMediaAnnotation` (visual cue), or `ExerciseCommonMistake`:

```prisma
model MovementExpectation {
  id                    String                    @id @default(cuid())
  organisationId        String?
  exerciseId            String
  movementPhaseId       String?
  title                 String
  description           String
  expectationType       String                    @default("POSTURE")
  priority              String                    @default("ESSENTIAL") // ESSENTIAL, IMPORTANT, OPTIONAL
  bodyRegion            String                    @default("FULL_BODY")
  expectedState         String?
  expectedDirection     String?
  expectedPosition      String?
  expectedAlignment     String?
  expectedRangeOfMotion String?
  expectedTempo         String?
  expectedBreathing     String?
  visualCueId           String?
  safetyNote            String?
  commonMistakeId       String?
  sortOrder             Int                       @default(0)
  status                String                    @default("PUBLISHED")
  version               Int                       @default(1)
  createdByUserId       String?
  updatedByUserId       String?
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @default(now()) @updatedAt

  exercise              Exercise                  @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  movementPhase         ExerciseMovementPhase?    @relation(fields: [movementPhaseId], references: [id], onDelete: SetNull)
  visualCue             ExerciseMediaAnnotation?  @relation(fields: [visualCueId], references: [id], onDelete: SetNull)
  commonMistake         ExerciseCommonMistake?    @relation(fields: [commonMistakeId], references: [id], onDelete: SetNull)
  feedbackRules         MovementFeedbackRule[]
}
```

#### Taxonomy Standards:
* **`expectationType`**: `POSTURE`, `ALIGNMENT`, `BODY_POSITION`, `MOVEMENT_DIRECTION`, `RANGE_OF_MOTION`, `TEMPO`, `BREATHING`, `STABILITY`, `CONTROL`, `BALANCE`, `FOOT_POSITION`, `HAND_POSITION`, `SPINE_POSITION`, `HEAD_POSITION`, `JOINT_POSITION`, `EQUIPMENT_POSITION`, `SAFETY`, `FOCUS`.
* **`priority`**:
  * `ESSENTIAL`: Critical baseline expectations (e.g. spine neutrality, knee tracking).
  * `IMPORTANT`: Fundamental movement guidance (e.g. tempo, breathing synchronization).
  * `OPTIONAL`: Advanced technique refinements (e.g. foot pressure distribution).
* **`bodyRegion`**: `HEAD`, `NECK`, `SHOULDERS`, `CHEST`, `UPPER_BACK`, `SPINE`, `CORE`, `HIPS`, `GLUTES`, `KNEES`, `ANKLES`, `FEET`, `ELBOWS`, `WRISTS`, `HANDS`, `FULL_BODY`.

### 3.2 `MovementFeedbackRule` Model
Stores conditional feedback triggers for future pose analysis without hardcoding comparison logic:

```prisma
model MovementFeedbackRule {
  id                    String                    @id @default(cuid())
  organisationId        String?
  exerciseId            String
  movementPhaseId       String?
  expectationId         String?
  conditionType         String                    @default("POSITION_DEVIATION")
  conditionParameters   Json?                     // Envelope: { threshold, joint, tolerance, axis }
  feedbackType          String                    @default("GUIDANCE")
  feedbackMessage       String
  severity              String                    @default("MODERATE") // LOW, MODERATE, HIGH
  priority              String                    @default("IMPORTANT")
  status                String                    @default("PUBLISHED")
  createdByUserId       String?
  updatedByUserId       String?
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @default(now()) @updatedAt

  exercise              Exercise                  @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  movementPhase         ExerciseMovementPhase?    @relation(fields: [movementPhaseId], references: [id], onDelete: SetNull)
  expectation           MovementExpectation?      @relation(fields: [expectationId], references: [id], onDelete: SetNull)
}
```

* **`conditionType`**: `PHASE_MISMATCH`, `POSITION_DEVIATION`, `ALIGNMENT_DEVIATION`, `ROM_DEVIATION`, `TEMPO_DEVIATION`, `STABILITY_DEVIATION`, `BREATHING_MISMATCH`, `MOVEMENT_DIRECTION`.
* **`feedbackType`**: `POSITIVE`, `GUIDANCE`, `REMINDER`, `CAUTION`, `REVIEW` (educational, non-diagnostic).

---

## 4. Future Computer Vision & Pose Provider Contracts

FitBeat defines clean provider abstractions in `services/api/src/exercises/contracts/movement-coach-contracts.ts`:

1. **`ExpectedMovementState`**:
   The standard comparison target assembled from authored expectations, phases, range of motion, and breathing patterns.
2. **`MovementObservationProvider`**:
   Contract for future streaming camera/sensor hardware:
   ```typescript
   export interface MovementObservationProvider {
     readonly providerId: string;
     readonly isAvailable: boolean;
     startStream(): Promise<boolean>;
     stopStream(): Promise<void>;
     getCurrentObservation(): Promise<ObservedMovementState | null>;
   }
   ```
3. **`PoseAnalysisProvider`**:
   Contract enabling on-device or cloud pose estimation modules (e.g. MediaPipe, Apple Vision, custom models):
   ```typescript
   export interface PoseAnalysisProvider {
     readonly providerName: string;
     analyzeFrame(frameData: unknown): Promise<ObservedMovementState>;
     detectLandmarks?(frameData: unknown): Promise<NormalizedLandmark[]>;
     estimateMovementPhase?(landmarks: NormalizedLandmark[]): Promise<string | null>;
   }
   ```
4. **`MovementComparisonService`**:
   Contract consuming `ExpectedMovementState` and `ObservedMovementState` to evaluate deviations and return feedback rules.

---

## 5. High-Performance Consolidated Read Model

`GET /exercises/:id/movement-coach` executes a single optimized aggregation returning:
* Exercise summary & primary media presigned URLs.
* Sequential movement phases with phase-specific expectations, visual cues, and common mistakes.
* Prioritized "What to Focus On" hierarchy (`essential`, `important`, `optional`).
* Baseline synthesized expectations if no custom ones are authored (guaranteeing continuous guidance for all exercises).
* Interactive `TechniqueChecklist` categorized by phase and discipline (`SETUP`, `ALIGNMENT`, `EXECUTION`, `BREATHING`, `TEMPO`, `SAFETY`).
* Member learning mastery level and completion status.

---

## 6. Member Mobile Experience

The mobile experience integrates seamlessly with FitBeat's design system:
* **`WhatToFocusOnCard`**: Tabbed priority browser with body region badges and direct links to visual cue annotations.
* **`MovementPhaseCoachCard`**: Horizontal phase timeline scrubber updating media, phase cue banners, tempo/breath metrics, and phase-level expectations.
* **`VisualMovementCoach`**: Flagship component coordinating media demonstration, phase timeline, focus hierarchy, interactive checklist, and common mistake callouts.
* **`VisualMovementCoachScreen`**: Dedicated navigation destination linked directly from `ExerciseDetailScreen` and tutorial mode.

---

## 7. Strict Non-Diagnostic & Physical Workout Boundaries

1. **Educational Only**: Checklist interactions and movement expectations are mental rehearsal tools. They NEVER mutate physical workout execution tables (`Workout`, `WorkoutExercise`).
2. **Non-Diagnostic Guarantee**: No clinical, orthopedic, or automated injury diagnosis is provided. All advice is authored educational technique guidance.
3. **Multi-Tenant Isolation**: Unpublished draft expectations or feedback rules authored by Tenant B are strictly invisible to Tenant A members.
