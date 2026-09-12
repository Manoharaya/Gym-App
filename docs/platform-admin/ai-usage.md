# AI Gateway Usage & Cost Governance

## Architectural Integration
Reuses the Day 19 AI platform infrastructure (`AIUsageRecord`, `AIRequest`). Platform operators can inspect aggregate token consumption, model allocation, latency benchmarks, and estimated gateway costs without exposing API keys, provider secrets, or internal prompt templates.

## Metrics
- **Requests Count**: Invocations across fitness, nutrition, receptionist, and analytics agents.
- **Input / Output / Total Tokens**: Aggregated token usage for cost reconciliation.
- **Estimated Cost**: Calculated in cents based on model input/output rates.
- **Latency**: Average response time per feature and provider.
- **Success / Failure Rates**: Detection of model degradation or gateway timeouts.

## Feature Breakdown
- `FITNESS_COACH` (Workout programming & routine adaptations)
- `NUTRITION_COACH` (Meal plan generation & macro recommendations)
- `DAILY_CHECKIN` (Member readiness & fatigue analysis)
- `WEARABLE_INTELLIGENCE` (Heart rate & sleep anomaly detection)
- `RETENTION_INTELLIGENCE` (Churn prediction & re-engagement)
- `RECEPTIONIST` (Automated booking assistance & FAQ answers)
- `SALES_AGENT` (Lead qualification & membership conversion)
- `FINANCE_ASSISTANT` (Revenue projections & expense classification)

## Secret Redaction Invariant
Platform administrators can view:
- Provider name, model version, token volume, latency, cost.
Platform administrators can **never** view:
- Third-party provider API keys or bearer tokens.
- Member personal prompt contexts.
- Raw system prompt secrets.
