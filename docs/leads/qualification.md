# Progressive Lead Qualification & Signal Extraction

## 1. Overview
Progressive qualification enriches a lead record incrementally over conversational turns without interrogating the prospect or demanding an exhaustive form upfront.

---

## 2. Qualification Dimensions

| Dimension | Possible Values | Extraction Signals |
| :--- | :--- | :--- |
| **Goals** | `strength`, `weight_loss`, `muscle_gain`, `cardio`, `general_health`, `rehab` | Keywords like "lose weight", "bench press", "tone up", "तौल घटाउने" |
| **Service Interests** | `MEMBERSHIP`, `PERSONAL_TRAINING`, `GROUP_CLASSES`, `TRIAL`, `TOUR` | Questions about PT packages, yoga schedule, free trial |
| **Readiness Level** | `EXPLORING`, `INTERESTED`, `READY_TO_TRY`, `READY_TO_JOIN` | "Can I start Monday?" -> `READY_TO_JOIN`, "Just looking" -> `EXPLORING` |
| **Preferred Schedule** | `EARLY_MORNING`, `MORNING`, `AFTERNOON`, `EVENING`, `WEEKEND`, `FLEXIBLE` | "After work", "6am before office", "बिहान" |
| **Price Sensitivity**| `PRICE_SENSITIVE`, `VALUE_FOCUSED`, `FLEXIBLE` | Inquiring about cheapest plan vs. all-inclusive amenities |
| **Objections** | `PRICE`, `TIME_COMMITMENT`, `DISTANCE`, `CHILDCARE` | "Too expensive", "I work late", "Need parking" |

---

## 3. Grounded Prompt Extraction
The `lead_qualification.v1` prompt schema enforces valid output structure:
```json
{
  "qualificationStatus": "QUALIFIED",
  "detectedGoals": ["strength", "weight_loss"],
  "serviceInterests": ["PERSONAL_TRAINING", "GROUP_CLASSES"],
  "preferredSchedule": "EVENING",
  "readiness": "READY_TO_JOIN",
  "priceSensitivity": "VALUE_FOCUSED",
  "objections": [],
  "missingInformation": [],
  "recommendedNextAction": "OFFER_TRAINER_INFORMATION",
  "confidence": 0.94,
  "evidence": [
    {
      "observation": "Customer explicitly stated goal to build muscle with personal trainer.",
      "inferred": false,
      "source": "conversation_transcript"
    }
  ],
  "aiSummary": "Prospect seeking evening personal training with high readiness."
}
```

---

## 4. Fallback Heuristics
If the LLM provider fails, times out, or returns non-conforming JSON, `LeadQualificationService` automatically executes a deterministic keyword parser ensuring high availability.
