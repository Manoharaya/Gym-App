# Architecture: AI Retention Intelligence

## 1. Overview & System Context
FitCore **AI Retention Intelligence** (Day 26) is the predictive, explainable member retention layer positioned between deterministic engagement signals (Day 25) and human staff operations.

```text
Member Activity (Visits, Workouts, Check-ins, Bookings, Wearables, Goals)
                              ↓
              Engagement Signals Bundle (Day 25)
                              ↓
       Personal Baseline Engine vs Recent Multi-Pillar Trajectory
                              ↓
      Deterministic Risk Classifier & Structured Risk Factors
                              ↓
       Retention Context Assembler (Sanitized Profile & Lifecycle)
                              ↓
         AI Retention Intelligence Feature (Model Gateway)
                              ↓
          Output Sanitization & Hallucination Guardrails
                              ↓
       ┌──────────────────────┴──────────────────────┐
       ▼                                             ▼
Staff Retention Queue & Cards         Retention Follow-Up Task Engine
 (Mobile Trainer & Web Staff)          (OPEN -> ASSIGNED -> COMPLETED)
```

## 2. Core Architectural Principles
1. **Human-In-The-Loop by Construction**:
   - AI detects, explains, recommends, prioritizes, and drafts.
   - AI **never** triggers direct autonomous interventions (no messaging, no discounting, no cancellation).
2. **Personal Baseline Comparison**:
   - Compares members to their own 28-day baseline rather than cohort averages.
   - Prevents false-positive churn flags for naturally low-frequency, consistent members.
3. **Structured Risk Factors & Evidence Grounding**:
   - Every risk factor contains concrete, observable platform facts (`observation`, `timeframe`, `evidence`).
   - Every positive recovery signal is balanced into the evaluation.
4. **Controlled Intervention Taxonomy**:
   - All recommendations map strictly to 12 controlled taxonomy types: `TRAINER_CHECK_IN`, `GOAL_REVIEW`, `TRAINING_RESTART`, `CLASS_RECOMMENDATION`, `PERSONAL_TRAINING_FOLLOW_UP`, `RECOVERY_SUPPORT`, `APP_ENGAGEMENT`, `NUTRITION_ENGAGEMENT`, `MEMBERSHIP_CONVERSATION`, `GENERAL_SUPPORT`, `NO_ACTION`, `INSUFFICIENT_DATA`.
5. **Staff Task Workflow**:
   - Human tasks track action accountability (`RetentionFollowUpTask`) with audit logs.
   - Tasks support assignment, notes, due dates, completion, and reasoned dismissal.

## 3. Component Breakdown

### A. Core Services (`services/api/src/ai/features/retention-intelligence/`)
- **`RetentionIntelligenceService`**: Facade service orchestrating summary aggregations, deterministic risk queries, structured factors, queue filtering, task lifecycles, and feedback.
- **`RetentionAnalysisService`**: AI analysis orchestrator managing prompt execution, tool invocation, development provider fallback, caching, and database persistence.
- **`RiskFactorService`**: Deterministic rule engine evaluating structured risk factors (`RetentionRiskFactor`) and positive signals (`RetentionPositiveSignal`).
- **`InterventionSelectionService`**: Deterministic recommendation engine selecting matching intervention types based on member lifecycle, risk severity, and active coach relationships.
- **`RetentionSafetyService`**: Guardrail filter detecting prompt injections, sanitizing clinical/diagnostic terms, and filtering unapproved intervention types or commercial promises.
- **`RetentionContextService`**: Privacy-compliant context assembler aggregating engagement signals, baseline stats, goals, attendance history, and trainer assignments.
- **`RetentionJobService`**: Background batch processor periodically scanning for at-risk members, generating tasks, and expiring stale items.

### B. Mobile UI Layer (`apps/mobile/src/features/retention/`)
- **`RetentionRiskCard`**: Trainer-facing client risk overview with trend badge, contributing signals, positive signals, and quick follow-up task action button.
- **`RetentionQueueScreen`**: Staff-facing queue for outlet managers and reception, featuring search, risk filters (`HIGH`, `ELEVATED`, `MODERATE`, `LOW`), and summary distribution metrics.
- **`RetentionDetailScreen`**: Deep-dive analysis view with staff executive summary, talking points, draft outreach message, task creation modal, and recommendation feedback rating buttons.
- **`FitnessMomentumCard`**: Member-facing motivational card highlighting weekly workout progress, streaks, and encouragement—completely isolated from internal churn/risk labels.

## 4. Multi-Tenant Isolation & Authorization
- **Tenant Scoping**: All database queries and services require `organisationId`.
- **RBAC**: Access restricted to `SUPERADMIN`, `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `TRAINER`, and `RECEPTION`. Regular members receive 403 Forbidden.
- **Trainer Scoping**: Personal trainers can only view retention intelligence for actively assigned clients (`TrainerClientAssignment`).
