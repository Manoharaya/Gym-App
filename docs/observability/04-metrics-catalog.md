# 04 — Metrics Catalog

## Overview
Metrics in FitCore are registered via `MetricRegistryService`, maintaining bounded in-memory sliding reservoirs (capped at 1,000 samples per histogram) to ensure constant O(1) memory overhead.

## Standard Platform Metrics

| Metric Key | Type | Unit | Description |
|:---|:---|:---|:---|
| `http.server.requests` | Counter | count | Total HTTP incoming requests across endpoints |
| `http.server.duration` | Histogram | ms | HTTP request latency percentiles (p50, p95, p99) |
| `http.server.errors` | Counter | count | Total HTTP 5xx responses emitted |
| `db.query.duration` | Histogram | ms | PostgreSQL query execution time percentiles |
| `db.connection.active` | Gauge | count | Active pool connections in use |
| `redis.command.duration` | Histogram | ms | Redis command execution latency |
| `queue.jobs.waiting` | Gauge | count | Total pending jobs in worker queues |
| `queue.jobs.failed` | Counter | count | Total failed background jobs |
| `ai.gateway.requests` | Counter | count | Total LLM invocations |
| `ai.gateway.tokens` | Counter | count | Total prompt + completion tokens consumed |
| `ai.gateway.duration` | Histogram | ms | Latency from LLM provider response |
| `payment.checkout.duration` | Histogram | ms | Stripe checkout session / charge latency |

## Percentile Calculation
Histogram percentiles are computed dynamically using reservoir sorting:
```typescript
const sorted = [...this.samples].sort((a, b) => a - b);
const p50 = sorted[Math.floor(sorted.length * 0.5)];
const p95 = sorted[Math.floor(sorted.length * 0.95)];
const p99 = sorted[Math.floor(sorted.length * 0.99)];
```
