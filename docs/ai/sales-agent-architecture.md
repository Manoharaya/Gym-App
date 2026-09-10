# FitCore AI Sales Agent Architecture

## Architectural Principles

1. **AI as Consultative Advisor, Not Autonomous Closer**:
   The AI Sales Agent can inform, discover needs, answer questions from verified truth, qualify leads, and recommend plans or next actions. It is fundamentally barred from altering database prices, issuing custom discounts, executing contracts, or taking payment credentials.

2. **Omnichannel Neutrality**:
   The underlying domain logic is completely channel-agnostic. Whether an interaction originates via Web Chat, WhatsApp, SMS, Walk-In kiosk, or Receptionist Transfer, identical pricing integrity, needs discovery, and qualification rules apply.

3. **Grounding in Authoritative Business Context**:
   No business information (operating hours, class times, trainer bios, prices, cancellation policies) is synthesized by the LLM from training memory. All facts are injected dynamically from Postgres within a token budget.

4. **Bi-Directional Lead Synchronization**:
   Discovered buyer attributes (goals, readiness, budget, schedule) automatically synchronize with Day 33's `LeadQualificationProfile` and `Lead` models, ensuring a single source of truth across sales and operations.

---

## Component Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Omnichannel Inbound                             │
│               [Web Chat]  [WhatsApp]  [SMS]  [Walk-In]                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    SalesAgentController (REST API)                     │
│               /api/v1/ai/sales/conversations/:id/messages              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          SalesAgentService                             │
│                  (Conversational Pipeline Orchestrator)                │
└───────┬───────────────────┬───────────────────┬──────────────────┬─────┘
        │                   │                   │                  │
        ▼                   ▼                   ▼                  ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐  ┌─────────────┐
│  SalesPolicy  │   │  SalesContext │   │  SalesTool    │  │SalesHandoff │
│  Service      │   │  Service      │   │  Registry     │  │Service      │
│  - Discounts  │   │  - Plans      │   │  - DB Reads   │  │- Staff Alerts│
│  - Medical    │   │  - Schedules  │   │  - Lead Sync  │  │- Receptionist│
│  - Injections │   │  - Policies   │   │  - NextActions│  │  Delegation │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘  └──────┬──────┘
        │                   │                   │                 │
        └───────────────────┼───────────────────┘                 │
                            ▼                                     ▼
             ┌─────────────────────────────┐           ┌─────────────────┐
             │    ModelGatewayService      │           │ Notification-   │
             │   Prompt: sales_agent.v1    │           │ Orchestrator-   │
             │   Provider: Development/    │           │ Service (Day 28)│
             │             OpenAI/Claude   │           └─────────────────┘
             └──────────────┬──────────────┘
                            │
                            ▼
             ┌─────────────────────────────┐
             │       Postgres / Prisma     │
             │ - SalesConversation         │
             │ - SalesRecommendation       │
             │ - SalesNextAction           │
             │ - SalesHandoff              │
             │ - Lead & QualificationProfile│
             └─────────────────────────────┘
```

---

## Conversational Lifecycle Pipeline

1. **Inbound Ingestion**: Prospect message is ingested and stored as `INBOUND` in `SalesConversationMessage`.
2. **Policy Evaluation**: `SalesPolicyService` executes deterministic regex and semantic tests for unauthorized discount demands, prompt injection attempts, and medical/injury declarations.
3. **Context Grounding**: `SalesContextService` aggregates approved plans, public schedule sessions, certified trainer bios, facility operating hours, and active promotions for the tenant.
4. **Model Gateway Execution**: Executes registered prompt `sales_agent.v1` with JSON schema enforcement.
5. **Entity & Need Extraction**: Discovered goals, schedule preferences, experience level, readiness tier, and price sensitivity are stored on `SalesConversation`.
6. **Lead Qualification Synchronization**: `SalesQualificationService` maps discovery data to `LeadQualificationProfile` via `LeadsService.updateQualification`.
7. **Recommendation & Action Persistence**: Grounded recommendations and suggested next actions (`BOOK_TRIAL`, `BOOK_TOUR`, `CONNECT_WITH_STAFF`) are saved.
8. **Delegation / Escalation**: If handoff is required, `SalesHandoffService` triggers staff notification or delegates to the Receptionist Booking Engine.
