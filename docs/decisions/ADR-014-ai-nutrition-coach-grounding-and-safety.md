# ADR 014: AI Nutrition Coach Grounded Context, Allergen Guardrails & Deterministic Food-Logging Proposals

## Status
Accepted (Day 21)

## Context
On Day 21, FitCore implements its second major production AI feature: the **AI Nutrition Coach**, building directly upon the Day 19 AI Platform Foundation and the Day 16 Nutrition Foundation (`NutritionProfile`, `NutritionTarget`, `MealPlan`, `FoodLog`, `Food`, `NutritionSummary`).

Applying conversational generative AI to nutrition and dietetics in a commercial fitness platform introduces acute clinical, liability, and operational risks:
1. **Severe Medical & Clinical Liability**: Members may seek treatment for clinical conditions (e.g. Type 1/2 diabetes, renal disease, celiac disease, eating disorders like anorexia/bulimia, or severe caloric restriction <1,000 kcal/day). The AI Coach is not a registered dietitian or physician; providing clinical nutrition prescriptions creates catastrophic health and legal exposure.
2. **Life-Threatening Allergen Contamination**: Recommending foods that contain known member allergens (e.g. peanuts, tree nuts, shellfish, dairy) can cause anaphylaxis. Prompt injection attacks attempting to override allergies ("ignore my peanut allergy") must be defended deterministically.
3. **Data Hallucination vs. System of Record**: Members asking "What did I eat today?" or "How is my protein intake?" must receive numbers calculated deterministically from Day 16 database records, never speculative numbers invented by an LLM. When 0 food logs exist, the AI must explicitly acknowledge the absence of logs.
4. **Autonomous Target & Meal Plan Modifications**: The AI must not unilaterally alter daily calorie/macro targets or modify trainer-prescribed meal plans. Such changes require human practitioner approval.
5. **Natural Language Food Logging Risks**: Natural language food tracking is convenient but prone to parsing errors. Directly writing unverified food records into the authoritative `FoodLog` table could corrupt nutrition history.

---

## Decision

### 1. Strict Gateway Pipeline & Zero Direct LLM Calls
- All AI Nutrition Coach interactions route through `AIOrchestratorService` -> `ModelGatewayService` using system prompt `nutrition_coach.v1` and JSON Schema `NUTRITION_COACH_RESPONSE_SCHEMA`.
- Direct invocations of third-party model SDKs are prohibited.

### 2. Deterministic Context Grounding & Zero Hallucination
- `NutritionContextBuilder` aggregates verified, tenant-isolated Day 16 data: active nutrition targets, daily summaries (calories, protein, carbs, fat, water), recent food logs, active assigned meal plans, and documented allergies/intolerances.
- All numerical totals and adherence percentages are calculated deterministically on the backend; the LLM is only tasked with conversational synthesis, context-aware explanations, and habit encouragement.
- When food logs are empty, the system prompt and development fallback enforce explicit declaration: *"I don't have enough recorded nutrition data to determine that. You currently have no food logs recorded for today in FitCore."*

### 3. Pre-Execution and Post-Execution Safety Engine (`NutritionSafetyService`)
- **Pre-execution Rule Evaluation**: Evaluates incoming prompts against `NUTRITION_RISK_RULES` before gateway dispatch:
  - **Eating Disorders & Purging** (forced vomiting, laxative abuse, severe food guilt): Immediately terminates generative pipeline, responds with compassionate support helpline guidance, records `AINutritionSafetyEscalation` with severity `URGENT_ESCALATION`, and writes audit record `NUTRITION_COACH_SAFETY_ESCALATION`.
  - **Extreme Calorie Restriction & Starvation** (<1,000 kcal/day, prolonged dry fasting): Blocks dangerous cut advice, explains metabolic risks, and provides evidence-based sustainable energy deficit guidelines.
  - **Clinical Disease Curing & Medication Cease**: Blocks claims to cure chronic illnesses with diet and warns against modifying physician-prescribed medications (e.g. insulin, antihypertensives).
  - **Adversarial Allergen Override Injections**: Intercepts attempts to bypass allergy restrictions ("ignore my peanut allergy") with an uncompromising safety intervention.
- **Post-execution Allergen Scrubbing**: Validates model output against `nutritionContext.profile.allergies`. If any documented allergen is detected, it is immediately redacted, contaminated meal suggestions or food alternatives are stripped, and a safety escalation is recorded.

### 4. Human-In-The-Loop Natural Language Food Logging Proposals
- To assist food tracking without compromising database integrity, `POST /api/v1/ai/nutrition/food-log/parse` converts natural language food descriptions into a structured `ParsedFoodLogProposal`.
- The endpoint calculates calories and macros deterministically and sets `requiresConfirmation: true`.
- **Zero Autonomous Writes**: The proposal is returned to the client and rendered in a dedicated `FoodLogProposalCard`. No records are inserted into `FoodLog` until the member explicitly reviews and confirms the items.

### 5. Multi-Tenant Isolation, Scoping & Consent Enforcement
- **Consent Assertion**: Members must have an active, accepted `AI_PROCESSING` consent record. If consent is absent or `WITHDRAWN`, endpoints throw `403 Forbidden` (`AI_CONSENT_REQUIRED`).
- **Tenant Isolation**: Every query and database relation is filtered by `organisationId`. Cross-tenant conversation access returns `403 Forbidden`.
- **Trainer Client Scoping**: Assigned trainers (verified via `TrainerClientAssignment`) can review client nutrition adherence and discussion topics via `GET /api/v1/ai/nutrition/trainer/preview/:memberId`. Unassigned trainers are rejected.

### 6. Read-Only Secure Tools
- Nutrition tools (`get_nutrition_profile`, `get_nutrition_targets`, `get_current_meal_plan`, `get_recent_food_logs`, `get_daily_nutrition_summary`, `get_food_alternatives`, `get_training_nutrition_context`) ignore client-supplied member IDs and resolve identity strictly from authenticated JWT session context.

---

## Consequences

### Positive
- **Safety Assurance**: Deterministic multi-layered protection against clinical liability, eating disorders, and anaphylactic allergen exposure.
- **Data Integrity**: Human-in-the-loop confirmation ensures the authoritative `FoodLog` table contains verified member food logs.
- **Trainer Relationship Protection**: Preserves trainer programming authority while providing trainers with actionable nutrition talking points.
- **Full Compliance & Auditability**: Every interaction, safety intervention, and feedback submission is logged in `AINutritionSafetyEscalation`, `AIFeedback`, and `AIAuditLog`.

### Negative / Trade-offs
- **Conservative Guardrails**: Members asking for clinical diet management for medical conditions are redirected to healthcare practitioners.
- **Confirmation Overhead**: Natural language food logging requires a confirmation step rather than instant silent logging, but this is a deliberate safety decision.
