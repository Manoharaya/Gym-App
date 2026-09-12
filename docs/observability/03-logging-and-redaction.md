# 03 — Logging and Redaction

## Purpose
The `LogRedactionService` and `StructuredLoggerService` provide deterministic, high-throughput, structured JSON logging while enforcing zero-leakage policies for credentials, authorization tokens, payment details, and member health data.

## Recursive Redaction Engine
The redaction engine inspects log keys and string bodies recursively up to a depth of 8 levels:
```typescript
private readonly sensitivePatterns = [
  /pass(word)?/i,
  /token/i,
  /secret/i,
  /key/i,
  /authorization/i,
  /auth_?token/i,
  /cookie/i,
  /mfa/i,
  /recovery/i,
  /card(number)?/i,
  /cvv/i,
  /parq/i,
  /medical/i,
  /credential/i,
  /clientsecret/i,
];
```

## String Pattern Redaction
Even if a token is embedded inside a string (e.g. error messages or query logs), the redaction engine identifies and sanitizes Bearer tokens:
```typescript
if (/bearer\s+[a-zA-Z0-9\-_.]+/i.test(data)) {
  return data.replace(/bearer\s+[a-zA-Z0-9\-_.]+/gi, 'Bearer [REDACTED]');
}
```

## Structured JSON Log Format
All log output adheres to standard schema:
```json
{
  "timestamp": "2026-09-12T06:15:00.000Z",
  "level": "INFO",
  "context": "ObservabilityHealthService",
  "message": "Health probes executed across all tiers",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "service": "api-gateway",
  "metadata": {
    "tier": "CORE",
    "status": "HEALTHY"
  }
}
```
