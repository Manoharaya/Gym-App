# ADR-041: Exercise Muscles, Equipment & Metadata Intelligence Layer

## Status
Accepted

## Context
Days 61 through 64 established the visual exercise foundation, media storage engine, step-by-step instructional system, and machine-readable movement phases. Day 65 upgrades the exercise ecosystem with **authoritative anatomical muscle targeting, strict relational equipment modeling, taxonomy governance, quality completeness auditing, and biomechanical substitution matching**.

Previously, muscle groups and equipment requirements were represented as single enum strings (e.g. `primaryMuscleGroup: 'CHEST'`, `equipment: 'BARBELL'`), preventing granular representation of secondary synergists, isometric stabilizers, equipment alternatives, or environment constraints.

## Decisions

### 1. Granular Relational Muscle Modeling (`ExerciseMuscleRelation`)
- Introduced dedicated relational table `exercise_muscle_relations` with unique constraint `@@unique([exerciseId, muscle, role])`.
- Categorizes muscle recruitment into 3 functional roles:
  - `PRIMARY`: Main agonistic force drivers (e.g. Pectoralis Major for Bench Press).
  - `SECONDARY`: Synergistic assistors (e.g. Triceps Brachii and Anterior Deltoid).
  - `STABILIZER`: Dynamic and isometric joint stabilizers (e.g. Latissimus Dorsi, Rotator Cuff, Core).
- Added qualitative activation intensity levels: `HIGH`, `MODERATE`, `LOW`.
- Synchronizes with legacy top-level `primaryMuscleGroup` for backward compatibility.

### 2. Relational Equipment & Context Engine (`ExerciseEquipmentRelation`)
- Modeled distinct `exercise_equipment_relations` items enabling multi-equipment setups (e.g., Barbell + Squat Rack + Flat Bench).
- Supported requirement classification: `REQUIRED`, `OPTIONAL`, `ALTERNATIVE`, `NONE`.
- Embedded alternative equipment lists (e.g., Dumbbells or Resistance Bands as substitutions for Barbells).
- Included environmental availability tags (`GYM`, `HOME`, `OUTDOOR`, `STUDIO`) to support situational workout generation.

### 3. Multi-Tenant Taxonomy Governance (`ExerciseMetadataItem`)
- Created `exercise_metadata_items` providing standardized taxonomies across `MUSCLE`, `EQUIPMENT`, `CATEGORY`, and `GOAL`.
- Guaranteed immutability of system-level taxonomies (`organisationId === null`): tenants cannot mutate or archive global items.
- Permitted organisations to create custom taxonomy extensions (e.g. specialty bars, brand machines).

### 4. Dynamic 8-Dimension Quality Completeness Auditing (`ExerciseMetadataCompleteness`)
- Implemented automated scoring audit measuring data completeness across: Primary Muscle, Equipment, Movement Pattern, Category, Mechanics, Training Goals, Instructions, and Media.
- Returns overall completion percentage (`0% - 100%`) and itemized missing dimensions to guide coach and trainer authoring.

### 5. Biomechanical Exercise Substitution Engine (`getSubstitutes`)
- Developed candidate matching combining explicit `EQUIPMENT_SUBSTITUTE` variation links and dynamic biomechanical similarity (matching primary muscle group and movement pattern).
- Supported available equipment filtering to provide instant workout adaptations for traveling athletes, home gym trainees, or crowded facilities.

### 6. Mobile Experience & Visual Excellence
- Built Apple-grade UI components:
  - `ExerciseMuscleCard`: Multi-tier visual engagement cards with colored activation badges.
  - `ExerciseEquipmentModal`: Interactive equipment requirements viewer and authoring tool.
  - `ExerciseCompletenessScoreCard`: Visual completeness gauge with expandable 8-point checklist.
  - `ExerciseSubstituteModal`: Contextual substitution finder with quick-filter equipment chips.
- Integrated into `ExerciseDetailScreen.tsx` with dedicated **Muscles & Equipment** tab and Overview action triggers.

## Consequences
- **Positive**: Exercises have clinically and biomechanically authoritative muscle and equipment data; members can find instant equipment-compatible substitutes; trainers can audit library quality.
- **Trade-offs**: Requires additional relational joins when reading comprehensive exercise data; mitigated by Prisma nested includes and caching in visual detail endpoints.
