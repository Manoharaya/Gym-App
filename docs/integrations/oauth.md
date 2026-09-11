# Provider-Neutral OAuth 2.0 Foundation

## Overview

The FitCore Integrations Platform provides a secure, provider-neutral OAuth 2.0 framework for external platforms requiring user authorization (Xero, QuickBooks, Fitbit, Google Calendar, Microsoft 365).

---

## 1. OAuth Sequence Flow

```text
End-User / Admin                  FitCore API               External Provider (Xero/Google)
      |                                |                                   |
      | 1. POST /connections/:id/connect                                   |
      |------------------------------->|                                   |
      |                                | 2. Generate secure state token    |
      |                                |    (fc_state_{64_hex_chars})      |
      |                                | 3. Cache state with 10min TTL     |
      |                                |    (Bound to org, user, provider) |
      | 4. Return authorization URL    |                                   |
      |<-------------------------------|                                   |
      |                                                                    |
      | 5. Redirect browser to external authorization URL                  |
      |------------------------------------------------------------------->|
      |                                                                    |
      | 6. User approves permissions                                       |
      | 7. Callback with code & state                                      |
      |------------------------------->|                                   |
      |                                | 8. Validate & consume state token |
      |                                |    (Single-use CSRF defense)      |
      |                                | 9. Exchange code for tokens       |
      |                                |---------------------------------->|
      |                                | 10. Return access & refresh token |
      |                                |<----------------------------------|
      |                                | 11. Encrypt tokens (AES-256-GCM)  |
      |                                | 12. Save to IntegrationConnection |
      | 13. Connection Active (200 OK) |                                   |
      |<-------------------------------|                                   |
```

---

## 2. State Token Security Properties

Every OAuth state token:
- **Prefix**: `fc_state_`
- **Entropy**: 32 cryptographically secure random bytes (64 hexadecimal characters via `crypto.randomBytes(32)`).
- **Tenant-Bound**: Bound strictly to `organisationId`.
- **User-Bound**: Bound strictly to `userId`.
- **Provider-Bound**: Bound strictly to target external `provider`.
- **Time-to-Live (TTL)**: 600 seconds (10 minutes).
- **Single-Use**: Deleted atomically upon consumption, rendering replay attacks impossible.
