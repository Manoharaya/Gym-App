# AI Receptionist Foundation — Architecture

## 1. Executive Summary

Day 31 establishes the **FitCore AI Receptionist Foundation**—an omnichannel conversational platform engineered to serve as the front-of-house operational intelligence for gyms and health organizations. The AI Receptionist operates across Website Chat, Mobile Apps, In-App widgets, WhatsApp, and SMS, delivering authoritative responses grounded strictly in verified gym data.

The system is architected around five foundational pillars:
1. **Authoritative Grounded Knowledge**: Answers are grounded directly in structured database records (`MembershipPlan`, `ClassType`, `ClassSession`, `TrainerProfile`, `Outlet`) and curated knowledge sources (`ReceptionistKnowledgeSource`).
2. **Deterministic & Controlled Tools**: AI interactions requiring database queries execute exclusively through an audited, read-only tool whitelist (`lookup_gym_info`, `lookup_operating_hours`, `lookup_classes`, `lookup_class_schedule`, `lookup_trainers`, `lookup_membership_plans`, `lookup_pricing`, `lookup_knowledge_source`).
3. **Multi-Outlet Ambiguity Resolution**: Organizations with multiple facilities trigger automatic disambiguation questions rather than delivering inaccurate or speculative answers.
4. **Safety & Security Perimeter**: Pre-execution adversarial prompt injection defense, PII/payment credential redaction, clinical/medical disclaimers, and tenant boundary enforcement.
5. **Graceful Human Handoff**: Automatic routing and ticket generation (`ReceptionistHandoff`) for complaints, complex inquiries, unknown facilities, or upon explicit customer request.

---

## 2. Architectural Blueprint

```
+----------------------------------------------------------------------------------------------------+
|                                    Omnichannel Ingress Layer                                       |
|  [ Web Chat ]     [ Mobile App ]     [ In-App Widget ]     [ WhatsApp Gateway ]     [ SMS Gateway ]|
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+────────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    AI Receptionist Gateway & Router                                |
|  - Tenant Resolution (x-organisation-id / JWT)                                                     |
|  - Channel Identification & Participant Linkage                                                    |
+────────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+────────────────────────────────────────────────────────────────────────────────────────────────────+
|                                      Safety & Security Perimeter                                   |
|  - Prompt Injection Scanner (Jailbreak / System Prompt Extraction Filter)                          |
|  - PII & Credit Card Sanitizer (PCI-DSS Redaction)                                                 |
|  - Tenant IDOR Barrier                                                                             |
+────────────────────────────────────────────────────────────────────────────────────────────────────+
                         │                                              │
                    [Safe Query]                                  [Malicious / Leak]
                         │                                              │
                         ▼                                              ▼
+──────────────────────────────────────────────+      +──────────────────────────────────────────────+
|          Context Aggregator & Engine         |      |             Neutralized Fallback             |
|  - Organisation Metadata & Outlet Network    |      |  "I can only assist with questions regarding |
|  - Multi-Outlet Ambiguity Evaluator          |      |   our gym facilities, schedules & memberships"|
|  - Customer Identity (Authenticated vs Guest)|      +──────────────────────────────────────────────+
|  - Multi-Turn Conversation Transcripts       |
|  - Hybrid Knowledge Retrieval Engine         |
+──────────────────────────────────────────────+
                         │
                         ▼
+────────────────────────────────────────────────────────────────────────────────────────────────────+
|                                      Central AI Orchestration Layer                                |
|  - AIOrchestratorService (Feature: RECEPTIONIST)                                                   |
|  - PromptRegistryService ('receptionist.v1')                                                       |
|  - Structured Output Schema (Zod / JSON Schema)                                                    |
+────────────────────────────────────────────────────────────────────────────────────────────────────+
                         │
                         ▼
+────────────────────────────────────────────────────────────────────────────────────────────────────+
|                                 Controlled Read-Only Tool Dispatcher                               |
|  - Whitelist: lookup_gym_info, lookup_operating_hours, lookup_classes, lookup_trainers, etc.       |
|  - Mutating Operations (Booking, Cancelling, Payments) -> STRICTLY FORBIDDEN IN DAY 31             |
+────────────────────────────────────────────────────────────────────────────────────────────────────+
                         │
                         ▼
+────────────────────────────────────────────────────────────────────────────────────────────────────+
|                                   Post-Generation Response Validator                               |
|  - Hallucination / Fact Verification                                                               |
|  - Medical / Clinical Symptom Disclaimers                                                          |
|  - Citation Attachment ([sourceType, title, outletId])                                             |
|  - Handoff Recommendation Evaluation                                                               |
+────────────────────────────────────────────────────────────────────────────────────────────────────+
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
+───────────────────+           +───────────────────────────────────────────────+
| Outgoing Response |           |            Human Handoff Pipeline             |
| Transcript Stored |           | - ReceptionistHandoff Created (PENDING)       |
| Tokens & Latency  |           | - Conversation State -> HANDOFF_REQUESTED     |
+───────────────────+           | - Staff Dashboard Triage Notification         |
                                +───────────────────────────────────────────────+
```

---

## 3. Subsystem Breakdown

### 3.1 Conversation Subsystem
* **`ReceptionistConversationService`**: Resolves existing sessions via external channel IDs or database IDs. Manages status transitions: `ACTIVE` -> `HANDOFF_REQUESTED` -> `RESOLVED` -> `CLOSED`.
* **`ReceptionistMessageService`**: Persists conversation transcripts with directional roles (`CUSTOMER`, `AI`, `STAFF`, `SYSTEM`), sequence numbers, metadata (intents, confidence, citations, latency, tokens).
* **`ConversationSummaryService`**: Asynchronously condenses conversation threads into compact staff briefing summaries.

### 3.2 Context Subsystem
* **`OrganisationContextService`**: Retrieves organization name, slug, and outlet network counts.
* **`OutletContextService`**: Retrieves location address, contact info, operating hours, and amenities.
* **`CustomerContextService`**: Links authenticated member profiles, active membership plans, and home outlet.
* **`ReceptionistContextService`**: Aggregates all dimensions into a coherent prompt payload.

### 3.3 Knowledge Subsystem
* **`KnowledgeSourceService`**: Manages `ReceptionistKnowledgeSource` authoring and immutable version history in `ReceptionistKnowledgeVersion`.
* **`KnowledgeRetrievalService`**: Hybrid search engine querying published knowledge sources and live structured database models (`MembershipPlan`, `ClassType`, `TrainerProfile`).
* **`KnowledgeRankingService`**: Ranks snippets based on target outlet specificity, title token match, and relevance scores.
* **`KnowledgeCacheService`**: In-memory cache with organization-level cache invalidation.

### 3.4 Tools Subsystem
* **`ToolPermissionService`**: Validates tool requests against `ALLOWED_RECEPTIONIST_TOOLS`. Prohibits any tool name containing mutation keywords (`book`, `pay`, `cancel`, `update`).
* **Domain Tool Providers**: `OrganisationTools`, `ClassTools`, `TrainerTools`, `MembershipTools`.
* **`ReceptionistToolRegistry`**: Declares JSON function schemas and executes validated tools.

### 3.5 Safety & Guardrails Subsystem
* **`PromptInjectionService`**: Pre-execution regex and heuristic scanner blocking DAN modes, instruction overrides, and prompt extraction.
* **`SensitiveDataFilterService`**: Automatically redacts payment cards and tokens before storage or model prompting.
* **`ResponseValidatorService`**: Attaches mandatory non-clinical disclaimers to queries mentioning injuries, pain, or diagnoses.

### 3.6 Handoff & Triage Subsystem
* **`EscalationService`**: Computes priority levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) based on reason (`COMPLAINT`, `CUSTOMER_REQUESTED`, `UNKNOWN_INFORMATION`, `POLICY_EXCEPTION`).
* **`ReceptionistHandoffService`**: Creates handoff records and allows staff to assign, review, and mark tickets resolved.
