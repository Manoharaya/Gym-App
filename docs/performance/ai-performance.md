# AI & External Provider Resilience Guide

## 1. Context Window Optimization & Token Bounding

Uncontrolled context injection into LLMs leads to severe latency degradation (P95 > 10s) and exorbitant costs. FitCore enforces strict context hygiene:

```
[ Unbounded Chat / Health History ]
                 │
                 ▼
[ Token Window Limiter / Truncator ]
  - Max 10 most recent conversation turns
  - Bounded member profile attributes (name, age, goal, restrictions only)
  - Zero raw database dumps or unbounded activity logs
                 │
                 ▼
[ AI Gateway / LLM Client ]
  - System prompt: < 500 tokens
  - Injected context: < 1,500 tokens
  - Max completion tokens: 500 tokens
```

---

## 2. Multi-Provider Fallback & Circuit Breaking

FitCore integrates with multiple LLM providers (e.g., Anthropic Claude, OpenAI GPT-4o-mini, Azure OpenAI) with automatic failover:

1. **Timeout Circuit Breaker**:
   - Outbound LLM HTTP requests are guarded by a 5,000ms deadline.
   - If a provider times out or returns HTTP 5xx/429 three times within 60 seconds, the circuit opens for that provider.
2. **Provider Failover**:
   - Primary: OpenAI `gpt-4o-mini` (or configured primary).
   - Secondary: Anthropic `claude-3-5-haiku`.
   - Tertiary / Fallback: Deterministic rule-based template response (guarantees member UI never hangs or crashes).
3. **Telemetry & Privacy Invariants**:
   - All AI calls emit `AiTelemetryService` metrics: `tokensPrompt`, `tokensCompletion`, `latencyMs`, `costUsd`, `model`, `provider`.
   - **Zero PII Exposure**: Raw prompt text, user health notes, and raw LLM completions are **NEVER** stored in platform metrics or centralized observability logs.
