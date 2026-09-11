# ADR-041: API & Developer Platform Architecture

## Status
Accepted

## Date
2026-09-11

## Context
FitCore is transitioning from an internal gym SaaS application into an extensible platform. Third-party software vendors, franchise partners, mobile app developers, and IoT hardware providers require safe, audited, rate-limited, and multi-tenant isolated access to FitCore capabilities.

## Decisions

### 1. Dual-Track Authentication: API Keys and OAuth 2.0 with PKCE
- **API Keys**: Server-to-server integration with environment-prefixed keys (`fc_live_...`, `fc_test_...`). Stored as SHA-256 hashes at rest. Zero-downtime rotation with dual-key grace periods.
- **OAuth 2.0 with PKCE (RFC 7636, S256)**: User-facing / third-party delegate access without credential exposure. Single-use auth codes with 10-minute TTL, token rotation, and instant revocation.

### 2. URL Path-Based Versioning (`/api/v1/public/*`)
- Breaking changes require major version bumping.
- Deprecation headers (`Deprecation`, `Sunset`, `Link`) provide proactive notice to clients.

### 3. Strict Scope Hierarchy & Privacy Quarantines
- Three sensitivity classifications: `STANDARD`, `SENSITIVE`, `RESTRICTED`.
- Quarantined health data: Biometric, wearable, and PAR-Q data is quarantined under `health:read` and never exposed via standard member endpoints.

### 4. Robust Webhook Infrastructure & SSRF Immunity
- Payloads signed using HMAC-SHA256 over `${timestamp}.${rawBody}`.
- Drift / replay defense with 300s window.
- SSRF filtering blocks loopback (`127.0.0.1`), cloud metadata (`169.254.169.254`), and RFC 1918 private subnets.
- Circuit breaker auto-degrades endpoints failing consecutively.

### 5. Sliding-Window Rate Limiting
- Enforced per application tier (`SANDBOX`, `STANDARD`, `PARTNER`, `ENTERPRISE`).
- Standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and HTTP 429 with `Retry-After`.

## Consequences
- High security assurance and complete auditability for developer interactions.
- Seamless compatibility with future Day 50 Marketplace integrations.
- Zero risk of cross-tenant data leaks (IDOR defense) or confidential health data spills.
