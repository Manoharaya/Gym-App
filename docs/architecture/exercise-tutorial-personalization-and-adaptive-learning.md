# FitBeat 2.0: Exercise Tutorial Personalization, Learning Difficulty Adaptation & Interactive Practice Intelligence

## 1. Executive Summary

FitBeat Day 78 advances the visual exercise education platform from static, uniform tutorials into an **adaptive educational intelligence system**. Prior iterations delivered rich movement breakdowns, guided multi-exercise sessions, and 360° multi-angle visual comparisons. Day 78 connects these components into a unified, member-centric learning loop:

$$\text{Discover} \longrightarrow \text{Learn} \longrightarrow \text{Understand} \longrightarrow \text{Practice} \longrightarrow \text{Review} \longrightarrow \text{Adapt} \longrightarrow \text{Repeat}$$

The system adapts tutorial presentation depth, instructional mode, camera demonstration angles, playback speeds, and practice checklists based on member profile, previous exercise mastery, and recent rehearsal performance.

All personalization rules are **deterministic, transparent, and educational**—deliberately avoiding black-box AI generative hallucinations, camera computer vision, or clinical/diagnostic claims.

---

## 2. System Architecture

```text
                               +----------------------------------------+
                               |        Member Learning Context         |
                               |  - Experience Level (BEGINNER..EXPERT) |
                               |  - Past Rehearsal History              |
                               |  - Knowledge Check Scores (<70% or >80%)|
                               |  - Explicit Member Overrides           |
                               +-------------------+--------------------+
                                                   |
                                                   v
                               +----------------------------------------+
                               | ExerciseLearningPersonalizationService |
                               |   (Deterministic Rule Engine)          |
                               +-------------------+--------------------+
                                                   |
             +--------------------+----------------+--------------------+--------------------+
             |                    |                                     |                    |
             v                    v                                     v                    v
    [Learning Depth]       [Tutorial Mode]                      [Multi-Angle & Speed] [Targeted Review]
      - BASIC                - PERSONALIZED (Adaptive)            - AUTO / FRONT / SIDE - Targeted Phases
      - STANDARD             - QUICK_LEARN                        - 0.75x (Beginners)   - Mistake Cues
      - DETAILED             - STEP_BY_STEP                       - 1.0x (Standard)     - Breathing Cadence
      - ADVANCED             - MOVEMENT_BREAKDOWN                 - 1.25x (Experienced) - Rehearsal Actions
                             - TECHNIQUE_CHECKLIST
```

---

## 3. Data Model & Schema Details

### `LearningPersonalizationProfile` Entity
Stored in PostgreSQL with full tenant isolation:

```prisma
model LearningPersonalizationProfile {
  id                        String   @id @default(uuid())
  userId                    String   @unique
  organisationId            String
  preferredLearningDepth    String   @default("STANDARD") // BASIC, STANDARD, DETAILED, ADVANCED
  preferredTutorialMode     String   @default("PERSONALIZED") // PERSONALIZED, QUICK_LEARN, STEP_BY_STEP, MOVEMENT_BREAKDOWN, TECHNIQUE_CHECKLIST
  preferredMediaType        String   @default("VIDEO")
  preferredViewAngle        String   @default("AUTO")     // AUTO, FRONT, SIDE, REAR, THREE_QUARTER, CLOSE_UP
  autoAdvancePreference     Boolean  @default(false)
  showDetailedInstructions  Boolean  @default(true)
  showAnatomyDetails        Boolean  @default(true)
  showTechniqueDetails      Boolean  @default(true)
  practicePreference        String   @default("STANDARD") // STANDARD, EXTENDED, FOCUSED_CUES
  knowledgeCheckPreference  Boolean  @default(true)
  playbackSpeed             Float    @default(1.0)
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  user                      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([organisationId])
  @@index([userId, organisationId])
}
```

---

## 4. Deterministic Personalization Rule Matrix

| Member Context | Exercise Difficulty | Resulting Depth | Resulting Mode | Speed | Multi-Angle Focus | Targeted Review? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Beginner** Lifter | Advanced / Expert | `BASIC` | `STEP_BY_STEP` | `0.75x` | `FRONT` or `SIDE` | No |
| First-time viewer | Any | `BASIC` | `STEP_BY_STEP` | `0.75x` | `AUTO` | No |
| Intermediate / General | Intermediate | `STANDARD` | `STEP_BY_STEP` | `1.0x` | `AUTO` | No |
| Knowledge Check $< 70\%$ | Any | `DETAILED` | `MOVEMENT_BREAKDOWN` | `0.75x` | Critical Phase Angle | **Yes** (`true`) |
| Knowledge Check $\ge 80\%$ (Mastered) | Any | `ADVANCED` | `TECHNIQUE_CHECKLIST` | `1.0x` - `1.25x` | Multi-Angle / Nuance | No |
| Explicit User Override | Any | *User Choice* | *User Choice* | *User Choice* | *User Choice* | Dynamic flag preserved |

---

## 5. Non-Diagnostic Boundary & Ethical Safety Commitments

1. **Educational Scaffolding Only**:
   - The platform strictly personalizes the **learning experience** (presentation depth, video speed, instructional focus).
   - Zero medical or therapeutic advice is given; cues are standard exercise biomechanics (e.g., "Drive knees out", "Brace core").
2. **No Camera Computer Vision or Pose Estimation**:
   - No automated movement scoring or webcam/smartphone video tracking is performed.
   - Self-audit checklists allow members to intentionally reflect on their own form.
3. **Strict Workout Log Isolation**:
   - Rehearsing an exercise tutorial or reviewing movement phases records educational telemetry (`TutorialUserProgress`, `LearningPersonalizationProfile`).
   - It **never** creates physical workout records in `Workout` or `WorkoutExercise` tables.
4. **Member Sovereignty & Transparent Override**:
   - The member can override any adaptive recommendation instantly.
   - The "Reset to Recommended" feature restores default adaptive behavior at any time.

---

## 6. Mobile Experience & Component Hierarchy

- **`PersonalizedLearningBanner`**:
  - Mounted atop `InteractiveExerciseTutorial` and `ExerciseDetailScreen`.
  - Explains why the specific depth/mode was recommended (e.g., *"Tailored for your profile: First time viewing this Advanced exercise. Starting with step-by-step foundation at 0.75x speed."*).
  - Quick action to open `PersonalizeLearningModal` or trigger `TargetedReviewPanel`.
- **`PersonalizeLearningModal`**:
  - Full bottom-sheet modal allowing members to configure depth, mode, camera angle, speed, and content toggles (anatomy, cues, auto-advance).
- **`TargetedReviewPanel`**:
  - Dedicated interactive review card highlighting vulnerable phases, mistakes to avoid with severity badges, and breathing cadence.
- **`LearningProgressScreen`**:
  - Highlights a **Technique Review Recommended** section for exercises with previous knowledge check scores $< 70\%$ or flagged rehearsal needs.

---

## 7. API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/exercises/:id/personalized-tutorial` | Assembles tutorial payload, personalized plan, and learning context. |
| `GET` | `/exercises/:id/targeted-review` | Returns targeted phase checkpoints, common mistakes to avoid, and breathing guidance. |
| `GET` | `/exercises/:id/learning-context` | Returns member progress, past scores, and rehearsal history for this exercise. |
| `GET` | `/learning/preferences` | Fetches member's saved learning personalization profile (or defaults). |
| `PATCH` | `/learning/preferences` | Updates member's learning preferences and emits audit event. |
| `POST` | `/learning/preferences/reset` | Resets preferences to adaptive defaults without affecting workout history. |
| `GET` | `/learning/recommendations` | Aggregates continue learning, review recommended, and recently mastered movements. |
