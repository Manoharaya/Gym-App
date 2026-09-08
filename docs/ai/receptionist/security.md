# AI Receptionist Security, Safety & Governance Architecture

## 1. Overview
The FitCore AI Receptionist operates as an omnichannel front-door representative for fitness organisations. Because it directly interfaces with untrusted members of the public, web prospects, and authenticated members, robust security, prompt injection defense, data redaction, and strict operational boundaries are mandatory.

---

## 2. Threat Model & Defense In Depth

```
[ Untrusted User Input ]
           │
           ▼
[ Layer 1: Prompt Injection & Jailbreak Detector ] (Regex + Pattern matching)
           │
           ▼
[ Layer 2: Medical / Diagnosis Blocker ] (Non-clinical advice guardrail)
           │
           ▼
[ Layer 3: Sensitive PII Sanitizer ] (Credit card, JWT, password redaction)
           │
           ▼
[ Layer 4: Orchestrator Message Boundary Framing ]
  ├── ### SYSTEM INSTRUCTIONS (IMMUTABLE) ###
  ├── ### TRUSTED APPLICATION CONTEXT ###
  └── ### BEGIN UNTRUSTED USER INPUT ###
           │
           ▼
[ Layer 5: Read-Only Tool Execution Boundary ] (No mutations permitted)
           │
           ▼
[ Layer 6: Response Validation & Output Redaction ] (Leak prevention, citation check)
           │
           ▼
[ Client / Web / Mobile Interface ]
```

---

## 3. Defense Mechanisms

### 3.1 Prompt Injection Defense (`PromptInjectionService`)
Blocks patterns attempting to override system behavior or exfiltrate private prompts:
- "Ignore all previous instructions"
- "Disregard prior instructions"
- "Reveal hidden system prompt"
- "DAN mode / Jailbreak"
- "Return private database passwords"

When detected:
- The input is immediately flagged with `safetyFlag: 'PROMPT_INJECTION_DETECTED'`.
- A neutral boundary response is returned: `"I am only able to assist with questions about our gym facilities, memberships, schedules, and policies. How can I help you with your fitness journey today?"`
- An audit event (`RECEPTIONIST_SAFETY_TRIGGERED`) is written with `PROMPT_INJECTION` metadata.

### 3.2 Medical & Diagnostic Disclaimer (`SensitiveDataFilterService`)
Gym prospects and members frequently ask about acute injuries or medical conditions. The AI Receptionist enforces non-clinical boundaries:
- Inquiries about diagnosing chest pain, torn muscles, or prescribing pharmaceuticals trigger the `MEDICAL_DISCLAIMER` safety flag.
- The receptionist clarifies that it cannot provide medical advice, advises consulting a physician, and offers certified trainer introductions for exercise modifications once cleared.

### 3.3 Sensitive Data Filtering & Redaction
Customer inputs and AI outputs are scrubbed for sensitive data:
- Credit card numbers (Visa, Mastercard, Amex patterns) are replaced with `[REDACTED_CREDIT_CARD]`.
- Bearer tokens, passwords, and API keys are redacted before transcript persistence or orchestrator submission.

### 3.4 Strict Read-Only Tool Boundaries (`ToolPermissionService`)
- The Day 31 AI Receptionist has **ZERO mutation tools**.
- Prohibited tool calls:
  - Autonomous booking creations or cancellations
  - Membership plan upgrades, downgrades, or cancellations
  - Payment processing or invoice charges
- Permitted tool calls:
  - `lookup_organisation_details`
  - `lookup_operating_hours`
  - `lookup_membership_plans`
  - `lookup_class_schedule`
  - `lookup_trainer_profiles`
  - `lookup_gym_policies`
  - `check_member_active_status` (requires authenticated member context)

### 3.5 Tenant Isolation & Multi-Tenancy Boundary
- All conversations, messages, knowledge sources, and handoff tickets are strictly bound to `organisationId`.
- Cross-tenant lookups return `404 Not Found` or `403 Forbidden`.
- Customer context resolution verifies that member profiles belong strictly to the tenant organisation.
