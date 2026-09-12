# 14 — Provider Health Monitoring

## External Gateway Integrations
FitCore relies on external SaaS gateways to deliver services. The `ObservabilityProviderHealthSnapshot` tracks live operational status:

```typescript
model ObservabilityProviderHealthSnapshot {
  id              String   @id @default(cuid())
  provider        String   // 'STRIPE', 'TWILIO', 'SENDGRID', 'OPENAI', 'ANTHROPIC', 'XERO'
  status          String   // 'OPERATIONAL', 'DEGRADED', 'OUTAGE'
  latencyMs       Int
  errorRate       Float    // percentage in last 5m
  lastCheckedAt   DateTime @default(now())
  consecutiveFailures Int @default(0)
}
```

## Circuit Breakers & Failover
- **AI Gateways**: If OpenAI returns `429 Too Many Requests` or `5xx Server Error` for 3 consecutive calls, requests automatically fail over to Anthropic Claude models.
- **SMS Gateways**: If Twilio experiences delivery queue delays > 180s, notifications route through alternate AWS SNS channels.
- **Accounting**: If Xero returns rate limit errors, jobs are placed in backoff retry queues without blocking gym checkout operations.
