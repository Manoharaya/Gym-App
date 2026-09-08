# FitCore AI Nutrition Coach — Architecture, Safety & Food-Tracking Engine

## 1. System Overview & Objectives
The **AI Nutrition Coach** is the second major production-grade AI feature in the FitCore platform, built directly upon:
1. **Day 19 AI Platform Foundation**: Model Gateway (`ModelGatewayService`), Central Orchestrator (`AIOrchestratorService`), Prompt Registry (`PromptRegistryService`), AI Permissions, Usage/Cost Tracking, and Audit Logging.
2. **Day 16 Nutrition Foundation**: Authoritative nutrition entities (`NutritionProfile`, `NutritionTarget`, `MealPlan`, `MealPlanDay`, `MealPlanMeal`, `Food`, `Meal`, `FoodLog`, `DailyNutritionSummary`).

### Primary Objectives:
- **Personalized Nutrition Intelligence**: Explain daily macro adherence, calorie pacing, pre/post-workout meal timing, and dietary patterns.
- **Zero Hallucination Grounding**: All calorie totals, macronutrient splits, and historical food logs are calculated deterministically on the backend from verified database records.
- **Natural Language Food-Tracking Assistant**: Convert unstructured meal descriptions (e.g. *"two scrambled eggs, whole wheat toast with butter, and an espresso"*) into structured meal proposals (`ParsedFoodLogProposal`) requiring human confirmation before persisting to `FoodLog`.
- **Allergy & Intolerance Protection**: Strict exclusion of documented member allergens (e.g. peanuts, tree nuts, dairy, gluten, shellfish) with deterministic defense against prompt injections attempting to override safety limits.
- **Medical & Clinical Safety Guardrails**: Hard deflection of eating disorder behaviors, purging, starvation diets (<1,000 kcal/day), dangerous fasting, dehydration strategies, disease curing claims, and prescription medication alterations.
- **Multi-Tenant Isolation & Role Boundaries**: Tenant scoping (`organisationId`), `AI_PROCESSING` consent enforcement, and trainer preview scoping via `TrainerClientAssignment`.

---

## 2. Architecture & Data Flow

```
Mobile App (NutritionCoachScreen)
       │
       ▼
NutritionCoachController (/api/v1/ai/nutrition)
       │
       ├─► 1. Consent Verification (assertMemberConsent)
       │
       ├─► 2. Pre-Execution Safety Filter (NutritionSafetyService.evaluateInput)
       │        └─► Triggered? -> Return Safety Intervention & Persist Escalation
       │
       ├─► 3. Context Construction (NutritionContextBuilder)
       │        ├─ Profile (Allergies, Intolerances, Dietary Pattern)
       │        ├─ Targets (Calories, Protein, Carbs, Fat, Water)
       │        ├─ Daily Summary (Authoritative Calculations)
       │        ├─ Assigned Meal Plan
       │        └─ Training Context (Recent Workouts, Today's Workout)
       │
       ├─► 4. AI Orchestrator Dispatch (AIOrchestratorService)
       │        └─► Model Gateway -> Provider Adapter (Google / Anthropic / Dev)
       │
       ├─► 5. Post-Execution Safety Filter (NutritionSafetyService.evaluateOutput)
       │        └─► Allergen Detected? -> Redact Allergen & Filter Meals/Alts
       │
       └─► 6. Persist Assistant Message & Return Response
```

---

## 3. Database Schema (Prisma)

```prisma
model AINutritionCoachProfile {
  id              String   @id @default(cuid())
  organisationId  String   @map("organisation_id")
  memberId        String   @unique @map("member_id")
  coachingStyle   String   @default("SUPPORTIVE") @map("coaching_style")
  responseLength  String   @default("BALANCED") @map("response_length")
  language        String   @default("en")
  unitPreference  String   @default("METRIC") @map("unit_preference")
  nutritionFocus  String?  @map("nutrition_focus")
  enabled         Boolean  @default(true)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organisation    Organisation   @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  member          MemberProfile  @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([organisationId])
  @@index([memberId])
  @@map("ai_nutrition_coach_profiles")
}

model AINutritionCoachConversation {
  id              String    @id @default(cuid())
  organisationId  String    @map("organisation_id")
  memberId        String    @map("member_id")
  title           String?
  status          String    @default("ACTIVE")
  contextSnapshot Json?     @map("context_snapshot")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  organisation    Organisation                  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  member          MemberProfile                 @relation(fields: [memberId], references: [id], onDelete: Cascade)
  messages        AINutritionCoachMessage[]
  summaries       AINutritionConversationSummary[]
  escalations     AINutritionSafetyEscalation[]

  @@index([organisationId])
  @@index([memberId])
  @@map("ai_nutrition_coach_conversations")
}

model AINutritionCoachMessage {
  id               String   @id @default(cuid())
  conversationId   String   @map("conversation_id")
  role             String   // USER, ASSISTANT, SYSTEM
  content          String   @db.Text
  structuredOutput Json?    @map("structured_output")
  tokens           Int?
  latencyMs        Int?     @map("latency_ms")
  status           String   @default("COMPLETED")
  createdAt        DateTime @default(now()) @map("created_at")

  conversation     AINutritionCoachConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("ai_nutrition_coach_messages")
}

model AINutritionSafetyEscalation {
  id              String    @id @default(cuid())
  organisationId  String    @map("organisation_id")
  memberId        String    @map("member_id")
  conversationId  String?   @map("conversation_id")
  severity        String    // CAUTION, RECOMMEND_PROFESSIONAL, URGENT_ESCALATION
  category        String    // EATING_DISORDER, EXTREME_RESTRICTION, DANGEROUS_FASTING, ALLERGEN_VIOLATION...
  triggerPhrase   String?   @map("trigger_phrase")
  actionTaken     String    @map("action_taken")
  resolved        Boolean   @default(false)
  createdAt       DateTime  @default(now()) @map("created_at")

  organisation    Organisation                  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  member          MemberProfile                 @relation(fields: [memberId], references: [id], onDelete: Cascade)
  conversation    AINutritionCoachConversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)

  @@index([organisationId])
  @@index([memberId])
  @@index([severity])
  @@index([category])
  @@map("ai_nutrition_safety_escalations")
}
```

---

## 4. Safety Engine & Medical Escalation Matrix

The safety policy is enforced across 9 critical risk categories:

| Category | Trigger Conditions | Action / Response | Escalation Severity |
|---|---|---|---|
| **EATING_DISORDER** | Forced vomiting, purging, laxative abuse, severe food guilt | Terminate pipeline; provide eating disorder helpline numbers (Butterfly Foundation, NEDA); clinical referral | `URGENT_ESCALATION` |
| **EXTREME_RESTRICTION** | Diets <1,000 kcal/day, multi-day starvation, 500 kcal crash plans | Block guidance; explain metabolic disruption & cardiac risks; provide sustainable deficit education | `URGENT_ESCALATION` |
| **DANGEROUS_FASTING** | Prolonged dry fasting, no water and no food for days | Warn of acute dehydration and renal failure; block fasting encouragement | `URGENT_ESCALATION` |
| **DEHYDRATION** | Intentional fluid restriction, sweat suits, diuretic abuse | Block dehydration tactics; reiterate hydration fundamentals | `URGENT_ESCALATION` |
| **PERFORMANCE_ENHANCING_DRUG** | Anabolic steroids, clenbuterol, SARMs, DNP, trenbolone | Strict refusal; redirect to whole-food natural adaptations | `URGENT_ESCALATION` |
| **DISEASE_TREATMENT** | Claims to cure diabetes, cancer, renal disease with food | Non-diagnostic clinical disclaimer; redirect to treating physician | `RECOMMEND_PROFESSIONAL` |
| **MEDICATION_INTERACTION** | Inquiries to cease or alter insulin, metformin, blood pressure pills | Firm prohibition against altering prescription medication | `URGENT_ESCALATION` |
| **ALLERGEN_VIOLATION** | Output containing documented member allergens or injection attempts | Filter out contaminated foods; report safety violation in DB | `URGENT_ESCALATION` |
| **SELF_HARM_RESTRICTION** | Withholding food as punishment | Compassionate emergency refusal & professional counseling referral | `URGENT_ESCALATION` |

---

## 5. Natural Language Food Logging Proposal Workflow

The natural language food logging assistant eliminates manual calorie lookup while strictly guaranteeing data integrity:

```
User Input: "I had 2 large scrambled eggs and a slice of whole wheat toast with butter for breakfast"
       │
       ▼
POST /api/v1/ai/nutrition/food-log/parse
       │
       ▼
AI Parser parses text into structured proposal:
{
  mealType: "BREAKFAST",
  items: [
    { foodName: "Scrambled Eggs", quantity: 2, unit: "large", calories: 144, protein: 12.6, carbs: 0.8, fat: 9.8 },
    { foodName: "Whole Wheat Toast", quantity: 1, unit: "slice", calories: 82, protein: 4.0, carbs: 13.8, fat: 1.1 }
  ],
  totalCalories: 226,
  totalProtein: 16.6,
  requiresConfirmation: true
}
       │
       ▼
Proposal rendered in FoodLogProposalCard on Mobile UI
       │
       ▼ User reviews and clicks "Confirm & Save to Log"
       │
       ▼
POST /api/v1/members/me/nutrition/food-logs (Authoritative Day 16 logging)
```

---

## 6. Read-Only Tools Architecture

Registered tools in `NutritionCoachToolsService`:
1. `get_nutrition_profile`: Fetches dietary patterns, goals, and safety-critical allergens.
2. `get_nutrition_targets`: Returns active daily calories, protein, carbs, fats, and water.
3. `get_current_meal_plan`: Retrieves assigned meal plan, version, daily structure, and meals.
4. `get_recent_food_logs`: Retrieves verified food logs for specified date range.
5. `get_daily_nutrition_summary`: Returns calculated macronutrient totals and adherence percentages.
6. `get_food_alternatives`: Finds allergen-safe whole food substitutions based on macro profiles.
7. `get_training_nutrition_context`: Retrieves workout schedule and recent volume to tailor pre/post-workout nutrition.

---

## 7. Operational Runbook

### Monitoring Health & Performance:
- Endpoint: `GET /api/v1/ai/nutrition/profile` (validates tenant resolution and DB connection).
- Metrics: Token consumption, latency, and cache hit rate tracked in `ai_usage_records`.

### Handling Safety Escalations:
- Any `URGENT_ESCALATION` is logged in `ai_nutrition_safety_escalations` and emitted as an audit event `NUTRITION_COACH_SAFETY_ESCALATION`.
- Staff members can review unresolved escalations through the administration portal to follow up with high-risk members.

### Allergen Zero-Tolerance:
- Allergens stored in `NutritionProfile.allergies` are permanently injected into the context prompt.
- The post-execution filter scrubs any suggestion matching member allergens, ensuring zero accidental allergen exposure.
