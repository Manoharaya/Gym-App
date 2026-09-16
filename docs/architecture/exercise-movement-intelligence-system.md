# FitBeat Exercise Movement Steps, Phases & Movement Intelligence Architecture

## 1. Executive Summary

The FitBeat Movement Steps & Phases Intelligence Layer transforms exercises from static descriptions and isolated step texts into **structured, machine-readable biomechanical movement lifecycles**.

Every exercise in FitBeat is understood through a precise hierarchy:
`Exercise` → `Movement Blueprint` → `Movement Phases` → `Instruction Steps` → `Joint Alignments` → `Breathing Cadence` → `Tempo Blueprints` → `Sub-Second Looping Media`.

This establishes the foundational intelligence required for future AI exercise coaching, automated form analysis, computer vision joint tracking, and rep detection (Day 69+) while remaining 100% backward compatible with existing exercise and workout execution systems.

```text
FITBEAT MOVEMENT INTELLIGENCE LAYER
┌────────────────────────────────────────────────────────────────────────┐
│                        Exercise (Exercise Model)                       │
│  - Primary Movement Pattern (SQUAT, HINGE, PUSH, PULL, LUNGE, etc.)   │
│  - Secondary Movement Patterns (e.g. HINGE, ROTATION)                 │
│  - Repetition Type (REPETITION, ISOMETRIC_HOLD, INTERVAL, etc.)       │
│  - Tempo Blueprint (e.g. 3-1-1-0s)                                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1 : N
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Movement Phases (ExerciseMovementPhase Model)              │
│  - Phase Name (SETUP, DESCENT, BOTTOM, ASCENT, LOCKOUT)               │
│  - Phase Type (SETUP, START_POSITION, ECCENTRIC, TRANSITION_BOTTOM...) │
│  - Order Index & Real-time Cue Text ("Hips back, shins vertical")      │
│  - Body Position (STANDING, SQUATTING) & Orientation (UPRIGHT)         │
│  - Range of Motion Type (FULL, PARALLEL) & Notes                       │
│  - Breathing Pattern (INHALE_DESCENT, EXHALE_EFFORT, VALSALVA)        │
│  - Tempo & Hold Duration (Active: 3.5s, Hold: 1.0s)                   │
│  - Sub-Second Video Loop Offsets (Start: 1.25s, End: 4.75s)            │
└───────────────┬───────────────────────────────┬────────────────────────┘
                │ 1 : N                         │ 1 : N
                ▼                               ▼
┌───────────────────────────────┐ ┌──────────────────────────────────────┐
│  Instruction Steps (Linked)   │ │  Joint Alignments & Biomechanics     │
│  - Step Number & Title        │ │  - Region (KNEES, HIPS, SPINE, etc.) │
│  - Execution Details          │ │  - Status (OPTIMAL, FAULT, ACCEPT)   │
│  - Phase Reference (phaseId)  │ │  - Biomechanical Angle & Target Cue │
└───────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 2. Domain Entities & Schema Extensions

### 2.1 Top-Level Movement Extensions (`Exercise`)
The core `Exercise` model is extended with three machine-readable movement attributes:

| Field | Type | Description |
| :--- | :--- | :--- |
| `secondaryMovementPatterns` | `Json? (string[])` | Complementary patterns (e.g. `['HINGE', 'ROTATION']`) |
| `repetitionType` | `String? @default("REPETITION")` | `REPETITION`, `ISOMETRIC_HOLD`, `DISTANCE_INTERVAL`, `TIME_INTERVAL`, `COMPLEX` |
| `tempoStructure` | `Json?` | Object `{ eccentricSeconds, bottomHoldSeconds, concentricSeconds, topHoldSeconds, notes }` |

### 2.2 Movement Phases (`ExerciseMovementPhase`)
Extended with full backward compatibility:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (UUID/CUID)` | Primary key |
| `exerciseId` | `String` | Foreign key referencing `Exercise` |
| `phaseName` | `String` | Seeded identifier (`SETUP`, `DESCENT`, `BOTTOM`, `ASCENT`, `LOCKOUT`) |
| `phaseType` | `String @default("ECCENTRIC")` | Standard taxonomy: `SETUP`, `START_POSITION`, `ECCENTRIC`, `TRANSITION_BOTTOM`, `ISOMETRIC_HOLD`, `CONCENTRIC`, `TRANSITION_TOP`, `LOCKOUT_FINISH`, `RESET_RETURN` |
| `title` | `String?` | Human-readable phase title |
| `description` | `String?` | Biomechanical objective |
| `orderIndex` | `Int @default(0)` | Sequence position |
| `cueText` | `String?` | Real-time verbal coaching cue |
| `timestampMs` | `Int?` | Millisecond offset in demonstration video |
| `keyCheckpoints` | `Json? (string[])` | Checklist points required for valid form |
| `bodyPosition` | `String?` | `STANDING`, `SQUATTING`, `HINGED`, `SUPINE`, `PRONE`, `KNEELING`, etc. |
| `bodyOrientation` | `String?` | `UPRIGHT`, `HORIZONTAL`, `INCLINED`, `DECLINED`, `SIDEWAYS` |
| `jointAlignments` | `Json?` | Array of `JointAlignmentGuidance` objects |
| `rangeOfMotionType` | `String?` | `FULL`, `PARTIAL`, `DEEP`, `PARALLEL`, `TERMINAL`, `ISOMETRIC` |
| `rangeOfMotionNotes`| `String?` | Qualitative ROM guidance |
| `breathingPattern` | `String?` | `INHALE_DESCENT`, `EXHALE_EFFORT`, `HOLD_VALSALVA`, `CONTINUOUS_RHYTHMIC`, `EXHALE_RECOVERY` |
| `breathingNotes` | `String?` | Intra-abdominal pressure and diaphragmatic guidance |
| `tempoSeconds` | `Float?` | Active phase target duration (e.g. 3.0s) |
| `holdDurationSeconds` | `Float?` | Inflection/pause duration (e.g. 1.0s) |
| `visualCues` | `Json?` | Array of `{ text, category, emphasis }` |
| `commonMistakes` | `Json?` | Array of `{ mistake, consequence, correction, severity }` |
| `safetyNotes` | `String?` | Contraindication warnings |
| `mediaId` | `String?` | Foreign key referencing `ExerciseMedia` |
| `videoStartTimeSeconds` | `Float?` | Sub-second video loop start offset |
| `videoEndTimeSeconds` | `Float?` | Sub-second video loop end offset |
| `status` | `String @default("PUBLISHED")` | `DRAFT`, `REVIEW`, `APPROVED`, `PUBLISHED`, `ARCHIVED` |

---

## 3. Biomechanical Taxonomies

### 3.1 Movement Phase Types
- `SETUP`: Equipment adjustment, grip placement, foot spacing, bracing.
- `START_POSITION`: Initial unrack, stance stabilization, tension check.
- `ECCENTRIC`: Lengthening phase under muscular load (lowering).
- `TRANSITION_BOTTOM`: Inflection point or stretch pause at deepest point.
- `ISOMETRIC_HOLD`: Static contraction against immovable resistance or posture hold.
- `CONCENTRIC`: Shortening phase under muscular load (lifting/driving).
- `TRANSITION_TOP`: Reaching lockout or peak contraction.
- `LOCKOUT_FINISH`: Final stabilization, joint extension, recovery breath.
- `RESET_RETURN`: Rerack, descent to floor, or rep-cycle reset.

### 3.2 Joint Alignment Specification
Each joint guidance record encapsulates:
```typescript
interface JointAlignmentGuidance {
  joint: 'ANKLES' | 'KNEES' | 'HIPS' | 'LUMBAR_SPINE' | 'THORACIC_SPINE' | 'SCAPULAE' | 'SHOULDERS' | 'ELBOWS' | 'WRISTS' | 'CORE_PELVIS';
  alignment: string; // e.g. "Track inline with second toe, prevent valgus collapse"
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'FAULT';
  cue?: string; // e.g. "Spread the floor"
  angleDegrees?: number; // e.g. 90
}
```

---

## 4. API & Controller Endpoints

All endpoints are hosted under `services/api/src/exercises/controllers/exercise-movement.controller.ts`:

| Method | Route | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/exercises/:id/movement` | `exercises:read` | Returns full movement structure, enriched phases, and machine-readable AI intelligence |
| `PUT` | `/exercises/:id/movement` | `exercises:update` | Updates exercise secondary patterns, repetition type, and tempo structure |
| `POST`| `/exercises/:id/movement/publish` | `exercises:update` | Atomically marks all movement phases as `PUBLISHED` |
| `GET` | `/exercises/:id/movement/phases` | `exercises:read` | Retrieves ordered list of movement phases |
| `POST`| `/exercises/:id/movement/phases` | `exercises:update` | Authors a new movement phase |
| `POST`| `/exercises/:id/movement/phases/reorder` | `exercises:update` | Reorders phases transactionally |
| `GET` | `/exercises/:id/movement/phases/:phaseId` | `exercises:read` | Gets specific phase details with checkpoints & alignments |
| `PUT` | `/exercises/:id/movement/phases/:phaseId` | `exercises:update` | Updates phase parameters |
| `DELETE`| `/exercises/:id/movement/phases/:phaseId`| `exercises:update` | Safely unlinks steps and deletes the phase |
| `POST`| `/exercises/:id/movement/phases/:phaseId/media` | `exercises:update` | Attaches media with sub-second loop offsets |
| `POST`| `/exercises/:id/movement/phases/:phaseId/steps` | `exercises:update` | Links instruction steps to this movement phase |

---

## 5. Mobile User Experience

1. **`ExerciseMovementTimeline`**:
   - Horizontal phase lifecycle stepper highlighting current active phase.
   - Active phase deep dive with verbal cue callouts, tempo metrics, and breathing guidance.
   - Joint alignment matrix cards with color-coded status badges (`OPTIMAL`, `ACCEPTABLE`, `FAULT`).
   - Sub-second video loop playback badges (`Loop: 1.25s – 4.75s`).
   - Navigation buttons (`Previous Phase`, `Next Phase`) and trainer edit launcher.

2. **`ExerciseMovementBuilderModal`**:
   - Comprehensive phase authoring studio for trainers and coaches.
   - Interactive phase type, body position, body orientation, ROM, and breathing selectors.
   - Real-time joint alignment builder with dynamic joint picker and angle input.
   - Checkpoint list builder with inline addition and deletion.
   - Real-time validation and safe deletions.

3. **`ExerciseDetailScreen` Integration**:
   - Dedicated `Movement` tab positioned next to `Overview` and `How-To Steps`.
   - Overview tab features an interactive "Movement Lifecycle & Biomechanics" summary card with a 1-tap "Deep Dive" trigger.
   - Seamless switching between instruction steps and movement phases.

---

## 6. Multi-Tenant Isolation & Zero-Trust Security

- **System Exercise Immutability**: `SYSTEM` exercises are immutable to tenant staff (`403 SYSTEM_EXERCISE_IMMUTABLE`). Only platform superadmins may modify system movement phases.
- **Tenant Isolation**: Tenant A staff cannot read or modify Tenant B custom exercise movement phases (`403 CROSS_TENANT_ACCESS_DENIED`).
- **Media Ownership Validation**: Attaching media to a movement phase strictly verifies that the media asset belongs to the same exercise.
- **Audit Logging**: Every creation, modification, reordering, media attachment, step link, and deletion emits an audit log event through `AuditService.log(...)`.
