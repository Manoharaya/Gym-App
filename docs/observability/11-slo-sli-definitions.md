# 11 — Service Level Objectives (SLOs) & SLIs

## Core Platform Objectives

| Service Tier | SLI Definition | Target SLO | Measurement Window |
|:---|:---|:---|:---|
| **API Availability** | Percentage of non-5xx HTTP responses | **99.95%** | Rolling 30 Days |
| **API Latency (p95)** | Round-trip request duration | **< 200 ms** | Rolling 24 Hours |
| **Member Physical Access** | Door turnstile unlock evaluation latency | **< 50 ms** (99.9%) | Real-time |
| **Checkout & Payments** | Stripe checkout session initiation | **99.90%** | Rolling 7 Days |
| **Background Notifications** | Dispatch latency from queue to SMS gateway | **< 30 seconds** | Rolling 1 Hour |
| **AI Receptionist Latency** | First-token response time for voice turn | **< 600 ms** | Rolling 1 Hour |

## Implementation in Code
`SloService` manages `ObservabilitySloDefinition` records, evaluating observed metric values against target thresholds and computing compliant status:
```typescript
const isCompliant = def.comparator === 'GREATER_THAN_OR_EQUAL'
  ? observedValue >= def.targetValue
  : observedValue <= def.targetValue;
```
