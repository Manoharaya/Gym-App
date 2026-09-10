# FitCore Sales Intelligence & Conversion Analytics

## 1. Executive Summary

The **Sales Intelligence Engine** (Day 40) is FitCore's read-oriented, multi-tenant analytics layer. It bridges the authoritative transactions generated across Lead Capture (Day 33), AI Receptionist (Day 35), AI Sales Agent (Day 36), Commercial Sales Pipeline (Day 37), AI Lead Qualification (Day 38), and Automated Follow-Up (Day 39) into a unified, permission-controlled executive dashboard.

```
┌─────────────────────────────────────────────────────────────┐
│                 AUTHORITATIVE DOMAIN DATA                   │
│   Leads · Qualifications · Opportunities · Bookings · FUP   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 SALES ANALYTICS DATA LAYER                  │
│    Timezone normalization · Date boundaries · Groupings     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 CANONICAL METRIC DEFINITIONS                │
│    Explicit denominators · Speed-to-lead · Conversion %     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PERMISSION & TENANT FILTER                  │
│   Superadmin · Org Owner · Outlet Manager · Staff · Member  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   DASHBOARD API & CLIENTS                   │
│         REST Endpoints · Mobile Screens · CSV Export        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 ADVISORY AI SALES INSIGHTS                  │
│       Prompt 'sales_intelligence.v1' · Anti-Fabrication     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architecture & Operating Principles

### 2.1 The Observation Invariant
The sales intelligence module is strictly read-oriented. It queries and aggregates live transactional records without ever mutating:
- Leads or qualification scores
- Sales opportunity stages or owners
- Bookings, trials, or tours
- Active memberships or payment records
- Automated follow-up enrollments or step executions

### 2.2 Strict Tenancy Hierarchy
All requests resolve scope server-side from user session context:
- **Platform Scope (Superadmin)**: Aggregates across the entire FitCore gym network or specific selected organisations.
- **Organisation Scope (Organisation Owner)**: Aggregates all authorised outlets under the organisation; enables multi-branch network comparisons.
- **Outlet Scope (Outlet Manager / Reception)**: Confined strictly to the user's authorised outlet(s). Any request for unauthorized branch data is rejected with HTTP 403 Forbidden.
- **Staff Scope (Sales Staff / Trainer)**: Restricted to assigned opportunities and leads (`ownerStaffId`).
- **Member Rejection**: Members attempting to query sales intelligence are immediately rejected with HTTP 403 Forbidden.

### 2.3 Non-Causal Observational Attribution
The engine tracks business outcomes observationally:
- `conversion_following_follow_up`: A prospect converted after receiving follow-up touchpoints.
- `conversion_following_ai_interaction`: A prospect converted after consultative AI conversations.
- Zero causal overclaims: The system never claims that AI or follow-up messaging was the solitary cause of conversion.

### 2.4 Day 41 Financial Boundary
- Day 40 computes estimated commercial opportunity values (`estimatedPipelineValue`, `convertedOpportunityValue`).
- Cash revenue reconciliation, billing cycles, recurring direct debits, and invoice audits belong strictly to Day 41 (Financial Intelligence Foundation).
