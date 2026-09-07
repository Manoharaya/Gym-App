# Nutrition, Meal Planning & Food Tracking Architecture

## 1. Executive Summary

Day 16 introduces the **Nutrition, Meal Planning & Food Tracking Foundation** for the FitCore platform.
It establishes structured nutrition profiles, dietary preferences, a food library with system-wide verified staples and custom organisation foods, meals, versioned reusable meal plans, member meal-plan assignments, nutrition targets with historical preservation, food logging with immutable nutritional snapshots, hydration tracking, and deterministic daily nutrition summaries.

The system is built on the foundational invariant: **Zero fake analytics or hardcoded demo statistics**. All metrics (calories, protein, carbohydrates, fats, fiber, water, adherence percentages) are computed strictly from real persisted records in `FoodLog`, `WaterLog`, and `NutritionTarget`.

---

## 2. Critical Domain Boundaries

The nutrition domain is decoupled from workout execution, member profile metadata, and progress records:

```text
Member (MemberProfile)
  ├── NutritionProfile (Preferences, dietary patterns, allergies, intolerances)
  │     └── DietaryPreference[]
  ├── NutritionTarget[] (Historical timeline of active & past targets)
  ├── MemberMealPlanAssignment[] (Assigned meal plan with immutable structure snapshot)
  │     └── MealPlan (Organisation-owned, versioned reusable plan)
  │           └── MealPlanDay[]
  │                 └── MealPlanMeal[]
  │                       └── MealPlanFoodItem[] -> Food
  ├── FoodLog[] (Logged consumption with immutable nutrition snapshot)
  │     └── Food (System or Organisation item)
  ├── WaterLog[] (Hydration records)
  └── NutritionSummary[] (Daily persisted and Redis-cached aggregations)
```

### Invariants:
1. **No Merging into `MemberProfile`**: Nutrition data resides in its own tables (`nutrition_profiles`, `nutrition_targets`, `food_logs`, etc.).
2. **No Merging into `ProgressRecord`**: Progress domain can read nutrition rollups as an observer, but nutrition remains the source of truth.
3. **No Merging into `Workout`**: Workouts remain strictly owned by the workout execution domain. Meals may optionally reference a `workoutId` (e.g., pre/post workout context), but workout entities never mutate nutrition tables.

---

## 3. Historical Nutrition Snapshots (Slice 14 & 15)

In real-world SaaS applications, food library items are periodically edited (e.g. manufacturer reformulates ingredients, macronutrient values are revised, or an item is archived).

If food logs only referenced `foodId`, modifying a food in 2026 would retroactively corrupt a member's logged calorie intake from 2024.

### Immutable FoodLog Snapshot:
When a member logs a food item, the backend calculates and snapshots the nutritional contribution directly onto the `FoodLog` row:
- `foodNameAtLog`
- `brandAtLog`
- `calories`
- `protein`
- `carbohydrates`
- `fat`
- `fiber`
- `sugar`
- `sodium`

If the source `Food` is later modified or deleted, the historical `FoodLog` record remains completely explainable and unchanging.

---

## 4. Reusable Meal Plans & Versioning Safety (Slice 10, 11 & 12)

- **Organisation Ownership**: The gym or network owns reusable `MealPlan` templates (e.g., "7-Day High Protein Cutting Plan", "4-Week Keto Primer").
- **Member Assignment**: Members receive a `MemberMealPlanAssignment` pointing to a plan.
- **Snapshot Preservation**: When an assignment is created, a complete JSON snapshot of the plan (`planSnapshot`) is captured. If a trainer later updates the master `MealPlan` (generating version 2), existing active member assignments continue executing against their assigned snapshot until explicitly re-assigned.

---

## 5. Security, RBAC & Sensitive Health Data (Slice 19, 27, 28 & 29)

Nutrition profiles often contain declared allergies, food intolerances, and religious or cultural restrictions. This data is categorized as **sensitive personal health information**.

### Access Control Rules:
- **`SUPERADMIN`**: Platform-wide access.
- **`ORGANISATION_OWNER`**: Scoped to organisation members.
- **`OUTLET_MANAGER`**: Scoped to members enrolled in matching outlets (`MemberOutlet`).
- **`TRAINER`**: Strictly limited to members with an active `TrainerClientAssignment`. Accessing unassigned members results in `403 TRAINER_UNASSIGNED_CLIENT`.
- **`MEMBER`**: Self-access only (`actor.id == member.userId`).
- **`FINANCE`**: **Strictly 0 access**. Blocked with `403 ACCESS_DENIED_FINANCE_RESTRICTION`.
- **`RECEPTION`**: **Strictly 0 access**. Blocked with `403 ACCESS_DENIED_RECEPTION_RESTRICTION`.

---

## 6. Daily Nutrition Summary & Adherence Formula (Slice 16 & 17)

Daily summaries are computed deterministically from real `FoodLog` and `WaterLog` entries:

$$\text{totalCalories} = \sum_{\text{log} \in \text{foodLogs}} \text{log.calories}$$
$$\text{calorieAdherencePct} = \begin{cases} 0 & \text{if } \text{target.dailyCalories} = 0 \\ \text{round}\left(\frac{\text{totalCalories}}{\text{target.dailyCalories}} \times 100\right) & \text{otherwise} \end{cases}$$

Adherence percentages are computed similarly for protein, carbohydrates, fats, and water.

### Neutral Language:
Target adherence is reported neutrally as a percentage. The platform does NOT diagnose medical malnutrition, prescribe therapeutic diets, or imply that reaching a target equates to medical treatment.

---

## 7. Caching & Invalidation Architecture (Slice 37)

- **Cache Keys**: Partitioned by tenant and member:
  `org:{orgId}:member:{memberId}:nutrition:summary:{dateStr}`
- **TTL**: 300 seconds (5 minutes).
- **Event-Driven Invalidation**: Whenever a member logs a food, deletes a food log, or records water, the Redis cache key for that specific date is immediately evicted (`redis.del`).

---

## 8. Future AI Boundary (Slice 45 & 46)

The schema and API contracts are structured to serve as clean inputs for future AI features (such as AI Meal Planners, automated macro balancing, and AI Nutrition Coaches).

However:
- **No AI generation is implemented in Day 16.**
- **No automated disease-specific diets or medical prescriptions are provided.**
- The future AI layer will act as an external consumer of structured nutrition data rather than embedding uncontrolled LLM generation into primary transactional tables.
