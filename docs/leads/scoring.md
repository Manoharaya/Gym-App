# Deterministic Lead Scoring Engine

## 1. Objective
Provide a transparent, explainable 0–100 numerical score indicating sales conversion likelihood. The scoring engine runs entirely in deterministic TypeScript inside `LeadScoringService`, completely isolated from LLM direct manipulation.

---

## 2. Factor Weights & Mathematical Breakdown

The maximum theoretical score is 100 points, clamped between 0 and 100:

### 1. Service Interest (Max 25 pts)
- `MEMBERSHIP_INTEREST`: **+25 pts** (Explicit intent for gym membership)
- `PT_INTEREST`: **+20 pts** (High-margin personal training inquiry)
- `CLASSES_INTEREST`: **+15 pts** (Group fitness inquiry)
- `TRIAL_OR_TOUR_INTEREST`: **+15 pts** (Introductory pass request)

### 2. Readiness Level (Max 25 pts)
- `READINESS_READY_TO_JOIN`: **+25 pts** (Immediate purchase intent)
- `READINESS_VISIT_OR_TRY`: **+20 pts** (Wants to trial or visit this week)
- `READINESS_INTERESTED`: **+10 pts** (Active questions, evaluating options)
- `READINESS_EXPLORING`: **+5 pts** (Early preliminary inquiry)

### 3. Contact & Consent (Max 25 pts)
- `VALID_EMAIL_PROVIDED`: **+10 pts** (Valid RFC 5322 format)
- `VALID_PHONE_PROVIDED`: **+10 pts** (Valid numeric format >= 7 digits)
- `COMMUNICATION_CONSENT_GRANTED`: **+5 pts** (Affirmative consent recorded)

### 4. Location & Schedule Preferences (Max 15 pts)
- `PREFERRED_OUTLET_SELECTED`: **+8 pts** (Tied to a specific club)
- `PREFERRED_SCHEDULE_DEFINED`: **+7 pts** (Identified training window)

### 5. Goals & Experience (Max 15 pts)
- `FITNESS_GOALS_DECLARED`: **+10 pts** (Identified >= 1 primary goal)
- `EXPERIENCE_LEVEL_DISCLOSED`: **+5 pts** (Beginner, Intermediate, Advanced)

### 6. Penalties & Friction
- `UNRESOLVED_OBJECTIONS`: **-15 pts** (Active price or distance objection)

---

## 3. Score Tiers & Visual Presentation

| Score Range | Tier | Color Code | Staff Triage Recommendation |
| :--- | :--- | :--- | :--- |
| **70 – 100** | High Intent | Green (`#4CAF50`) | Immediate priority callback within 15 minutes. |
| **40 – 69** | Moderate Intent | Orange (`#FF9800`) | Day 28 automated nurture email/SMS sequence. |
| **0 – 39** | Exploratory | Grey (`#9E9E9E`) | Retain for newsletter or seasonal promotion. |

---

## 4. Score Factor Explanations
Every calculation persists the complete array of `LeadScoreFactor` items:
```json
[
  {
    "factor": "VALID_EMAIL_PROVIDED",
    "points": 10,
    "description": "Valid email contact provided"
  },
  {
    "factor": "READINESS_READY_TO_JOIN",
    "points": 25,
    "description": "Prospect indicated immediate readiness to sign up"
  }
]
```
Staff members can inspect these factors directly in the mobile console to understand why a prospect was scored high or low.
