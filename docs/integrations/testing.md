# Integration Platform Testing Strategy

## Overview
Because external third-party services fluctuate, rate-limit, and cannot be invoked against live credentials during automated CI/CD builds, FitCore employs a comprehensive multi-layer testing harness.

---

## 1. Unit Testing
* **Mock Provider Adapters**: All external network calls are encapsulated within provider adapters (`BaseIntegrationAdapter`).
* **Cryptographic Envelopes**: Testing AES-256-GCM encryption, decryption, invalid authentication tags, key rotation, and tampered ciphertext.
* **Backoff & Jitter Verification**: Verifying that calculated backoff is strictly bounded between 0 and maximum exponential delay.
* **Rate Limiting Windows**: Simulating burst traffic and verifying sliding window reset counters.

---

## 2. End-to-End (E2E) Test Suite
Located in `services/api/test/integrations.e2e-spec.ts`. Contains 36 comprehensive test scenarios covering:
1. Provider Registry & Capabilities interrogation.
2. Multi-Scope Connection Lifecycle (`ORGANISATION`, `OUTLET`, `MEMBER`, `STAFF`).
3. Credential Security & AES-256-GCM Encryption (zero secret exposure, wipe on disconnect).
4. OAuth 2.0 Single-Use CSRF state defense.
5. Inbound Webhooks Pipeline & Deduplication (idempotency, HMAC verification, replay).
6. Sync Engine & Cursor Checkpoints.
7. Retry Engine with Exponential Backoff & Full Jitter.
8. Rate Limiting & Throttling.
9. Health Monitoring & Degraded State Transitions.
10. Multi-Tenant RBAC & IDOR Protections.
11. SSRF Defense & Management Overview.

### Running E2E Tests
```bash
pnpm --filter @fitcore/api test test/integrations.e2e-spec.ts
```

---

## 3. Regression Testing
Validates that adding the unified integration platform preserves existing domain guarantees:
* **Day 47 Resource & Capacity Intelligence**: `pnpm --filter @fitcore/api test test/resource-capacity-intelligence.e2e-spec.ts` (26/26 tests passing).
* **Day 43 Accounting Integration**: `pnpm --filter @fitcore/api test test/accounting-integration.e2e-spec.ts` (26/26 tests passing).
