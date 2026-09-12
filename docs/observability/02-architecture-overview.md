# 02 — Architecture Overview

## Telemetry Pipeline

```text
APPLICATION EVENTS & HTTP REQUESTS
  │
  ├──► [LogRedactionService] ──► [StructuredLoggerService] ──► JSON Stdout / CloudWatch
  │
  ├──► [TraceContextService] ──► W3C TraceContext (`traceparent`) ──► Distributed Services
  │
  ├──► [MetricRegistryService] ──► Bounded Reservoirs (p50/p95/p99) ──► Metrics Catalog API
  │
  └──► [ObservabilityHealthService] ──► Multi-Tier Health Probes ──► Alert Engine
                                                                       │
                                                                       ▼
                                                          [AlertEngineService] (SHA-256 Dedup)
                                                                       │
                                                                       ▼
                                                          [IncidentService] (Lifecycle & Events)
```

## Service Components

| Component | Class | Responsibility |
|:---|:---|:---|
| **Log Redaction** | `LogRedactionService` | Recursive sanitization against credential, auth, and health regex patterns |
| **Structured Logger** | `StructuredLoggerService` | Emits standardized JSON logs with correlation IDs (`traceId`, `spanId`) |
| **Distributed Tracing** | `TraceContextService` | Generates W3C 32-hex `traceId`, 16-hex `spanId`, and parses `traceparent` headers |
| **Metrics Registry** | `MetricRegistryService` | Tracks counters, gauges, and computes histogram percentiles (p50, p95, p99) with 1000-sample bounded reservoir |
| **Multi-Tier Health** | `ObservabilityHealthService` | Evaluates Core, Storage, Worker, AI, Payment, Comms, and Accounting probes |
| **Alert Engine** | `AlertEngineService` | Rule threshold evaluation, SHA-256 fingerprinting, deduplication, and cooldowns |
| **Incident Management** | `IncidentService` | Declares operational incidents, links alerts, records timeline progression events |
| **Queue Telemetry** | `QueueTelemetryService` | Monitors BullMQ worker queues, queue depths, job throughput, and dead-letter queues |
| **AI Gateway Telemetry**| `AiTelemetryService` | Tracks token usage, token latency, and cost estimates without exposing prompts |
| **SLO Compliance** | `SloService` | Computes SLI performance, error budget burn rates, and compliance against SLO targets |
| **Deployment Tracker** | `ObservabilityService` | Records deployment releases to correlate production anomalies with code changes |
