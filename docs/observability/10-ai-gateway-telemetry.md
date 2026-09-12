# 10 — AI Gateway Telemetry

## Zero-PII Telemetry Guarantee
FitCore AI services process sensitive inputs (member workout preferences, conversation transcripts with voice receptionists, coaching questions). `AiTelemetryService` records operational metrics WITHOUT persisting or logging raw prompts or completions in telemetry streams.

## Tracked Metrics
- **Provider & Model**: E.g. `openai/gpt-4o-mini`, `anthropic/claude-3-5-sonnet`.
- **Token Quantities**: Prompt tokens and completion tokens tracked accurately.
- **Estimated Gateway Cost**: Calculated per token model pricing.
- **Provider Latency**: Round-trip time in milliseconds from request dispatch to final chunk stream completion.
- **Error Breakdown**: Upstream rate limits (`429`), content filter flags, and network timeouts.

## Operational Dashboards
Platform administrators view aggregated AI throughput:
- Requests per minute by model.
- P95 latency trends.
- Cost burn rate per organisation and feature domain.
- Provider fallback invocation count (e.g. OpenAI failover to Anthropic).
