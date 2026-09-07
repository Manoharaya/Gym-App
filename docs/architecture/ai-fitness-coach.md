# FitCore Architecture: AI Fitness Coach — Personalized Training Intelligence

## 1. Executive Summary & Objective
Day 20 establishes the first production-grade AI capability in FitCore: the **AI Fitness Coach**.

The AI Fitness Coach provides intelligent, personalized training analysis and guidance by reasoning over verified member data built in Days 1–19 (workout logs, training plans, goal milestones, attendance streaks, and opt-in nutrition targets).

### Core Architectural Principles
1. **Centralized Model Gateway**: All AI requests flow exclusively through the Day 19 `AIOrchestratorService` and `ModelGatewayService`. No domain code directly invokes third-party LLM SDKs.
2. **Zero Hallucination & Strict Grounding**: The AI only reasons over verified database records. If activity data does not exist, the coach explicitly reports: *"I don't have enough recorded activity to determine that."*
3. **Clinical & Medical Safety Non-Negotiable**: Zero diagnostic or prescriptive medical claims. Acute cardiopulmonary symptoms (chest pain, syncope, severe dyspnea) immediately halt training recommendations and trigger urgent medical escalations.
4. **Trainer Program Protection**: The AI respects the professional authority of human trainers. For trainer-assigned programming, the AI explains principles but directs members to consult their trainer before adjusting volume, load, or exercise substitutions.
5. **System of Record Immutability**: The AI Coach is strictly a read-and-reason advisory layer. It never directly mutates source-of-truth tables (`Workout`, `TrainingPlan`, `TrainingGoal`).

---

## 2. Component Topology

```text
                               Mobile Client
                 (AICoachScreen / fitnessCoachService)
                                     │
                                     │ HTTPS / JWT
                                     ▼
                        FitnessCoachController
                 (/api/v1/ai/fitness-coach/* endpoints)
                                     │
                                     ▼
                            FitnessCoachService
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
FitnessSafetyPolicyService   FitnessCoachContextBuilder     Tool Registry
 (Red-Flag Symptoms /         (14d Workouts, Plans,        (Scoped Member
  Clinical Escalate)           Goals, Redactions)           Read Tools)
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
                            AIOrchestratorService
                         (12-Step Day 19 Pipeline)
                                     │
                                     ▼
                            ModelGatewayService
                     (Development / OpenAI / Gemini)
```

---

## 3. Data Grounding & Context Prioritization

### Context Priority Hierarchy
Context tokens are allocated according to a strict priority hierarchy to maintain high reasoning quality:

1. **Member Preferences (10%)**: Coaching style (Motivational, Direct, Encouraging, Technical), response length (Concise, Balanced, Detailed), units (Metric, Imperial).
2. **Active Goals (15%)**: Current target metrics, milestones, categories.
3. **Current Training Plan (25%)**: Active plan objective, periodized week, trainer assignment flag, scheduled weekly split.
4. **Recent Completed Workouts (30%)**: Last 14 days of logged workouts, completed exercises, set/rep schemes, actual weight, RPE.
5. **Engagement & Consistency (10%)**: Check-in streak, total visits, active challenge participation.
6. **Recent Conversation History (10%)**: Rolling 6-message window for conversational continuity.

### Sensitive Data Redaction
The context builder strictly omits:
- Medical clearance files and doctor notes
- PAR-Q questionnaire disclosures
- Private trainer notes
- User credentials and authentication tokens
- Payment card tokens and billing details

---

## 4. Safety Guardrails & Clinical Escalation

### Escalation Hierarchy
| Trigger Category | Symptoms / Patterns | Severity | Action Taken |
| :--- | :--- | :--- | :--- |
| **CHEST_PAIN** | Crushing chest pressure, left arm radiating pain | `URGENT_ESCALATION` | Cease exercise immediately; direct to call 000 / emergency services |
| **MEDICAL_SYMPTOM** | Syncope, loss of consciousness, severe dyspnea | `URGENT_ESCALATION` | Cease exertion; seek immediate medical evaluation |
| **INJURY** | Joint popping, acute swelling, inability to bear weight | `RECOMMEND_PROFESSIONAL` | Halt aggravating movements; refer to physiotherapist or sports physician |
| **UNSAFE_PRACTICE** | Extreme caloric restriction (<500 kcal), dehydrating cuts | `CAUTION` | Block recommendation; enforce sustainable periodized nutrition |

### Safety Audit & Record Keeping
When an escalation triggers:
1. `AIFitnessSafetyEscalation` record is created in PostgreSQL linking `memberId`, `organisationId`, `category`, and `severity`.
2. Audit log entry `FITNESS_COACH_SAFETY_ESCALATION` is written with result `BLOCKED`.
3. Client receives deterministic emergency guidance with medical emergency alerts.

---

## 5. Trainer Integration & Preview

### Role Boundaries
- **Members**: Access their own personal coaching conversations and context summaries (`scope: SELF`).
- **Trainers**: View AI coaching insights for assigned clients via `GET /ai/fitness-coach/trainer/preview/:memberId` (`scope: ASSIGNED_CLIENTS`).
  - Displays completed workouts adherence
  - Current plan progress and volume compliance
  - Suggested trainer-client discussion points for upcoming sessions

---

## 6. Verification & Test Architecture

- **Backend E2E Suite** (`services/api/test/fitness-coach.e2e-spec.ts`):
  - Test Group 1: Coaching profile and conversation lifecycle
  - Test Group 2: Real data grounding and zero-hallucination verification
  - Test Group 3: Cardiopulmonary emergency escalation and non-diagnostic injury advice
  - Test Group 4: Trainer-prescribed program protection
  - Test Group 5: Tool authorization and IDOR defense
  - Test Group 6: Multi-tenant isolation and `AI_PROCESSING` consent enforcement
  - Test Group 7: Trainer client preview and RBAC boundaries
  - Test Group 8: Feedback recording and conversation summarization
- **Mobile Component Suite** (`apps/mobile/src/__tests__/fitness-coach.test.tsx`):
  - Safety notice banners (clinical vs urgent emergency)
  - Suggestion chips and prompt dispatching
  - Structured insights, recommendations, and action button press routing
  - Service methods integration
