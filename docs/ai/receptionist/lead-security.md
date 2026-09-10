# AI Receptionist Lead Security & Privacy Guardrails

## 1. Threat Matrix & Defense Strategy

| Threat Vector | Severity | Mitigation Architecture |
| :--- | :--- | :--- |
| **Prompt Injection to Manipulate Score** | High | LLM output does NOT write the score. `LeadScoringService` runs purely in deterministic backend code. |
| **Cross-Tenant IDOR Attack** | Critical | Every lead lookup and mutation enforces `organisationId`. Attempts to query another tenant throw `NotFoundException`. |
| **Member Privacy Leakage to Prospects** | Critical | Member-scoped read tools (`lookup_my_bookings`, `lookup_member_membership`) strictly require an authenticated `memberProfileId`. Unauthenticated prospects are blocked by `ToolPermissionService`. |
| **Fabricated Marketing Consent** | High | Default consent status is `NOT_REQUESTED`. Transitioning to `GRANTED` requires affirmative conversational evidence with audit source recorded. |
| **PII & Sensitive Health Data Exposure** | Medium | The qualification prompt explicitly prohibits collecting medical conditions, medications, or biometric health metrics during lead intake. |
| **Duplicate Lead & Member Collision** | Medium | `LeadDuplicateService` screens incoming email and phone against both lead and member databases, preventing impersonation or fragmented identities. |

---

## 2. Multi-Tenant Scoping & Enforcement
Every endpoint in `LeadsController` and every tool in `LeadTools` validates the caller's `organisationId`:
```typescript
const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
if (!lead || lead.organisationId !== organisationId) {
  throw new NotFoundException(`Lead ${leadId} not found`);
}
```
Organisations cannot read, list, update, score, or triage leads belonging to another organisation.

---

## 3. Medical & Safety Disclaimers
When prospects mention injuries, pain, or rehabilitation goals, the AI Receptionist provides structured grounding and states:
> "FitCore certified trainers can tailor functional fitness routines, but we always recommend clearing any specific rehabilitation or pain management plans with your physician or physical therapist."
