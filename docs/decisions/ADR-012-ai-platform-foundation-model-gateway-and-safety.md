# ADR 012: AI Platform Foundation, Model Gateway, Context Engine & AI Safety

## Status
Accepted (Day 19)

## Context
As FitCore prepares to introduce intelligent assistance (AI coaching, nutrition planning, conversational reception, retention intelligence, and daily check-ins), direct, ad-hoc integrations between application code and proprietary LLM APIs (OpenAI, Anthropic, Google Gemini) create unacceptable risks:
1. **Security & Privacy Leaks**: Direct LLM calls risk transmitting sensitive medical records, PAR-Q disclosures, trainer notes, payment details, or credentials into external AI prompts.
2. **Provider Lock-In & Single Points of Failure**: Hardcoded dependencies on single LLM endpoints make switching providers or routing dynamically between fast, cheap, and complex models impossible.
3. **Uncontrolled Cost & Token Depletion**: Lack of centralized rate-limiting, tenant-scoped budgeting, and token accounting exposes gyms and the platform to denial-of-wallet attacks.
4. **Safety & Regulatory Liability**: Unsanitized user prompts can lead to prompt injection attacks, jailbreaks, and unlawful medical diagnoses or prescription advice.
5. **Irreproducible Execution**: Without unified audit logging and structured output validation, debugging degraded model behavior or tracking user feedback becomes untenable.

## Decision

1. **Strict Centralized Gateway Architecture**:
   - Individual domain modules, mobile clients, and web apps are strictly prohibited from importing or invoking external AI provider SDKs.
   - All AI requests must route through `AIOrchestratorService` via a mandatory 12-step non-bypassable pipeline:
     1. Feature Flag Check
     2. Context Bounding & Permission Enforcement
     3. Sensitive Data Sanitization
     4. Safety & Prompt Injection Guardrails
     5. Token Quota & Rate Limit Verification
     6. Dynamic Model Routing & Capability Matching
     7. Provider Gateway Invocation with Exponential Fallback
     8. Output Validation & JSON Schema Enforcement
     9. Hallucination & Topic Defense
     10. Immutable Usage & Cost Accounting
     11. Sanitized Audit Logging
     12. Structured Client Response Formulation

2. **Provider Abstraction with Deterministic Development Adapter**:
   - Implemented standard `AIProviderAdapter` interface with concrete adapters for `DevelopmentAIProvider`, `OpenAIProviderAdapter`, `AnthropicProviderAdapter`, and `GeminiProviderAdapter`.
   - `DevelopmentAIProvider` provides deterministic, schema-valid mock generations for all integration tests and local development with zero external API calls or credit burn.

3. **Zero-Trust Context Engine & Privacy Firewall**:
   - Raw health screening, PAR-Q submissions, injury logs, medical clearance notes, trainer private notes, credentials, and payment card details are strictly redacted by `SensitiveDataSanitizerService` before context compilation.
   - Access to member context is restricted by tenant (`organisationId`), role (`MEMBER` self-only, `TRAINER` assigned-clients-only, `OUTLET_MANAGER` outlet-only).

4. **Safety Engine & Guardrails**:
   - Pre-execution regex and rule filters block prompt injection attacks (`ignore previous instructions`, `system override`, roleplay jailbreaks).
   - Strict medical diagnosis and prescription filters block claims to diagnose, prescribe, or treat clinical pathologies, requiring certified professional referral.
   - Untrusted user input is wrapped with defensive XML boundary tags (`<user_prompt>...</user_prompt>`) with boundary instructions preventing instruction escape.

5. **Tenant Usage Quotas & Cost Accounting**:
   - Every AI request records input, output, and total tokens alongside calculated cost in minor currency units (cents/AUD).
   - Enforces daily and monthly quotas at organisation, outlet, and user tiers.
   - Tenant-scoped Redis rate limiting prevents abusive spikes.

6. **Tool Architecture with User Confirmation Tokens**:
   - Read-only tools (`READ_DATA`, `RETRIEVAL`) execute transparently within the pipeline.
   - Mutating tools (`ACTION_MUTATION`, `EXTERNAL_SYSTEM`) generate an action confirmation token requiring explicit user approval before execution.

7. **Scoped Feature Rollout**:
   - Only `AI_PLATFORM_TEST` is enabled by default.
   - All future domain AI capabilities (`AI_FITNESS_COACH`, `AI_NUTRITION_COACH`, `AI_RECEPTIONIST`, `AI_SALES_AGENT`, `AI_MARKETING_AGENT`, `AI_CHURN_PREDICTION`) default to disabled until their scheduled days.

## Consequences

### Positive
- **Guaranteed Zero-Trust Compliance**: No clinical or sensitive data can leak to external AI providers.
- **Provider Agnostic**: Seamless switching between models and providers with zero client or domain code changes.
- **Cost Transparency**: Precise tenant-level billing, quota enforcement, and token observability.
- **Fail-Safe Resilience**: Automatic fallback across model tiers and providers prevents total service outage.
- **Robust Defense**: Prevents prompt injection, jailbreaks, and clinical liabilities.

### Negative / Tradeoffs
- Pipeline adds minor gateway latency (~10-25ms) due to multi-step validation, sanitization, and audit recording.
- Requires maintenance of model catalog definitions and pricing tables.
