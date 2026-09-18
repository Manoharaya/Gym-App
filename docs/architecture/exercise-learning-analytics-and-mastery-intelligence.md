# FitBeat 2.0: Exercise Learning Analytics, Skill Progression & Member Mastery Intelligence

## 1. Executive Summary

FitBeat Day 79 establishes a structured **Exercise Learning Analytics & Member Mastery Intelligence layer** across the entire exercise education system.

Following Days 61–78 (Exercise Library, Movement Phases, Visual Media, Knowledge Checks, Interactive Tutorials, Guided Exercise Sessions, and Learning Personalization), Day 79 implements a deterministic, unified tracking and telemetry pipeline answering:
- **What has the member learned?**
- **Which movement checkpoints have they completed?**
- **What concepts or techniques do they need to review?**
- **Which educational requirements have achieved validated Mastery?**
- **Where are learners dropping off in the instructional curriculum?**

The core learning loop realized in Day 79 is:

$$\text{Discover} \longrightarrow \text{Learn} \longrightarrow \text{Practice} \longrightarrow \text{Check} \longrightarrow \text{Review} \longrightarrow \text{Improve Understanding} \longrightarrow \text{Master} \longrightarrow \text{Continue}$$

---

## 2. System Architecture

```text
       +-------------------------------------------------------------+
       |                  Member Educational Activity                |
       |  (Tutorials, Multi-Angle Views, Checklists, Knowledge Checks)|
       +------------------------------+------------------------------+
                                      | Real-Time Telemetry Event
                                      v
       +-------------------------------------------------------------+
       |                  POST /learning/events                      |
       |           (ExerciseLearningMasteryService)                  |
       +------------------------------+------------------------------+
                                      | Ingest & State Transition
             +------------------------+------------------------+
             |                                                 |
             v                                                 v
+-----------------------------+               +---------------------------------+
|   LearningActivityEvent     |               |        LearningMastery          |
|  - eventType                |               |  - status (NOT_STARTED..MASTERED)|
|  - contentType & contentId  |               |  - completionPercent (0..100)   |
|  - sectionId / sessionId    |               |  - sectionsCompleted (Array)    |
|  - metadata & occurredAt    |               |  - knowledgeCheckScore          |
+-----------------------------+               |  - reviewRecommendedAt & reason |
                                              +----------------+----------------+
                                                               |
             +-------------------------------------------------+-----------------------------------+
             |                                                 |                                   |
             v                                                 v                                   v
+-----------------------------+               +---------------------------------+ +-------------------------------+
|    Member Mastery Summary   |               |     Targeted Review Queue       | |    Content Drop-off Funnel    |
|  - totalLearned             |               |  - exercises with quiz < 70%    | |  - 6-Stage Progression        |
|  - totalMastered            |               |  - specific review reason       | |  - Stage-by-stage drop-off %  |
|  - totalHoursLearned        |               |  - resume action link           | |  - Real learner event data    |
|  - continueLearning queue   |               +---------------------------------+ +-------------------------------+
+-----------------------------+
```

---

## 3. Data Model & Schema

### `LearningMastery`
Canonical single-record per member per educational content item:
```prisma
model LearningMastery {
  id                      String    @id @default(uuid())
  userId                  String
  organisationId          String
  contentType             String    // EXERCISE, TUTORIAL, LESSON, LEARNING_PATH, GUIDED_SESSION, etc.
  contentId               String
  status                  String    @default("NOT_STARTED") // NOT_STARTED, EXPLORING, LEARNING, PRACTICING, REVIEW, PROGRESSING, COMPLETED, MASTERED
  completionPercent       Float     @default(0.0)
  knowledgeCheckScore     Float?
  knowledgeCheckAttempts  Int       @default(0)
  sectionsCompleted       String[]  @default([])
  lastActivityAt          DateTime  @default(now())
  firstCompletedAt        DateTime?
  masteredAt              DateTime?
  reviewRecommendedAt     DateTime?
  reviewReason            String?
  metadata                Json?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  user                    User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, organisationId, contentType, contentId])
  @@index([organisationId])
  @@index([userId, organisationId])
  @@index([status])
}
```

### `LearningActivityEvent`
Append-only high-resolution educational telemetry table:
```prisma
model LearningActivityEvent {
  id             String    @id @default(uuid())
  organisationId String
  userId         String
  eventType      String    // TUTORIAL_STARTED, SECTION_VIEWED, PHASE_EXPLORED, etc.
  contentType    String
  contentId      String
  sectionId      String?
  sessionId      String?
  metadata       Json?
  occurredAt     DateTime  @default(now())

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([organisationId, occurredAt])
  @@index([userId, organisationId])
  @@index([contentType, contentId])
  @@index([eventType])
}
```

---

## 4. Mastery State Transition Machine

```text
[NOT_STARTED]
      |
      | TUTORIAL_STARTED / SECTION_VIEWED
      v
 [EXPLORING] 
      |
      | PHASE_EXPLORED / ANNOTATION_VIEWED
      v
  [LEARNING]
      |
      | PRACTICE_REP_CHECKED
      v
 [PRACTICING]
      |
      | PRACTICE_COMPLETED
      v
[PROGRESSING]
      |
      | TUTORIAL_COMPLETED
      v
 [COMPLETED]
      |
      +-------------------------------------------+
      |                                           |
      | Knowledge Check >= 80%                   | Knowledge Check < 70%
      v                                           v
  [MASTERED]                                   [REVIEW]
      |                                           |
      +----------------- Review Completed --------+
```

---

## 5. 6-Stage Drop-Off Funnel Analysis

The content intelligence engine deterministically maps telemetry events into six canonical engagement stages:

1. **Stage 1: Tutorial Started** (`TUTORIAL_STARTED`)
2. **Stage 2: Setup & Preparation** (`SECTION_VIEWED: INTRODUCTION, SETUP, EQUIPMENT`)
3. **Stage 3: Movement Breakdown** (`PHASE_EXPLORED`, `SECTION_VIEWED: MOVEMENT_PHASES`)
4. **Stage 4: Interactive Practice** (`PRACTICE_REP_CHECKED`, `PRACTICE_COMPLETED`)
5. **Stage 5: Knowledge Check** (`KNOWLEDGE_CHECK_PASSED`, `KNOWLEDGE_CHECK_FAILED`)
6. **Stage 6: Completed & Mastered** (`TUTORIAL_COMPLETED` or `status: MASTERED`)

Stage percentages and drop-off rates are computed directly from unique learner counts at each stage, delivering actionable curriculum insights to gym administrators and personal trainers.

---

## 6. Mobile Presentation Components

1. **`ContentMasteryBadge`**: Standardized mastery pill displaying the current status (`Mastered`, `Completed`, `Progressing`, `Practicing`, `Learning`, `Exploring`, `Needs Review`, `Not Started`) with custom icons, completion percentage, and quiz scores.
2. **`LearningJourneyVisualizer`**: Multi-stage progress visualizer illustrating member traversal across the 7 educational stages with checkpoints.
3. **`LearningAnalyticsCard`**: Summary card featuring total exercises mastered, completed tutorials, learning hours, path completions, and review queue alerts.
4. **`LearningDropoffFunnelCard`**: Educational engagement funnel card highlighting stage retention bars, completion rates, and average learning durations.

---

## 7. Non-Diagnostic Boundary & Ethical Safety

- **Educational Purpose**: Mastery signifies instructional comprehension and curriculum completion.
- **Zero Computer Vision / Pose Estimation**: No cameras, pose tracking, automatic rep counters, or automated form scoring are utilized.
- **Zero Medical Advice**: Biomechanical cues are educational principles, not therapeutic diagnoses.
- **Workout Isolation**: Educational activities are strictly isolated from physical logging tables (`Workout`, `WorkoutExercise`).
