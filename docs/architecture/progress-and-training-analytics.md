# Progress Tracking, Assessments & Training Analytics Architecture

## 1. Domain Overview & Philosophy

FitCore Day 15 establishes the **Progress Tracking, Assessments & Training Analytics Foundation**.
The core tenet of this system is **zero fake analytics**: every metric, personal record, adherence percentage, and volume figure is calculated strictly from real persisted records.

### Critical Separation of Concerns
```text
Member
   ↓
TrainingProgram
   ↓
TrainingPlan
   ↓
Workout
   ↓
WorkoutExercise
   ↓
WorkoutSet
   ↓
Performance (Source of Truth)
   ↓ (Read-Only Consumption)
Progress Tracking & Analytics (Derived Insights)
```

Progress analytics reads from these upstream domains but **never mutates** source workout or set data.

---

## 2. Core Entities & Data Architecture

### 2.1 Body Measurements (`BodyMeasurement`)
- **Immutability / Append-Only**: Measurements are never updated in place. Historical records are preserved indefinitely.
- **Supported Types**: `WEIGHT`, `HEIGHT`, `BODY_FAT_PERCENT`, `BMI`, `CHEST`, `WAIST`, `HIPS`, `NECK`, `LEFT_ARM`, `RIGHT_ARM`, `LEFT_THIGH`, `RIGHT_THIGH`, `LEFT_CALF`, `RIGHT_CALF`, `SHOULDERS`, `CUSTOM`.
- **Unit Architecture**: Explicit canonical storage (`kg`, `lb`, `cm`, `in`, `%`). Conversions are calculated with deterministic ratios.
- **Statistical Trends**: Computes `firstValue`, `latestValue`, `minValue`, `maxValue`, `netChange`, and directional indicator (`UP`, `DOWN`, `STABLE`).

### 2.2 Fitness Assessments (`AssessmentTemplate`, `Assessment`, `AssessmentResult`)
- **System Templates**: Pre-configured benchmarks (`3RM Back Squat`, `Push-up Test`, `1 km Run`, `5 km Run`, `Plank Hold`, `Sit-and-Reach`, `Resting Heart Rate`, `Body Composition`).
- **Custom Templates**: Organisations and trainers can define bespoke fitness protocols.
- **Structured Typed Results**: Typed fields (`weight`, `repetitions`, `durationSeconds`, `distance`, `score`, `rating`, `percentage`, `booleanResult`) instead of unstructured JSON blobs.
- **Historical Comparisons**: Live delta calculation against previous assessments.

### 2.3 Personal Records Engine (`PersonalRecord`)
- **Backend Validation**: Personal records are never declared by the client. The backend validates completed sets from non-cancelled workouts.
- **Supported Types**:
  - `MAX_WEIGHT`: Highest actual load completed for ≥1 rep.
  - `MAX_REPS`: Highest repetitions completed in a set.
  - `MAX_VOLUME`: Highest single-set tonnage (`load × reps`).
  - `FASTEST_TIME`: Shortest completed duration for cardio/time-trials.
  - `LONGEST_DISTANCE`: Greatest distance covered.
- **Full Lineage Traceability**: Every PR links directly to `exerciseId`, `workoutId`, `workoutExerciseId`, `workoutSetId`, `previousValue`, `achievedAt`, and `improvementPercentage`.
- **Chronological History**: Historical PRs are permanently preserved.

---

## 3. Adherence & Goal Mathematics

### 3.1 Adherence Formula
Cancelled workouts are explicitly excluded from the denominator to avoid penalizing members for administrative or schedule cancellations.
```text
effectiveScheduled = totalScheduled - cancelled
adherenceRate = effectiveScheduled > 0 ? (completed / effectiveScheduled) × 100% : 100%
completionRate = totalScheduled > 0 ? (completed / totalScheduled) × 100% : 100%
```

### 3.2 Goal Progress Mathematics
Handles increasing and decreasing targets symmetrically without misleading percentages:
- **Increasing Goal** (Target > Baseline, e.g. Squat 60kg → 80kg, Current 70kg):
  ```text
  progress = ((current - baseline) / (target - baseline)) × 100% = ((70 - 60) / (80 - 60)) × 100% = 50.0%
  ```
- **Decreasing Goal** (Target < Baseline, e.g. Weight Loss 100kg → 80kg, Current 90kg):
  ```text
  progress = ((baseline - current) / (baseline - target)) × 100% = ((100 - 90) / (100 - 80)) × 100% = 50.0%
  ```

---

## 4. Privacy, Tenant Isolation & Authorization

| Role | Progress Visibility & Permissions |
|---|---|
| **SUPERADMIN** | Platform-wide manage access |
| **ORGANISATION_OWNER** | Full organisation-scoped analytics access |
| **OUTLET_MANAGER** | Branch/outlet-scoped access |
| **TRAINER** | Strictly scoped to assigned clients via active `TrainerClientAssignment` |
| **MEMBER** | Strictly scoped to `SELF` (own profile only) |
| **FINANCE** | **Zero access**. Strictly prohibited from accessing health and progress data |

Cross-tenant access attempts immediately fail with 403 Forbidden or 404 Not Found.

---

## 5. Performance & Caching Foundation

- **Cache Keys**: Tenant and member scoped:
  ```text
  org:{organisationId}:member:{memberProfileId}:progress:{period}
  ```
- **TTL**: 300 seconds (5 minutes) with automatic in-memory fallback if Redis is unavailable.
- **Cache Invalidation**: Automatically triggered upon:
  - New body measurement logged
  - New fitness assessment completed
  - Workout execution or set completion
