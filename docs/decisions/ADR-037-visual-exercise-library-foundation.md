# ADR-037: Visual Exercise Library Foundation, Movement Phases & Hallucination-Resistant Grounding

## Status
Accepted

## Context
FitCore required an enriched, multi-media visual exercise library with fine-grained biomechanical taxonomies, step-by-step instructions, movement phase timelines, common mistake analysis, safety contraindications, and variation mapping. Additionally, downstream autonomous agents (such as the AI Fitness Coach) required structured, non-hallucinatory access to biomechanical truths without granting direct unrestricted database access or SQL execution.

## Decision
1. **Non-Destructive Schema Extension**:
   - Preserved all existing `Exercise` columns and relations to guarantee 100% backward compatibility for existing workouts, templates, and personal records.
   - Extended `Exercise` with: `contentStatus`, `breathingInstructions`, `tempo`, `rangeOfMotion`, `stabilizerMuscles`, `educationalTips`, `movementPatternMetadata`.
   - Introduced 6 normalized relational models cascading on delete:
     - `ExerciseInstructionStep` (with step numbering and phase associations).
     - `ExerciseMovementPhase` (SETUP, DESCENT, BOTTOM, ASCENT, LOCKOUT checkpoints and timestamp offsets).
     - `ExerciseCommonMistake` (with severity levels, consequence analysis, and corrective cues).
     - `ExerciseSafetyGuideline` (with category, severity, and clinician/coach verification metadata).
     - `ExerciseVariation` (representing regressions, progressions, and equipment alternatives).
     - `ExerciseEquipmentRelation` (documenting mandatory vs optional training tools).
   - Extended `ExerciseMedia` to support 3D formats (`GLB`, `GLTF`, `USDZ`), Level of Detail (`LOW`, `MEDIUM`, `HIGH`), dimensions, and publication states.

2. **Zero-Trust Multi-Tenancy & Immutability**:
   - System exercises (`ownershipType: 'SYSTEM'`, `organisationId: null`) remain strictly immutable to organization tenants. Any attempt to modify, archive, or mutate visual sub-entities on system exercises is blocked at the service boundary with `403 Forbidden`.
   - Custom organization exercises are isolated by `organisationId` and enforce strict cross-tenant isolation with `404 Not Found` upon spoofed boundary requests.

3. **AI Coach Tool Grounding**:
   - Added `ExerciseKnowledgeService` and registered `get_exercise_knowledge` in `FitnessCoachToolsService`.
   - Enforces deterministic, verified knowledge retrieval for exercise biomechanics, eliminating LLM hallucinations regarding joint angles, safety contraindications, and movement cues.

4. **Apple-Grade Mobile UI Navigation**:
   - Enhanced `ExerciseDetailScreen.tsx` with segmented tabs (`Overview`, `How-To & Phases`, `Visuals`, `Mistakes`, `Safety`, `Variations`), full deep-link navigation between variations, and seamless fallback for legacy exercises.

## Consequences
- **Positive**: Complete visual coaching experience for members and trainers; verified safety warnings; AI coach operates on structured domain truth; zero regression on active workouts.
- **Trade-offs**: Additional relational joins when querying `/exercises/:id/visual`, mitigated by specialized lightweight sub-endpoints (`/instructions`, `/media`, `/relationships`) for targeted query patterns.
