# ADR-036: AI Finance Assistant Architecture

## Status
Accepted

## Date
2026-09-11

## Context
FitCore requires a natural language financial intelligence layer enabling gym owners, finance teams, and outlet directors to query financial performance, recurring billing health, and accounting sync status.

Financial data is legally sensitive, mission-critical, and subject to audit. Common AI LLM implementations suffer from:
1. Hallucinated numbers and calculations.
2. Exposure of confidential member health/biometric information.
3. Over-privileged agents mutating financial ledgers (erroneous refunds or schedule cancellations).
4. Language barriers in regional deployments (specifically Nepal).

## Decision

1. **Strictly Read-Only Tool Dispatch**:
   The AI assistant operates via `FinanceToolRegistry`, which is strictly read-only. It has no tools or permissions to execute payments, refunds, invoice voids, or sync mutations.

2. **FitCore as the Single Financial Source of Truth**:
   The assistant queries FitCore's internal database (Days 6, 41, 42, 43) rather than third-party APIs directly. This guarantees deterministic audit trails and multi-tenant isolation.

3. **Context Minimisation & Data Privacy**:
   PAR-Q forms, medical injuries, biometric logs, workout telemetry, trainer notes, and card PANs are permanently excluded from LLM prompts.

4. **Server-Side Grounding Validator**:
   A post-generation grounding validator scans generated responses for numbers and percentages. Any figure not originating from authoritative tool query results causes the response to be marked ungrounded and sanitized.

5. **Bilingual Support (English & Nepali)**:
   The assistant features native intent classification and responses in both English and Nepali (नेपाली) using localized financial terminology.

6. **Safety Guardrails**:
   Explicit refusals for prompt injection, future revenue forecasting, and action mutations, accompanied by mandatory statutory tax disclaimers.

## Consequences

### Positive
- Zero risk of unauthorized financial state alteration through prompt manipulation.
- Deterministic, verifiable numbers with source attribution down to service method names.
- Complete member medical and payment data privacy.
- Culturally accessible financial reporting for Nepali fitness operators.

### Negative / Trade-offs
- The assistant cannot "fix" an invoice or refund a charge directly from chat; users must navigate to the appropriate management screen.
- Responses require slight latency overhead for post-generation grounding validation (~20-50ms).
