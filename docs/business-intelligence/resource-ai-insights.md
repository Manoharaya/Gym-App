# Resource AI Advisory & Prompt Defense

## 1. Overview
The Resource AI Advisory module integrates with the FitCore AI Gateway (`ModelGatewayService`) using prompt definition `RESOURCE_CAPACITY_INTELLIGENCE_PROMPT_DEFINITION` (v1.0.0). It converts multidimensional capacity, attendance, fill rate, and waitlist metrics into actionable executive intelligence while enforcing strict advisory guardrails.

---

## 2. Advisory Safety Guarantees

1. **Non-Causal Language**:
   - The AI agent is prohibited from asserting absolute causality (e.g., *"Trainer X caused low attendance"*).
   - Must use observational and advisory language (e.g., *"Lower attendance correlates with midday scheduling; management may investigate member commuting patterns"*).
2. **Grounded Mathematical Evidence**:
   - Every claim is tied to verified database metrics passed in the prompt payload (`overallRoomUtilisation`, `overallTrainerUtilisation`, `overallClassFillRate`, `overallAttendanceUtilisation`, `activeBottlenecksCount`).
3. **Bilingual English & Nepali Support**:
   - Responds natively in English (`en`) or Nepali (`ne`) depending on tenant preference or request payload.
   - Example Nepali Output:
     `"सुविधा स्रोत व्यवस्थापन: कोठा/स्टुडियो उपयोगिता ७५% र प्रशिक्षक उपयोगिता ६८% मा सञ्चालित छ।"`

---

## 3. Adversarial Prompt Injection Defense
Interactive queries submitted to `POST /api/v1/resource-capacity-intelligence/ai/insights` are screened for prompt injection and destructive command execution attempts:
- Keywords screened: `ignore previous instructions`, `system prompt`, `override`, `delete schedule`, `fire trainer`, `cancel class`, `invent metric`.
- **Refusal Behavior**: Instead of breaking with a 400 error, the service returns an explicit structured refusal response:
  ```json
  {
    "summary": "I cannot perform destructive operational actions or modify schedules. I can only provide advisory capacity insights grounded in verified FitCore operational resource metrics.",
    "isRefusal": true,
    "isGrounded": true,
    "confidenceScore": 1.0,
    "recommendedActions": ["Manage operational schedules and personnel via designated administrative controls."]
  }
  ```
