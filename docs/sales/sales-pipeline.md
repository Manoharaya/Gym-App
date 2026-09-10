# FitCore Sales Pipeline & Opportunity Management Guide

## 1. Overview & Business Purpose
The **FitCore Sales Pipeline** provides a structured, multi-tenant commercial operating model that translates prospect interest into verified paying members.

```text
PROSPECT CONTACT (Web, Voice, WhatsApp, Walk-in)
       │
       ▼
DAY 33 LEAD CAPTURE & SCORING
       │
       ▼
DAY 36 AI SALES AGENT / STAFF TRIAGE
       │
       ▼
DAY 37 SALES PIPELINE OPPORTUNITY
  ├── Staging: NEW ──► CONTACTED ──► QUALIFIED ──► TRIAL ──► TOUR ──► OFFERED
  ├── Tasks: High-priority follow-ups with scheduled nextActionAt
  ├── Activities: Automated timeline of calls, notes, stage transitions
  └── Outcomes: Authoritative CONVERTED vs. Structured LOST
```

---

## 2. Core Entities & Separation of Concerns
1. **`Lead` (Contact / Person)**: Represents individual identity, communications consent, fitness goals, and cumulative qualification profile.
2. **`SalesOpportunity` (Deal / Deal Cycle)**: Represents an active commercial deal associated with a lead and pipeline. Features target revenue (`estimatedValue`), owner staff, probability, stage velocity, and optimistic concurrency versioning.
3. **`SalesPipeline` (Process Workflow)**: Multi-tenant container of ordered stages (`SalesPipelineStage`), custom display colors, and stage SLAs.

---

## 3. Authoritative Conversion Invariant
AI agents and background automations **cannot** mark opportunities `CONVERTED`. Conversion must be authoritatively backed by:
- An active `MemberMembership` record ID,
- An official `MembershipPlan` purchase, or
- A verified staff override with mandatory commercial notes.

Upon verified conversion, the parent `Lead.status` is synchronized to `CONVERTED`.

---

## 4. REST API Reference (`/api/v1/sales`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pipelines/default` | Get or auto-seed canonical 8-stage pipeline |
| `POST` | `/pipelines` | Create custom pipeline |
| `GET` | `/pipelines` | List all organization pipelines |
| `POST` | `/opportunities` | Create deal (duplicate-prevention enabled) |
| `GET` | `/opportunities` | Filter deals by stage, outlet, staff, staleness |
| `GET` | `/opportunities/:id` | Fetch deal with full timeline, tasks, and history |
| `PATCH` | `/opportunities/:id` | Update deal title, value, or owner staff |
| `POST` | `/opportunities/:id/transition` | Atomic stage transition (optimistic locking) |
| `POST` | `/opportunities/:id/convert` | Authoritative conversion with proof verification |
| `POST` | `/opportunities/:id/reopen` | Reopen lost deal with rationale |
| `POST` | `/opportunities/:id/activities` | Log sales activity (call, note, email) |
| `POST` | `/opportunities/:id/tasks` | Schedule follow-up task |
| `PATCH` | `/tasks/:id` | Complete or update follow-up task |
| `GET` | `/board` | Real-time Kanban board grouped by stage |
| `GET` | `/metrics` | Sales funnel velocity, win rate, and metrics |
