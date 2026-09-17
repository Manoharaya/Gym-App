# Interactive Exercise Tutorials, Interactive Demonstrations & Technique Coaching Architecture

## 1. Executive Summary & Pedagogical Pipeline

FitBeat Day 75 transforms the modular exercise learning assets developed across Days 61–74 into an integrated, interactive tutorial experience:

```text
Exercise
   ↓
Visual Demonstration (4K Video / High-Res Loop / Fallback Posture)
   ↓
Setup & Biomechanical Alignment (Tripod Foot, Pelvic Neutral, Rigid Grip)
   ↓
Movement Phases (Setup → Eccentric → Bottom Transition → Concentric → Lockout)
   ↓
Step-by-Step Technique Coaching (Preparation, Execution, Return, Reset)
   ↓
Categorized Visual Cues (Posture, Alignment, Breathing, Tempo, Safety)
   ↓
Synchronized Breathing & Tempo Cadence (Valsalva, Exhale on Exertion, 3-1-1-0 Tempo)
   ↓
Common Mistakes & Mechanical Fault Corrections (Severity, Cause, Actionable Cue)
   ↓
Safety Guidance & Non-Diagnostic Precautions (Contraindications, Range Limits)
   ↓
Interactive Practice Mode (Self-Directed Rehearsal Protocol & Checklists)
   ↓
Knowledge Check Assessment Integration (Day 72 Assessment Engine)
   ↓
Progress Tracking & Mastery Checkpointing (ExerciseLearningProgress Synchronization)
```

---

## 2. System Architecture & Component Hierarchy

### Mobile Client Component Tree (`apps/mobile/src/features/exercises/`)

```text
ExerciseTutorialScreen (/exercises/:id/tutorial)
 └── InteractiveExerciseTutorial (Master Orchestrator)
      ├── ModeSelectorTab (QUICK_LEARN | STEP_BY_STEP | MOVEMENT_BREAKDOWN | TECHNIQUE_CHECKLIST)
      ├── ProgressStepperBar (WATCH → LEARN → PRACTICE → CHECK → COMPLETE)
      ├── InteractiveVisualPlayer
      │    ├── Video / Image Surface with Aspect Ratio Preservation
      │    ├── Time Scrubbing & Phase Timestamp Markers
      │    ├── Playback Speed Controller (0.5x, 0.75x, 1.0x, 1.5x, 2.0x)
      │    ├── Phase Loop Controls
      │    └── Collapsible Audio Coach (Voice Transcript & Audio Guidance URL)
      ├── TechniqueCoachingPanel
      │    ├── Setup Checklist & Equipment Preparation
      │    ├── Body Position & Joint Alignments (Feet, Grip, Spine, Head)
      │    ├── Kinematic Movement Cues (Bar Path, Trajectory, Degrees of Freedom)
      │    ├── Breathing Pattern Guidance (Inhale Descent, Valsalva, Exhale Effort)
      │    └── Tempo Breakdown (Eccentric, Bottom Hold, Concentric, Top Hold)
      ├── VisualCuesBanner (Categorized Pill Tags: POSTURE, ALIGNMENT, BREATHING, TEMPO)
      ├── TechniqueChecklistCard (Interactive Self-Check State & Progress Percent)
      ├── PracticeModeCard (Non-Diagnostic Rehearsal Protocol, Reps, Checklist Self-Check)
      ├── CommonMistakesSection (Fault Name, Severity Badges, Mechanical Cause, Fix)
      ├── SafetyGuidanceSection (Contraindications, Range Limits, Non-Diagnostic Disclaimer)
      ├── WhyThisExerciseWorksSection (Mechanics Overview, Prime Drivers, Athletic Benefits)
      ├── KnowledgeCheckLaunchCard (Direct Navigation to Day 72 Assessment)
      └── TutorialCompletionCard (Mastery Summary, Badges, Study Time, Next Recommendations)
```

---

## 3. Data Model & Additive Schema Design

The Day 75 architecture is strictly additive, introducing zero table drops, column renames, or destructive migrations:

### Prisma Extensions (`services/api/prisma/schema.prisma`)

```prisma
model Exercise {
  // ... existing fields (id, name, slug, movementPattern, difficulty, equipment, tempo, etc.)
  
  /// Day 75: Gym-specific or platform tutorial configuration
  tutorialConfig  Json? // { defaultMode, estimatedMinutes, audioGuidanceUrl, audioGuidanceTranscript, keyTechniquePoints[], checklist[] }
}

model ExerciseLearningProgress {
  // ... existing fields (userId, exerciseId, organisationId, status, completedSteps, totalSteps, etc.)
  
  /// Day 75: Granular tutorial state checkpointing
  tutorialProgress Json? // { currentMode, currentPhaseIndex, currentStepIndex, completedSections[], checklistState, practiceCompleted, practiceCompletedAt, timeSpentSeconds, knowledgeCheckCompleted, knowledgeCheckScore }
}
```

---

## 4. Learning Modes & State Machine

Members and trainers can switch between 4 learning modes dynamically:

| Learning Mode | Target Learner & Intent | Time Investment | Active Visual & Coaching Focus |
|---|---|---|---|
| `QUICK_LEARN` | Experienced lifter needing a 60s technical refresh before an intense working set. | 1–2 minutes | Continuous video loop, 3 primary coaching cues, tempo notation, critical safety warning. |
| `STEP_BY_STEP` | Learner mastering full setup and execution progression. | 4–6 minutes | Linear sequence through Setup, Unrack, Descent, Drive, and Reset with step-by-step cue cards. |
| `MOVEMENT_BREAKDOWN` | Technique enthusiast or trainer studying kinesiology. | 5–8 minutes | Phase-by-phase scrubber (`SETUP` $\to$ `ECCENTRIC` $\to$ `TRANSITION` $\to$ `CONCENTRIC` $\to$ `LOCKOUT`) synchronized with player timestamps and joint angle guidance. |
| `TECHNIQUE_CHECKLIST` | Practical lifter performing warm-up rehearsal. | 2–3 minutes | Interactive checklist items to verify foot stance, glute engagement, bar path, and breathing. |

---

## 5. Non-Diagnostic Practice Mode & Safety Boundaries

### Non-Diagnostic Boundary
- FitBeat provides **educational technique coaching** and self-reflection protocols.
- It does **not** provide medical diagnoses, physical therapy prescriptions, or clinical treatments.
- A mandatory non-diagnostic disclaimer is rendered on every tutorial screen:
  > *"Educational guidance only. Not intended as medical diagnosis, rehabilitation prescription, or clinical treatment. If you experience pain, numbness, or joint discomfort, cease the movement immediately and consult a qualified medical professional."*

### No Camera-Based AI Computer Vision
- In strict adherence to project constraints, **no computer vision, pose estimation, or camera streaming** is utilized.
- Practice mode utilizes a disciplined, self-administered rehearsal checklist (e.g. 5 empty-bar or bodyweight repetitions, pausing at critical transitions).

---

## 6. REST API Reference

| Method | Route | Permission / Role | Description |
|---|---|---|---|
| `GET` | `/exercises/:id/tutorial` | `exercises:read` | Single-roundtrip aggregated tutorial payload (exercise, media, phases, steps, coaching, mistakes, safety, muscles, equipment, why-it-works, knowledge check, user progress). |
| `GET` | `/exercises/:id/tutorial/progress` | `exercises:read` | Retrieve member's saved tutorial progress and resume state. |
| `POST` | `/exercises/:id/tutorial/start` | `exercises:read` | Initialize or resume a tutorial session; marks `OVERVIEW` complete and sets status to `IN_PROGRESS`. |
| `POST` | `/exercises/:id/tutorial/progress` | `exercises:read` | Incremental checkpoint (active phase, step, checklist toggles, practice status, study duration). |
| `POST` | `/exercises/:id/tutorial/complete` | `exercises:read` | Mark tutorial completed, record knowledge check score, and award mastery achievement. |
| `GET` | `/exercises/:id/tutorial/related` | `exercises:read` | Deterministic recommendations for post-tutorial study based on movement pattern and prime muscles. |
| `PATCH` | `/exercises/:id/tutorial` | `exercises:update` (Trainer/Admin) | Author gym-customized tutorial config (checklist items, key technique points, audio guidance transcript). Audited via `AuditService`. |

---

## 7. Multi-Tenant Isolation & IDOR Protection

1. **Tenant Boundary Enforcement**: Gym members and trainers can only read exercises belonging to their active tenant (`organisationId`) or platform-wide `SYSTEM` exercises.
2. **System Exercise Immutability**: Staff trainers can only modify tutorial configurations for their own gym's custom exercises. Platform `SYSTEM` exercises are immutable to gym staff; modifications require `SUPERADMIN` authority.
3. **Cross-Tenant Attack Resistance**: Requests referencing exercises belonging to another gym return a `404 Not Found` to prevent tenancy enumeration.
4. **Decoupling from Workout Logging**: Educational tutorial completion strictly updates `ExerciseLearningProgress`. It does not create phantom entries in `Workout` or `WorkoutExercise` tables.

---

## 8. Verification & Test Coverage Matrix

| Test Suite | File | Tests Passing | Key Verification Vectors |
|---|---|:---:|---|
| **Day 75 Tutorials E2E** | `services/api/test/exercise-tutorials.e2e-spec.ts` | **11 / 11** | Aggregation query, media fallback, start $\to$ checkpoint $\to$ complete cycle, practice mode, trainer authoring, RBAC, IDOR. |
| **Day 74 Anatomy E2E** | `services/api/test/exercise-anatomy-mechanics.e2e-spec.ts` | **12 / 12** | Tri-level muscle roles, movement taxonomy, "Why This Exercise Works", authoring. |
| **Day 73 Academy E2E** | `services/api/test/fitness-education-academy.e2e-spec.ts` | **14 / 14** | Curricula, enrollments, lesson progression, certificate generation. |
| **Day 72 Knowledge Checks** | `services/api/test/knowledge-check-assessments.e2e-spec.ts` | **17 / 17** | Assessment authoring, randomized delivery, scoring, passing criteria. |
| **Day 71 Dashboard E2E** | `services/api/test/learning-dashboard-progress.e2e-spec.ts` | **11 / 11** | Learning streaks, mastery calculation, skill trees, recommendations. |
| **Day 70 Collections E2E** | `services/api/test/exercise-collections-learning-paths.e2e-spec.ts` | **13 / 13** | Collections, learning paths, prerequisites, milestone progression. |
| **Total Regression Suite** | Ran with `--runInBand` | **78 / 78** | **100% Pass Rate across all learning modules.** |
| **Mobile Compilation** | `apps/mobile/` (`tsc --noEmit`) | **0 Errors in `src/features/exercises`** | Type-safe UI components, props, navigation, and service client. |
