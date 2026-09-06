# FitCore AI Orchestration Service

## Purpose

Dedicated microservice responsible for orchestrating LLM interactions:

- Model gateway abstracting OpenAI, Anthropic Claude, and Google Gemini.
- Prompt injection protection, health safety guardrails, and club persona enforcement.
- Tenant-level and user-level credit allocation, rate limiting, and cost tracking.
- Context hydration: aggregates recent workouts, sleep scores, and training history before prompting.

## Architectural Boundary

- The mobile application NEVER calls LLM APIs directly.
- All requests flow: `Mobile App -> FitCore API -> AI Orchestration Service -> LLM Provider`.

_Implementation scheduled for subsequent project milestones._
