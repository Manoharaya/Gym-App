# FitCore API Keys Guide

## 1. Overview & Key Architecture
FitCore API Keys provide direct, server-to-server programmatic access for internal services, third-party backend systems, and partner integrations.

### Key Prefixes
Every FitCore API key is strongly typed and prefixed to indicate its target environment:
- `fc_live_...`: Production environment keys. All operations affect live tenant data.
- `fc_test_...`: Sandbox / development environment keys. All operations are isolated to synthetic datasets.

```text
Prefix (fc_live_) + 32-character High-Entropy Base64/Hex Token
```

## 2. Cryptographic Storage & Security
- **One-Time Exposure**: The full plaintext API key is shown only ONCE at creation or rotation time. It is never stored in FitCore databases in plaintext.
- **SHA-256 Hashing**: FitCore stores an irreversible SHA-256 hash (`keyHash`) of the raw key alongside a non-secret preview prefix (e.g. `fc_live_...abcd`).
- **No Secret Leaks**: Audit logs, analytics pipelines, and error diagnostics redact all API keys and Authorization headers.

## 3. Zero-Downtime Rotation
FitCore supports dual-key zero-downtime rotation:
1. Call `POST /api/v1/developer/applications/:appId/keys/:keyId/rotate` with `gracePeriodHours` (default: 24h, max: 168h).
2. A new active API key is generated and returned immediately.
3. The old API key remains functional throughout the specified grace period before transitioning to `REVOKED`.
4. Update your production configuration with the new key without dropping any incoming traffic.

## 4. Immediate Revocation
If an API key is accidentally committed to version control or compromised:
- Immediately call `DELETE /api/v1/developer/applications/:appId/keys/:keyId` or invoke the Revoke action in the Mobile/Web Console.
- The key status changes to `REVOKED` instantly. All subsequent requests using the key will be rejected with HTTP `401 Unauthorized`.

## 5. Usage in HTTP Requests
Pass the API key in the `X-Api-Key` header or standard `Authorization: Bearer <API_KEY>`:

```bash
curl -X GET https://api.fitcore.com/api/v1/public/members \
  -H "X-Api-Key: fc_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d"
```
