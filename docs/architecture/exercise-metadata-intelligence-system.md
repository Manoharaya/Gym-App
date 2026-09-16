# FitCore Exercise Muscles, Equipment & Metadata Intelligence Architecture (Day 65)

## 1. Executive Summary

Day 65 establishes the **Exercise Muscles, Equipment & Metadata Intelligence Layer** for FitCore. This architecture transforms exercise classification from generic strings and unstructured notes into a **machine-readable, multi-dimensional biomechanical taxonomy, strict relational equipment engine, and quality audit framework**.

Key capabilities introduced:
1. **Hierarchical Biomechanical Muscle Engagement**: Granular mapping of primary agonists, secondary synergists, and isometric stabilizers with qualitative activation levels (`HIGH`, `MODERATE`, `LOW`).
2. **Relational Equipment Engine**: Strict distinction between required equipment, optional equipment, alternatives, and availability environments (`GYM`, `HOME`, `OUTDOOR`).
3. **Multi-Tenant Taxonomy Management**: Global immutable system taxonomies with tenant-scoped custom extension items (`ExerciseMetadataItem`).
4. **8-Dimension Metadata Completeness Audit**: Dynamic quality scoring algorithm measuring exercise data richness.
5. **Biomechanical & Equipment-Aware Exercise Substitution Engine**: Algorithmic matching of viable alternative exercises based on joint mechanics, primary muscle recruitment, and athlete-available equipment.

```text
FITCORE DAY 65 EXERCISE METADATA INTELLIGENCE LAYER
┌────────────────────────────────────────────────────────────────────────┐
│                        Exercise (Exercise Model)                       │
│  - Category (STRENGTH, CARDIO, MOBILITY, CORE, RECOVERY, BODYWEIGHT)   │
│  - Mechanics (COMPOUND, ISOLATION, COMBINATION, ISOMETRIC, PLYOMETRIC) │
│  - Equipment Requirement (REQUIRED, OPTIONAL, NONE)                    │
│  - Available Environments (HOME, GYM, OUTDOOR, STUDIO)                 │
│  - Training Goals (STRENGTH, HYPERTROPHY, ENDURANCE, MOBILITY, etc.)   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ 1 : N                          │ 1 : N
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│ ExerciseMuscleRelation               │ │ ExerciseEquipmentRelation     │
│ - Muscle (CHEST, LATS, GLUTES, etc.) │ │ - Equipment Name              │
│ - Muscle Group (UPPER, LOWER, CORE)  │ │ - Requirement Type (REQUIRED) │
│ - Role (PRIMARY, SECONDARY, STABIL.) │ │ - Category (FREE_WEIGHTS)     │
│ - Activation Level (HIGH, MOD, LOW)  │ │ - Alternatives (Dumbbells)    │
│ - Qualitative Biomechanics Notes     │ │ - Availability Contexts (GYM) │
└──────────────────────────────────────┘ └───────────────────────────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Intelligent Services                              │
│  - ExerciseMetadataService.getCompleteness (8-point Quality Audit)     │
│  - ExerciseMetadataService.getSubstitutes (Biomechanical Match Engine) │
│  - ExerciseMetadataService.getTaxonomy (System + Tenant Taxonomies)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Models & Relational Schema

### 2.1 `ExerciseMuscleRelation`
Maps specific anatomical muscles worked by an exercise with their functional role and activation intensity:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (cuid)` | Primary key |
| `exerciseId` | `String` | Foreign key to `Exercise` (cascade delete) |
| `muscle` | `String` | Muscle code (e.g. `CHEST`, `QUADRICEPS`, `LATS`, `GLUTES`) |
| `muscleGroup` | `String` | Taxonomy group (`UPPER_BODY`, `LOWER_BODY`, `CORE`, `FULL_BODY`) |
| `role` | `String` | Functional engagement: `PRIMARY`, `SECONDARY`, `STABILIZER` |
| `activationLevel` | `String?` | Biomechanical activation intensity: `HIGH`, `MODERATE`, `LOW` |
| `notes` | `String?` | Specific activation cue or head emphasis (e.g. "Clavicular head") |

Unique constraint: `@@unique([exerciseId, muscle, role])` prevents redundant duplicate relation entries.

### 2.2 `ExerciseEquipmentRelation`
Itemizes the exact equipment needed to perform an exercise:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (cuid)` | Primary key |
| `exerciseId` | `String` | Foreign key to `Exercise` (cascade delete) |
| `equipmentName` | `String` | Human-readable equipment item (e.g. `Olympic Barbell`) |
| `requirementType` | `String` | `REQUIRED`, `OPTIONAL`, `ALTERNATIVE`, `NONE` |
| `equipmentCategory` | `String?` | `FREE_WEIGHTS`, `MACHINES`, `BENCHES_SUPPORTS`, `BODYWEIGHT`, `ACCESSORIES`, `CABLE` |
| `alternatives` | `Json? (string[])` | Viable equipment substitutions (e.g. `["Dumbbells", "Resistance Bands"]`) |
| `availabilityContexts`| `Json? (string[])` | Context tags (e.g. `["GYM", "HOME", "OUTDOOR"]`) |
| `isOptional` | `Boolean` | Convenience flag indicating non-mandatory accessory |
| `notes` | `String?` | Specific setup note (e.g. "Requires 45-degree incline bench") |

### 2.3 `ExerciseMetadataItem` (Taxonomy Engine)
Provides managed, extensible taxonomy values across muscle groups, equipment types, exercise categories, and training goals:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (cuid)` | Primary key |
| `organisationId` | `String?` | `null` for Global System Taxonomies; tenant ID for custom items |
| `type` | `String` | `MUSCLE`, `EQUIPMENT`, `CATEGORY`, `GOAL`, `TAG` |
| `code` | `String` | Normalized identifier (e.g. `SAFETY_SQUAT_BAR`) |
| `name` | `String` | Display label (e.g. "Safety Squat Bar (SSB)") |
| `group` | `String?` | Grouping classifier (e.g. `FREE_WEIGHTS`) |
| `status` | `String` | `ACTIVE`, `ARCHIVED` |

---

## 3. Intelligent Algorithms

### 3.1 Metadata Completeness & Quality Scoring (`getCompleteness`)
Calculates data quality across 8 key dimensions with proportional weighted scoring:

```typescript
scoreBreakdown: {
  primaryMuscle: boolean;      // Has primary muscle relation or primaryMuscleGroup
  equipment: boolean;          // Has equipment relation or equipment specification
  movementPattern: boolean;    // Valid movement pattern specified
  exerciseCategory: boolean;   // Valid category (STRENGTH, CARDIO, etc.)
  exerciseMechanics: boolean;  // COMPOUND or ISOLATION
  trainingGoals: boolean;      // At least 1 training goal mapped
  instructions: boolean;       // Has structured step instructions
  media: boolean;              // Has primary photo or video demonstration
}
overallPercentage = (passedDimensions / 8) * 100;
```

### 3.2 Biomechanical Substitution Engine (`getSubstitutes`)
Identifies viable replacement exercises:
1. **Explicit Substitutes**: Reads validated `ExerciseVariation` relations where `relationshipType = 'EQUIPMENT_SUBSTITUTE'`.
2. **Biomechanical Similarity**: Queries exercises sharing the identical `primaryMuscleGroup` and `movementPattern`.
3. **Equipment Availability Filtering**: When the client specifies `availableEquipment` (e.g. `['DUMBBELL', 'BODYWEIGHT']`), filters candidates to only those feasible under the athlete's immediate environmental constraints.

---

## 4. Multi-Tenancy & Security

1. **System Taxonomy Immutability**: Any mutation (`updateTaxonomyItem`, `archiveTaxonomyItem`) against a system item (`organisationId === null`) is strictly rejected with a `403 ForbiddenException` (`SYSTEM_TAXONOMY_IMMUTABLE`).
2. **Tenant IDOR Protection**: All exercise relation mutations verify ownership:
   - System exercises (`ownershipType === 'SYSTEM'`) are immutable by tenants.
   - Organisation custom exercises can only be modified by actors belonging to the owning organisation.
   - Cross-tenant mutations throw `404 NotFoundException`.
3. **Audit Trail Logging**: All taxonomy item creations, updates, and relation mutations generate immutable compliance audit records via `AuditService`.
