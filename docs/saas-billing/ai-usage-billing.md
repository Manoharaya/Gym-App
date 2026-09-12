# AI Usage & Token Billing

Commercial billing integration with Day 19 AI Gateway.

## Separation: Cost vs Price
- **Provider Gateway Cost**: Raw upstream token cost recorded in `AIUsageRecord.estimatedCost` (e.g., $10.00 provider expense).
- **Customer Billable Price**: Charged per quota overage batch in `SaasPlanEntitlement` (e.g., $25.00 billed to gym).
- The two metrics are tracked independently to enable profit margin and unit economic analytics.
