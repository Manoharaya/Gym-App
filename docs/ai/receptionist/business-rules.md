# FitCore AI Receptionist — Business Rules Engine

## Overview
The receptionist business rule engine ensures that operational gym rules are deterministic and auditable. Core business constraints are never buried inside LLM prompts where they could be bypassed through prompt injection or model hallucination.

---

## Controlled Business Rules

### 1. Human Required for Pricing Exceptions
- **Rule**: `HUMAN_REQUIRED_FOR_PRICING_EXCEPTIONS`
- **Trigger**: Customer asks for custom discounts, special negotiated rates, or fee exemptions.
- **Behavior**: The AI must not invent discounts, promise waivers, or accept custom pricing. An operational staff handoff to `FINANCE` or `OUTLET_MANAGER` is created immediately.

### 2. Human Required for Complaints
- **Rule**: `HUMAN_REQUIRED_FOR_COMPLAINTS`
- **Trigger**: Customer expresses dissatisfaction, negative experiences, facility maintenance issues, or service complaints.
- **Behavior**: The AI expresses empathy and routes the interaction directly to the `OUTLET_MANAGER` queue with `priority: 'HIGH'`.

### 3. Identity Verification for Private Account Records
- **Rule**: `VERIFICATION_REQUIRED_FOR_MEMBER_DATA`
- **Trigger**: Caller/user inquires about membership billing history, payment methods, or personal contact records.
- **Behavior**: Caller must have `identityState === 'VERIFIED_MEMBER'`. Unverified callers must complete verification challenge or speak with authorized front-desk staff.

### 4. Explicit Confirmation for Booking Mutations
- **Rule**: `EXPLICIT_CONFIRMATION_REQUIRED_FOR_BOOKING`
- **Trigger**: Creating, canceling, or rescheduling class sessions.
- **Behavior**: A 2-step confirmation cycle is mandatory. The AI presents clear class details (class name, trainer, date, time) and must receive explicit confirmation (`confirmed: true`) before invoking the booking mutation.

### 5. Consent Required for Outbound Marketing
- **Rule**: `CONSENT_REQUIRED_FOR_MARKETING`
- **Trigger**: Outbound follow-up communication following missed calls or prospect interactions.
- **Behavior**: Outbound marketing is blocked unless explicit consent (`consentStatus === 'GRANTED'`) was previously collected and recorded.

---

## Configuration Inheritance

```text
Organisation Default
        ↓
 Outlet Override (Optional)
        ↓
Effective Configuration
```

- If an outlet specifies custom business hours or greeting messages, the outlet override takes precedence.
- If no outlet override exists, organisation defaults apply.
- Safe fallbacks prevent undefined state:
  - Unknown hours $\rightarrow$ Do not invent; display standard club contact.
  - Unknown pricing $\rightarrow$ State rates are unavailable and offer staff connection.
  - Unknown identity $\rightarrow$ Enforce verification.
