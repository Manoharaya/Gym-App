# FitCore AI Receptionist — Production Workflows

## Overview
Day 35 implements the production workflow layer for the FitCore AI Receptionist, transforming conversational and voice interactions into an auditable, multi-tenant, business operating workflow:

```text
CUSTOMER CONTACT (Web / WhatsApp / SMS / Email / Voice)
       ↓
AI RECEPTIONIST (Brevity, Natural-Language Understanding, Structured Extraction)
       ↓
BUSINESS RULES & CONTROLLED TOOLS (Booking, Lead Capture, Knowledge)
       ↓
OPERATIONAL OUTCOME (Authoritative Resolution & Structured Summary)
       ↓
STAFF NOTIFICATION (Day 28 Notification Engine)
       ↓
FOLLOW-UP WORKFLOW (Operational Tasks & Callback Requests)
       ↓
AUTOMATION ENGINE (Day 30 Idempotent Event Triggering)
       ↓
STAFF OPERATIONS INBOX & OPERATIONAL ANALYTICS
```

---

## Canonical Receptionist Interaction Model

All inbound and outbound touchpoints map to the canonical `ReceptionistInteraction`:
- **ID**: `cuid`
- **Organisation & Outlet Isolation**: Strict multi-tenant boundaries.
- **Channel**: `WEB`, `WHATSAPP`, `SMS`, `EMAIL`, `VOICE`.
- **Status Lifecycle**:
  - `ACTIVE`: Conversation or call is ongoing.
  - `COMPLETED`: Inbound inquiry resolved and verified.
  - `ABANDONED`: Customer disconnected before resolution.
  - `FAILED`: Technical or provider execution error.
  - `HANDED_OFF`: Escalated or transferred to human staff.
  - `FOLLOW_UP_REQUIRED`: Customer requested callback or unresolved inquiry queued for staff.
- **Outcome & Source**:
  - Structured outcomes: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `WAITLIST_JOINED`, `LEAD_CREATED`, `LEAD_QUALIFIED`, `STAFF_HANDOFF`, `CALLBACK_REQUESTED`, `INFORMATION_PROVIDED`, `UNRESOLVED`, `FAILED`.
  - Outcome source: `AI`, `CUSTOMER`, `STAFF`, `SYSTEM`.

---

## Core Operational Rule: Zero Unverified Success Claims

The AI is strictly prohibited from claiming success (e.g. "Done" or "I've booked your spot") unless the backend domain service has authoritatively executed and returned a verified record. If verification fails, the AI must truthfully respond:
> "I'm unable to confirm that booking in our system right now."
or
> "I wasn't able to complete that. Would you like me to connect you with our team?"

---

## Channel-Neutral Context

Workflows evaluate business rules through a unified `ReceptionistWorkflowContext`:
- Identical cancellation, booking, and handoff policies apply whether the customer contacts via WhatsApp, SMS, web chat, or phone.
- Prevents channel-specific drift or security loopholes.
