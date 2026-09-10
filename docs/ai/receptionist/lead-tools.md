# AI Receptionist Lead Tools Specification

## 1. Registered Tools Overview

The AI Receptionist is provisioned with 8 controlled tools in `ReceptionistToolRegistry`:

| Tool Name | Type | Risk Tier | Description |
| :--- | :--- | :--- | :--- |
| `get_lead` | Read | `LOW` | Fetch lead status, score, and contact summary. |
| `get_lead_qualification` | Read | `LOW` | Retrieve structured qualification profile and detected goals. |
| `get_lead_history` | Read | `LOW` | Retrieve activity timeline and interaction events. |
| `get_outlet_lead_information` | Read | `LOW` | Fetch available plans, trial availability, and club amenities for prospects. |
| `create_lead` | Mutation | `MEDIUM` | Create a new lead record from conversational signals. |
| `update_lead_contact` | Mutation | `MEDIUM` | Update name, email, phone, or channel preferences. |
| `update_lead_qualification`| Mutation | `MEDIUM` | Update goals, service interests, readiness, or schedule constraints. |
| `request_lead_handoff` | Mutation | `MEDIUM` | Escalate lead inquiry to staff with reason and notes. |

---

## 2. Tool Parameter Schemas

### `create_lead`
```json
{
  "type": "object",
  "properties": {
    "outletId": { "type": "string" },
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "email": { "type": "string" },
    "phone": { "type": "string" },
    "preferredContactChannel": { "type": "string", "enum": ["EMAIL", "SMS", "WHATSAPP", "PHONE"] },
    "consentStatus": { "type": "string", "enum": ["NOT_REQUESTED", "GRANTED", "DENIED"] },
    "initialGoals": { "type": "array", "items": { "type": "string" } },
    "initialServiceInterests": { "type": "array", "items": { "type": "string" } },
    "initialReadiness": { "type": "string", "enum": ["EXPLORING", "INTERESTED", "READY_TO_TRY", "READY_TO_JOIN"] }
  }
}
```

### `request_lead_handoff`
```json
{
  "type": "object",
  "properties": {
    "leadId": { "type": "string" },
    "reason": { "type": "string" },
    "notes": { "type": "string" }
  },
  "required": ["leadId", "reason"]
}
```

---

## 3. Tool Execution Pipeline
All tool calls pass through:
1. `ToolPermissionService.validateToolExecution`: Verifies whitelist, tenant scope, and risk rules.
2. `LeadDuplicateService.detectDuplicates`: Detects existing leads or active members before creation.
3. `LeadScoringService.calculateScore`: Deterministically recalculates score and factor explanations.
4. `PrismaService`: Persists atomic database updates with audit logging.
