# 05 — Distributed Tracing

## W3C TraceContext Specification
FitCore implements the W3C TraceContext standard (`traceparent` header) for distributed tracing across services, worker tasks, and integration webhooks.

### Header Format
```text
traceparent: {version}-{traceId}-{spanId}-{traceFlags}
Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```
- **version**: `00` (Current standard version)
- **traceId**: 32-hex character global correlation identifier
- **spanId**: 16-hex character hop/operation identifier
- **traceFlags**: `01` (Recorded / sampled)

## Context Propagation Flow
1. **API Ingress**: The API checks for incoming `traceparent`. If absent, `TraceContextService.createContext()` generates a new trace root.
2. **NestJS Context**: The `traceId` and `spanId` are attached to request headers and logger context.
3. **Queue Publishing**: When a job is dispatched to BullMQ, the `traceparent` is injected into job metadata.
4. **Worker Execution**: Worker pulls `traceparent`, establishes child span, and links all worker logs to the originating trace.
