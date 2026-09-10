# FitCore AI Receptionist — Operations Dashboard & Staff Inbox

## Overview
The Receptionist Operations Dashboard and Staff Inbox provide club managers, receptionists, and finance personnel with real-time operational visibility, queue triage, and analytics across all channels.

---

## Receptionist Staff Inbox (`GET /api/v1/receptionist/inbox`)

A consolidated operational queue for club staff:
- **Triage Items**:
  - `HANDOFF`: Customer conversations requiring immediate human staff takeover.
  - `FOLLOW_UP`: Operational tasks created by AI or staff following an unresolved interaction.
  - `CALLBACK`: Customer callback requests with preferred time windows and channels.
- **Filters**:
  - `outletId`: Restricts queue to staff's assigned outlet.
  - `priority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`.
  - `status`: Filter by state (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `SCHEDULED`).
  - `type`: `HANDOFF`, `FOLLOW_UP`, `CALLBACK`, `ALL`.
  - `assignedStaffId`: View tasks assigned specifically to the authenticated staff member.

---

## Receptionist Operational KPIs (`GET /api/v1/receptionist/analytics`)

The dashboard aggregates operational performance without causal revenue speculation:
- **Total Interactions**: Total volume of customer contacts handled by the AI layer.
- **Resolved Interactions & Resolution Rate**: Percentage of interactions successfully resolved via self-service.
- **Handoff Count & Handoff Rate**: Percentage of conversations transitioned to staff.
- **Callback Requests**: Volume of callback tickets generated.
- **Missed Calls & Abandoned Calls**: Volume of unanswered inbound phone calls and early hang-ups.
- **Leads Created & Leads Qualified**: Prospective members identified and qualified through receptionist workflows.
- **Bookings Created & Failures**: Classes booked through AI self-service and booking denial rates.
- **Channel Breakdown**:
  - Voice
  - Web Chat
  - WhatsApp
  - SMS
  - Email

---

## Role-Based Access Control (RBAC)

- **Reception**: View assigned interactions, open handoffs, and outlet callbacks.
- **Trainer**: View interactions and client handoffs relevant to assigned clients.
- **Finance**: View billing and payment exception handoffs; no unrestricted access to general member conversations.
- **Outlet Manager**: Full visibility and reassignment authority across all outlet queues and analytics.
- **Organisation Owner**: Multi-outlet aggregation and organisation-wide policy configuration.
- **Superadmin**: Platform-level oversight.
