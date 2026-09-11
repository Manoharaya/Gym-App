# Integration Retry Engine & Backoff Strategy

## Overview
FitCore interacts with third-party APIs across unpredictable public networks. Transitory network glitches, upstream HTTP 500s, 502/503/504 gateways, and rate-limiting throttles (HTTP 429) must not corrupt domain state or cause permanent data loss.

The FitCore Integration Platform implements a centralized retry engine utilizing **Exponential Backoff with Full Jitter**.

---

## Retry Strategy & Formula

For retry attempt $i \in [1, \text{maxAttempts}]$:

$$\text{backoff} = \min(\text{maxBackoffMs}, \text{initialDelayMs} \times 2^{i-1})$$
$$\text{delay} = \text{random}(0, \text{backoff})$$

Full jitter ensures that thundering herd problem (where hundreds of retried requests hit an upstream recovery spike simultaneously) is completely eliminated.

### Default Tuning Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxAttempts` | 3 | Default attempts before failing to dead-letter |
| `initialDelayMs` | 500 ms | Base backoff interval |
| `maxBackoffMs` | 10,000 ms | Upper ceiling for exponential backoff delay |
| `jitter` | Full | Randomizes delay between 0 and computed backoff |

---

## Transient vs Non-Transient Errors

Errors are classified before retry decisions are made:

### Transient (Retryable)
* Network timeouts (`ETIMEDOUT`, `ECONNRESET`, `ECONNABORTED`).
* HTTP 429 Too Many Requests (with honoring of `Retry-After` header if present).
* HTTP 502 Bad Gateway.
* HTTP 503 Service Unavailable.
* HTTP 504 Gateway Timeout.
* Upstream DNS failures (`EAI_AGAIN`).

### Non-Transient (Non-Retryable)
* HTTP 400 Bad Request (malformed request payload).
* HTTP 401 Unauthorized (invalid API keys, expired tokens needing user reauth).
* HTTP 403 Forbidden (missing upstream permissions or scope).
* HTTP 404 Not Found (resource deleted upstream).
* HTTP 422 Unprocessable Entity (business validation failure).

---

## Webhook Dead-Letter Queuing

When an inbound webhook fails after reaching max attempts:
1. Status is marked `DEAD_LETTER` in `IntegrationWebhookEvent`.
2. Error details and payload hash are recorded.
3. System alerts operators or logs to administrative audit.
4. Webhooks can be manually re-evaluated via `POST /api/v1/integrations/webhooks/:id/replay`.
