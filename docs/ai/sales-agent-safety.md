# FitCore AI Sales Agent Safety & Guardrails

## Overview
The FitCore AI Sales Agent is equipped with strict deterministic and semantic guardrails implemented in `SalesPolicyService` and verified by automated integration test suites.

---

## 1. Truth in Pricing & Zero Unauthorized Discounts

### The Rule
The AI Sales Agent is **strictly prohibited** from:
- Granting ad-hoc or custom price cuts (e.g. "I can do 50% off if you sign today").
- Inventing discount coupon codes or promising promotional waivers.
- Quoting prices not present in approved, active `MembershipPlan` records in Postgres.
- Modifying plan fee intervals or joining fee terms.

### Implementation
- `SalesPolicyService.evaluateDiscountRequest`: Regex and semantic pattern matching triggers on words like `discount`, `50% off`, `bargain`, `deal`, `negotiate`, `cheaper`, `छुट`.
- In the event of a discount inquiry, the agent delivers an approved standard refusal:
  > *"Our membership pricing is standardized according to official facility policies and we do not offer unauthorized custom discounts. However, we have flexible membership plans and trial options. I would be happy to connect you with our team if you have questions about special packages."*
- DB Invariant: No `Discount` or coupon record is ever created by the sales agent.

---

## 2. Medical Safety Boundary & Clinical Non-Intervention

### The Rule
The AI Sales Agent is a **sales and facility guide, not a medical practitioner, physical therapist, or clinician**. It must:
- NEVER diagnose injuries or medical conditions (e.g., chest pain, herniated disc, tendonitis).
- NEVER prescribe corrective therapy, injury rehab, or clinical protocols.
- Refuse medical triage immediately and instruct the prospect to seek professional medical clearance.

### Implementation
- `SalesPolicyService.evaluateMedicalSafety`: Scans for acute symptoms (`chest pain`, `heart condition`, `torn`, `ruptured`, `surgery`, `fracture`, `concussion`, `dizziness`, `rehab`, `उपचार`).
- When triggered:
  1. Refusal response advising doctor clearance:
     > *"Your health and safety are our top priority. We strongly advise consulting with a qualified healthcare professional before beginning any new exercise routine. I can also connect you directly with our facility staff."*
  2. Automatic `SalesHandoff` creation with priority `HIGH` or `URGENT`.
  3. Lead flagged with safety review tag.

---

## 3. Anti-Hallucination & Grounded Factuality

### The Rule
The agent can only state facts that are explicitly provided in its injected `SalesAIContext`.
- Facilities & Amenities: Sauna, pool, crèche, towel service must only be claimed if listed in `Outlet.amenities`.
- Operating Hours: Opening and closing times must match `Outlet.operatingHours`.
- Trainer Credentials: Personal trainer names and specialties must come from `TrainerProfile`.
- Classes: Class names and times must reflect scheduled `ClassSession` records.

---

## 4. Prompt Injection & Adversarial Defense

### The Rule
Attempts by users to override system prompts, bypass guardrails, simulate developer mode ("DAN"), or leak instructions are neutralised.
- `SalesPolicyService.evaluatePromptSafety`: Detects prompt extraction tokens (`ignore previous instructions`, `system prompt`, `you are now in maintenance mode`, `bypass safety`).
- Neutralizes malicious prompts with standard redirection back to fitness facility queries.
