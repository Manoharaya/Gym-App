# AI Receptionist — Controlled Tools & Permission Guardrails

## 1. Architectural Philosophy

The AI Receptionist is restricted to **strict read-only operations** during Day 31. It serves as an informational concierge and receptionist, not an autonomous mutation agent. It cannot book classes, cancel memberships, make financial charges, or modify schedules.

All database queries dispatched by the AI are executed through **Controlled Tools** validated by the `ToolPermissionService`.

---

## 2. Authorized Tool Whitelist

Only the following 8 tools are authorized for execution:

| Tool Name | Parameters | Target Domain | Description |
|---|---|---|---|
| `lookup_gym_info` | `outletId?: string` | `Organisation`, `Outlet` | Retrieves official gym address, contact phone/email, facilities, and overview. |
| `lookup_operating_hours` | `outletId?: string` | `Outlet` | Retrieves standard weekday/weekend hours and announced holiday schedules. |
| `lookup_classes` | `category?: string` | `ClassType` | Retrieves group fitness class catalog, durations, intensity, and capacity. |
| `lookup_class_schedule` | `outletId?: string`, `date?: string` | `ClassSession` | Retrieves upcoming class timetable for a target date with remaining seat capacity. |
| `lookup_trainers` | `outletId?: string`, `specialty?: string` | `TrainerProfile` | Retrieves certified personal training staff, bios, and coaching specializations. |
| `lookup_membership_plans` | None | `MembershipPlan` | Retrieves active membership plans, recurring prices, and access entitlements. |
| `lookup_pricing` | None | `MembershipPlan`, Policy | Retrieves pricing matrix, trial terms, and member guest policies. |
| `lookup_knowledge_source` | `query: string`, `outletId?: string` | `ReceptionistKnowledgeSource` | Searches published knowledge sources for policies, FAQs, parking, and rules. |

---

## 3. Tool Permission Engine (`ToolPermissionService`)

Every tool invocation undergoes validation before any database query executes:

```typescript
// Enforce whitelist
if (!ALLOWED_RECEPTIONIST_TOOLS.includes(toolName)) {
  throw new ForbiddenException(`Tool '${toolName}' is not authorized for AI Receptionist execution.`);
}

// Reject mutation verbs
const forbiddenSubstrings = ['book', 'create', 'update', 'delete', 'cancel', 'pay', 'refund', 'charge'];
for (const forbidden of forbiddenSubstrings) {
  if (toolName.toLowerCase().includes(forbidden)) {
    throw new ForbiddenException(`Mutation tool '${toolName}' is forbidden in Day 31.`);
  }
}

// Enforce Multi-Tenant Isolation
if (inputParams.organisationId && inputParams.organisationId !== organisationId) {
  throw new ForbiddenException('Cross-tenant tool execution violation');
}
```

---

## 4. Multi-Outlet Disambiguation Guardrail

When an organization operates multiple outlets, location-specific questions (such as "What time do you open?") must not arbitrarily guess an outlet.

1. The `ReceptionistContextService` computes `isMultiOutlet: true` and checks if `hasOutletDisambiguated: false`.
2. If ambiguous, the AI responds with clarification:
   > *"We have multiple locations available. Which location are you interested in (e.g., Downtown or Westside)?"*
3. The response sets `requiresClarification: true` and provides `suggestedNextStep`.
4. Once the customer specifies an outlet, the conversation session pins the `outletId`, and all subsequent tool calls use that outlet scope.
