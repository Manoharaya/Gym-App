# Integration Platform Security Architecture & Defenses

## Overview
External integrations present high security exposure: third-party API tokens, secret keys, webhook callbacks from the public internet, and cross-system redirections. FitCore implements Defense-in-Depth across every tier.

---

## 1. Zero Plaintext Credentials at Rest (AES-256-GCM)
* Encrypted envelopes contain:
  - 12-byte cryptographically random IV.
  - 16-byte authentication tag (GCM).
  - Ciphertext.
* Keys are derived using HKDF / master encryption key configured in environment secrets.
* Plaintext credentials never leave memory and are completely omitted from:
  - Database queries (`select: { encryptedCredentials: false }`).
  - DTO serialization (`hasCredentials: boolean` only).
  - HTTP responses.
  - Application logs and audit records.
  - Disconnect operations wipe cryptographic records permanently.

---

## 2. Server-Side Request Forgery (SSRF) Defense
Outbound redirects, webhook replay endpoints, and OAuth callback URLs are validated against private IP ranges and internal network targets.

FitCore automatically rejects URLs resolving or pointing to:
* `localhost`, `127.0.0.1`, `[::1]`.
* Cloud Instance Metadata Service (`169.254.169.254`).
* RFC 1918 Private IPv4 CIDRs:
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
* Non-HTTP/HTTPS protocol schemes (`file://`, `gopher://`, `ftp://`).

---

## 3. Inbound Webhook Signature Verification
No webhook payload is processed without cryptographic signature validation:
* **HMAC-SHA256**: Stripe, Twilio, SendGrid.
* **Secret Query / Nonce**: Esewa, Khalti.
* **ECDSA / Public Key Verification**: Apple HealthKit, SendGrid Event Webhooks.
* Replays and timing attacks are mitigated through timestamp tolerance checks (5-minute maximum drift).

---

## 4. Single-Use CSRF OAuth State Tokens
* OAuth 2.0 authorization requests emit a cryptographically random 32-byte hexadecimal state token.
* State token is stored in Redis/Memory with a strict **10-minute TTL**.
* State is cryptographically bound to:
  `{ organisationId, userId, provider, scope, outletId, memberId, staffId }`.
* Upon callback consumption, state token is deleted immediately. Replay attempts yield HTTP 400 Bad Request.

---

## 5. Multi-Tenant RBAC & IDOR Guard
* All integration endpoints require valid JWT authentication.
* Role-based access control enforces:
  - `ORGANISATION`: `ORGANISATION_ADMIN`, `SUPERADMIN`.
  - `OUTLET`: `OUTLET_MANAGER` (scoped to their own outlet).
  - `MEMBER`: Own member ID only (wearable sync).
  - `STAFF`: Own staff ID only (calendar sync).
* Cross-tenant access is rejected with HTTP 403 / 404.
