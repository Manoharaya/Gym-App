# FitCore v1.0 — Operational Support & Incident Runbook

## 1. Overview & Triage Principles
This runbook guides Customer Support Engineers, Site Reliability Engineers, and On-Call Developers when diagnosing, triaging, and resolving issues across FitCore tenants and platform infrastructure.

---

## 2. Request Tracing & Error Codes
Every API request is stamped with a unique UUID (`x-request-id`) injected by `RequestIdMiddleware`.
- **Finding Logs**: In Datadog, Grafana Loki, or CloudWatch, query by `requestId`:
  ```text
  requestId="c1cd67e1-19d3-416f-9cf3-7c90b62929c8"
  ```
- **Standard Error Format**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | INTERNAL_SERVER_ERROR",
      "message": "Human-readable description",
      "details": []
    },
    "requestId": "uuid"
  }
  ```

---

## 3. Subsystem Outage & Degraded Mode Procedures

### 3.1 AI Provider Outage (OpenAI / Anthropic / Google Gemini)
- **Symptom**: Chat responses failing or timing out after 15 seconds.
- **Degraded Mode**: `AISafetyService` and fallback templates engage automatically.
- **Operational Action**:
  1. Check `/api/v1/observability/health/live`.
  2. Gym core operations (check-in, turnstiles, payments, class bookings) **continue uninterrupted**.
  3. No action required unless LLM outage exceeds 1 hour; switch active provider in configuration if necessary.

### 3.2 Payment Gateway Outage (Stripe)
- **Symptom**: In-flight charges failing or webhooks failing signature verification.
- **Operational Action**:
  1. Verify Stripe Status Page (`status.stripe.com`).
  2. Failed member payments transition to `PAYMENT_FAILED` state with automated dunning retry in 24 hours.
  3. **DO NOT** manually re-charge member cards without customer confirmation.

### 3.3 Physical Turnstile / Access Offline Outage
- **Symptom**: Local gym turnstiles unable to reach FitCore API.
- **Degraded Mode**: Hardware controllers fall back to local cached policy cache (`AccessPolicyCache`).
- **Operational Action**:
  1. Turnstiles grant entry to active members whose credentials were valid within past 24 hours.
  2. Local check-ins queue locally and synchronize to PostgreSQL once connectivity restores.

---

## 4. Emergency Account Unlock & Password Reset
1. If member or staff is locked out due to brute-force threshold (5 failed logins):
   - Call `POST /api/v1/security/account-protection/unlock` with `userId` as an authorized administrator.
2. If administrator session is compromised:
   - Call `POST /api/v1/security/sessions/revoke-all` with `userId`.
