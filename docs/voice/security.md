# Voice Security & Boundary Protection — Day 34

## 1. Webhook Signature Validation
- Incoming telephony provider webhooks must supply valid cryptographic HMAC signatures (`x-telephony-signature`).
- Signatures are evaluated using timing-safe comparisons to prevent timing side-channel attacks.

## 2. Replay Defense
- Webhook payloads include timestamps validated within a 5-minute (300,000 ms) window.
- Stale or replayed webhook payloads are rejected with `400 Bad Request`.

## 3. Webhook Idempotency
- Incoming events are tracked via composite idempotency keys (`${callId}:${status}`).
- Duplicate webhook deliveries are deduplicated without re-executing tools or dispatching redundant actions.

## 4. Multi-Tenant Isolation
- All phone numbers belong strictly to a single `Organisation` and optional `Outlet`.
- Cross-tenant lookups fail safely with `UNKNOWN_TENANT`.
- Session, transcript, and summary endpoints enforce organisation ownership checks (IDOR protection).

## 5. Cost Safety Limits
- `MAX_CALL_DURATION_SECONDS`: 600s (10 minutes) maximum per call.
- `MAX_TURNS_PER_CALL`: 25 conversational turns maximum per session.
- Once limits are reached, the call terminates gracefully to prevent runaway AI or telephony expenses.
