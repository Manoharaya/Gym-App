# FitCore Architecture: AI Platform Foundation, Model Gateway, Context Engine & AI Safety

## 1. Executive Summary & Objective
Day 19 establishes the production-grade **AI Platform Foundation** for FitCore. This architecture is the single, non-bypassable entry point for all intelligent workflows across the platform, including future AI capabilities:
- AI Fitness Coach (Day 20+)
- AI Nutrition Coach
- AI Receptionist & Front-Desk Conversational Agent
- AI Sales & Lead Engagement
- AI Retention & Churn Prediction
- AI Marketing Automation
- Gamification & Habit Intelligence

### Strict Constraints & Boundaries
1. **Strictly Zero Ad-Hoc LLM Calls**: Individual application modules, backend services, mobile apps, or web components must NEVER directly import or call OpenAI, Anthropic, or Gemini SDKs. All AI interactions MUST route through the centralized `AIOrchestratorService` and `ModelGatewayService`.
2. **Infrastructure Only**: Strictly ZERO implementation of specific domain agents (fitness coach, nutrition planner, receptionist, sales bot, churn predictor) on Day 19.
3. **Scoped Feature Rollout**: Only `AI_PLATFORM_TEST` is enabled by default. All future feature flags default to disabled (`false`).
4. **Deterministic Development Provider**: The system includes a fully functional `DevelopmentAIProvider` that generates deterministic, schema-valid mock responses without external network requests or API costs.
5. **Zero-Trust Privacy**: The AI context engine strictly redacts raw PAR-Q submissions, health screening forms, medical clearance records, doctor notes, trainer private notes, user passwords, refresh tokens, and credit card/payment details.
6. **No Medical Advice / Diagnostic Liability**: The safety engine blocks clinical diagnostic requests, medical prescription generation, and treatment plans, enforcing disclaimers and professional human referral.

---

## 2. Centralized AI Gateway Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                  Client (Mobile / Web)                      │
 └──────────────────────────────┬──────────────────────────────┘
                                │ HTTPS / JWT (Tenant-Scoped)
                                ↓
 ┌─────────────────────────────────────────────────────────────┐
 │                Centralized AI Controller                    │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ↓
 ┌─────────────────────────────────────────────────────────────┐
 │         AI Orchestrator Pipeline (12 Mandated Steps)        │
 │                                                             │
 │   1. Feature Config Check      7. Gateway Invocation        │
 │   2. Context Permissions       8. JSON Schema Validation    │
 │   3. Data Sanitization         9. Safety & Boundary Defense │
 │   4. Prompt Guardrails        10. Usage & Cost Accounting   │
 │   5. Rate & Quota Limits      11. Sanitized Audit Logging   │
 │   6. Dynamic Model Routing    12. Formatted Response Output │
 └──────┬───────────────────────┬──────────────────────────────┘
        │                       │
        ↓                       ↓
 ┌──────────────┐       ┌──────────────────────────────────────┐
 │Context Engine│       │         Model Gateway Service        │
 └──────┬───────┘       └───────┬──────────────┬───────────────┘
        │                       │              │
        ↓                       ↓              ↓
 ┌──────────────┐       ┌──────────────┐ ┌──────────────┐
 │  Sanitizer   │       │Dev Provider  │ │OpenAI / Anth │
 │  & Redactor  │       │(Zero Cost)   │ │Gemini Adapter│
 └──────────────┘       └──────────────┘ └──────────────┘
```

---

## 3. Database Schema & Data Models

Day 19 introduces eight dedicated, tenant-isolated Prisma models:

| Model | Purpose | Multi-Tenant Key |
|---|---|---|
| `AIModel` | System-wide registry of approved LLMs, providers, pricing, context windows, and capabilities | Platform / Superadmin |
| `AIFeatureConfiguration` | Organisation- and outlet-level toggles, rate limits, daily/monthly quotas, and model bindings | `organisationId`, `outletId` |
| `AIRequest` | Immutable log of incoming requests, sanitized prompt hash, metadata, and status | `organisationId`, `outletId`, `userId` |
| `AIResponse` | Output generation, latency, token consumption, and safety review decision | `requestId` |
| `AIPrompt` | Managed prompt templates with Mustache variables, semver versioning, and status | Platform / `organisationId` |
| `AIUsageRecord` | Token accounting and estimated cost tracking in minor units (cents) | `organisationId`, `outletId`, `userId` |
| `AIAuditEvent` | Security audit trail for compliance, safety flags, and administrative modifications | `organisationId`, `outletId`, `actorId` |
| `AIFeedback` | End-user feedback (HELPFUL, NOT_HELPFUL, REPORT) for alignment monitoring | `aiResponseId`, `userId` |

---

## 4. The 12-Step Non-Bypassable Orchestrator Pipeline

Every request flowing through `AIOrchestratorService.execute()` must traverse all twelve steps:

1. **Feature Configuration Check**:
   Verifies whether the target `AIFeature` (e.g. `AI_PLATFORM_TEST`) is active for the user's organisation and outlet. Inactive features immediately reject with `403 Forbidden` (`AI_FEATURE_DISABLED`).
2. **Context Bounding & Authorization**:
   Validates tenant (`organisationId`) and role boundaries (`MEMBER` self-only, `TRAINER` assigned-clients-only). Unauthorized access throws `403 Forbidden` (`AI_CONTEXT_DENIED`).
3. **Sensitive Data Sanitization**:
   Removes health screening, PAR-Q, medical clearances, trainer notes, passwords, and billing data before context assembly.
4. **Safety & Injection Defense**:
   Evaluates user input against prompt-injection heuristics (`ignore previous instructions`, `bypass system`) and clinical diagnostic attempts.
5. **Rate & Quota Verification**:
   Checks Redis-backed requests/min counters and enforces daily/monthly organization and user token limits (`AI_RATE_LIMITED`, `AI_USAGE_LIMIT_REACHED`).
6. **Dynamic Model Routing**:
   Selects the best registered `AIModel` based on capability requirements (`TEXT_GENERATION`, `STRUCTURED_OUTPUT`), context window, and priority.
7. **Gateway Invocation & Fallback**:
   Executes request via `ModelGatewayService`. On timeout or provider outage, falls back to alternative tier models transparently.
8. **Output Validation & Schema Enforcement**:
   Validates JSON outputs against expected schemas using `AIOutputValidatorService`.
9. **Clinical & Hallucination Defense**:
   Validates assistant content to ensure no medical advice was generated and appends mandatory guidance disclaimers.
10. **Immutable Usage & Cost Accounting**:
    Records exact token usage (`inputTokens`, `outputTokens`, `totalTokens`) and calculates costs based on model pricing per 1M tokens.
11. **Sanitized Audit Logging**:
    Writes an immutable `AIAuditEvent` recording the execution timestamp, model, latency, and safety status (excluding raw sensitive data).
12. **Structured Response Output**:
    Returns unified `AIProviderResponse` with response metadata, token summary, and latency.

---

## 5. Security, Multi-Tenancy & Privacy Boundaries

### Role-Based Access Control
- `SUPERADMIN`: Platform-wide model registry management, platform observability metrics, provider adapter configuration (`ai:manage:PLATFORM`).
- `ORGANISATION_OWNER`: Organisation feature activation, quota configuration, model selection, organization usage reports (`ai:configure:ORGANISATION`, `ai:read:ORGANISATION`).
- `OUTLET_MANAGER`: Outlet-level usage monitoring (`ai:read:OUTLET`).
- `TRAINER`: Client-scoped AI execution limited strictly to assigned members (`ai:use:ASSIGNED_CLIENTS`).
- `MEMBER`: Self-scoped AI execution limited strictly to own profile and workout context (`ai:use:SELF`).

### Tool Architecture with Write Confirmation
- **`READ_DATA` / `RETRIEVAL`**: Read-only tools execute automatically within the pipeline.
- **`ACTION_MUTATION` / `EXTERNAL_SYSTEM`**: Mutating tools generate an ephemeral HMAC-signed action token (`AIToolExecutionToken`). The client UI presents an `AIConfirmationDialog`. Only upon explicit user confirmation is the mutating action dispatched.

---

## 6. Mobile Client Architecture

The mobile application (`@fitcore/mobile`) integrates with the gateway via clean modular primitives:
- `AIStatusIndicator`: Visual indicator of gateway health (`AVAILABLE`, `THINKING`, `DEGRADED`, `OFFLINE`).
- `AIThinkingState`: Accessible loading animation during LLM token synthesis.
- `AIErrorState`: Safe error fallback screen with retry button and clear disclaimers.
- `AIFeedbackControl`: Thumbs-up / thumbs-down / report controls for user alignment feedback.
- `AIConfirmationDialog`: Modal dialog requiring explicit user approval before executing write actions.
- `AIResponseCard`: Standard card rendering AI guidance with model attribution, timestamp, and health disclaimer.
- `aiService`: Typed client abstraction for test prompts, feedback submission, usage, and health checks.

---

## 7. Operational Readiness & Observability
- **Health Check Endpoint**: `/api/v1/ai/health` monitors provider latency and availability without exposing API keys.
- **Observability Endpoint**: `/api/v1/admin/ai/observability` exposes request throughput, success rates, average latency, and token consumption by model and organisation.
