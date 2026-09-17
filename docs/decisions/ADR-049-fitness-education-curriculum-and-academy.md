# ADR-049: Fitness Education Curriculum, Exercise Fundamentals & Structured Learning Academy

## Status
Accepted

## Context
Through Days 61–72, FitBeat built comprehensive visual exercises, exercise collections, learning paths, member dashboards, and knowledge check assessments. However, educational content was fragmented across isolated exercises and disparate learning paths without a higher-order pedagogical curriculum or standardized terminology framework.

Members frequently encounter technical fitness terminology (e.g., "progressive overload", "concentric phase", "hip hinge vs. squat pattern", "rate of perceived exertion") without an authoritative, accessible glossary. Furthermore, gym organizations lacked an academic hierarchy to group multiple learning paths into coherent, progressive curricula.

To elevate FitBeat into an elite training platform, Day 73 introduces the **Fitness Education Curriculum & Structured Learning Academy**.

## Decision

### 1. Hierarchical Academic Model (`Curriculum` -> `LearningPath` -> `Section` -> `Lesson`)
- We introduced the `Curriculum` entity in the database to serve as the overarching educational program.
- Existing `LearningPath` records relate to `Curriculum` via an optional foreign key `curriculumId`, preserving backward compatibility with standalone learning paths from Days 70–72.
- Supported categories span 12 domains: `FITNESS_FUNDAMENTALS`, `MOVEMENT_FUNDAMENTALS`, `EXERCISE_FUNDAMENTALS`, `GYM_EQUIPMENT`, `TRAINING_PRINCIPLES`, `WARMUP_COOLDOWN`, `STRENGTH_TRAINING`, `CARDIO`, `MOBILITY`, `FLEXIBILITY`, `RECOVERY`, and `WELLNESS`.

### 2. Modular Content Blocks in Lessons (`contentBlocks`)
- Instead of confining lesson guidance to raw markdown strings, `LearningPathLesson` now supports structured `contentBlocks` (JSON).
- Supports 7 typed modular blocks:
  - `TEXT`: Primary explanation text.
  - `CALLOUT`: Visual callout banners classified as `TIP`, `SAFETY`, `KEY_POINT`, or `DEFINITION`.
  - `EXERCISE_REF`: Tappable card preview embedding a specific exercise.
  - `MOVEMENT_REF`: Visual chip highlighting movement patterns (e.g., Squat, Hinge, Push, Pull).
  - `GLOSSARY_REF`: Interactive chip referencing authoritative glossary terms.
  - `IMAGE` & `VIDEO`: Media elements with captions.
- Retains backward compatibility by falling back to `lesson.content` when `contentBlocks` are absent.

### 3. Authoritative Fitness Terminology Glossary (`GlossaryTerm`)
- Added `GlossaryTerm` table supporting comprehensive definitions, short explanations, categorization, and cross-linking to movement patterns, exercises, and academy lessons.
- Includes alphabetical letter indexing (A-Z) and full-text keyword searching.
- Supports interactive exploration in mobile via `GlossaryTermModal` without interrupting the active lesson stream.

### 4. Dual-Tenant Architecture & Publishing Integrity
- Curricula and glossary terms support both `SYSTEM` (shared foundational content) and `ORGANISATION` (custom gym content).
- Modification of `SYSTEM` entities is strictly restricted to `SUPERADMIN` actors.
- Publishing validation prevents publishing curricula that contain 0 learning paths or 0 lessons.

### 5. Zero Generative AI / Workout Separation
- All curricula, content blocks, and glossary entries are authored, deterministic, and non-diagnostic.
- Educational progress remains decoupled from workout logging sessions.

## Consequences

### Positive
- Transforms FitBeat from a routine workout app into an authoritative fitness academy.
- Members gain deep biomechanical literacy and safety awareness through structured curricula and quick-lookup glossary terms.
- Modular content blocks significantly improve reading comprehension and mobile user engagement.
- Full multi-tenant support enables gyms to author customized curricula matching their signature training styles.

### Negative / Trade-offs
- Curriculum authors must maintain path counts and lesson associations when organizing syllabi.
- Requires initial authoring and seeding of foundational curricula and terminology.
