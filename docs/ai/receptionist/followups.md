# FitCore AI Receptionist — Follow-Up Tasks & Callbacks

## Overview
When an interaction cannot be immediately or fully resolved through AI self-service or live transfer, the receptionist workflow engine creates operational tasks and callback requests for club staff.

---

## Receptionist Follow-Up Tasks (`ReceptionistFollowUpTask`)

### Lifecycle States
- `OPEN`: Task created, awaiting staff triage or auto-assignment.
- `ASSIGNED`: Routed to an active staff member based on role or outlet.
- `IN_PROGRESS`: Staff member has opened and is actively working on the task.
- `COMPLETED`: Staff member contacted the member/lead and recorded an operational outcome.
- `DISMISSED`: Inquiry was resolved through an alternative channel or not required.
- `EXPIRED`: Task exceeded configured operational SLA window.

### Permitted Follow-Up Outcomes
- `CUSTOMER_CONTACTED`
- `BOOKING_CREATED`
- `LEAD_UPDATED`
- `QUESTION_RESOLVED`
- `CALLBACK_COMPLETED`
- `TRANSFERRED`
- `NO_RESPONSE`
- `NOT_REQUIRED`
- `OTHER`

> [!IMPORTANT]
> The AI never marks follow-up tasks as completed. Task completion is an authoritative staff action recorded in the platform audit log.

---

## Customer Callback Requests (`CallbackRequest`)

Customers may request a callback via any channel or as a fallback when live transfer fails.

### Fields
- `preferredChannel`: `PHONE`, `WHATSAPP`, `SMS`, `EMAIL`.
- `preferredTime`: Date/time window or unstructured customer preference note (e.g. "Tomorrow morning between 9 AM and 11 AM").
- `status`: `REQUESTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `SCHEDULED` $\rightarrow$ `COMPLETED` / `CANCELLED` / `EXPIRED`.
- `assignedStaffId`: Active staff member responsible for executing the callback.

---

## Missed & Abandoned Call Follow-Up Invariant

1. **Missed Call (`NO_ANSWER`)**:
   - The caller phone is cross-referenced with active member and lead records.
   - If identified as a member or consented lead, a structured callback request and staff follow-up task are created.
   - **Zero unsolicited automated marketing messages are dispatched to unknown callers without prior consent.**
2. **Abandoned Call**:
   - Customer disconnects prematurely.
   - `RECEPTIONIST_INTERACTION_ABANDONED` event is emitted to Day 30 Automation Engine for engagement evaluation.
