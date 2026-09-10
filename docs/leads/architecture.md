# FitCore Lead Acquisition & Qualification Architecture

## 1. Executive Summary
The FitCore Lead domain powers intelligent prospect acquisition, conversational qualification, deterministic scoring, and sales triage. It connects the conversational front-end (AI Receptionist across Web, WhatsApp, Mobile, and SMS) with gym sales operations and downstream automation workflows (Day 28 Communications and Day 30 Automations).

---

## 2. Architectural Principles

1. **Prospect ≠ Member ≠ User**:
   A lead is an unauthenticated prospective customer. Leads never have direct database access, login credentials, or member entitlements until explicit contract signing and conversion.
2. **Deterministic & Explainable Scoring**:
   AI extracts semantic signals (goals, schedule, readiness); backend business logic scores leads deterministically from 0 to 100 with clear arithmetic factor breakdowns.
3. **Anti-Fabrication & Strict Consent**:
   Marketing consent defaults to `NOT_REQUESTED`. Only affirmative user statements allow transitioning to `GRANTED` with cryptographic timestamps and sources.
4. **Tenant Isolation**:
   Every lead, qualification profile, and activity belongs strictly to an `organisationId`. Cross-tenant queries are rejected with `NotFoundException`.
5. **Human-in-the-Loop Operations**:
   High-friction interactions, complex corporate requests, or explicit customer demands trigger immediate handoffs to gym staff with full context preservation.

---

## 3. High-Level Flow Diagram

```text
Visitor Conversation (Web / App / WhatsApp)
               │
               ▼
   [Intent & Entity Detection]
   (LEAD_INTEREST, TRIAL_INQUIRY, PT_INQUIRY)
               │
               ▼
    [Duplicate & Member Check] ──────────► If Member: Route to Member Portal
               │
          If New Lead
               │
               ▼
     [Contact Validation]
   (Email regex, E.164 phone)
               │
               ▼
  [Progressive Qualification]
   (Goals, Schedule, Readiness)
               │
               ▼
    [Deterministic Scoring] ─────────────► Compute 0–100 Score + Factors
               │
               ▼
   [Next Best Action Engine] ────────────► Rule-based Action (OFFER_TRIAL, etc.)
               │
               ▼
    [Activity Timeline & CRM] ───────────► Staff Mobile Console & Push Alerts
               │
               ▼
  [Downstream Automations] ──────────────► Day 28 Email/SMS & Day 30 Engine
```

---

## 4. Key Components

| Component | Responsibility |
| :--- | :--- |
| `LeadsService` | Master orchestration for lead creation, updates, lifecycle transitions, and staff assignment. |
| `LeadDuplicateService` | Contact signal normalization and duplicate/existing member disambiguation. |
| `LeadQualificationService`| AI-assisted conversational signal extraction with prompt registry grounding. |
| `LeadScoringService` | Deterministic scoring engine evaluating weights and explainable factors. |
| `LeadNextActionService` | Rule-first decision matrix calculating next best actions and channel routes. |
| `ReceptionistToolRegistry` | Safe invocation dispatch for AI Receptionist lead tools with risk-tier permission checks. |
| `ReceptionistAdminScreen` | Mobile staff triage dashboard with funnel metrics, score badges, and lead detail inspection. |
