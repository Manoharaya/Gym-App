# FitCore Developer Platform Security Architecture

## 1. Multi-Tenant Isolation & Anti-IDOR Protections
FitCore is an enterprise multi-tenant platform. Every programmatic request carries cryptographically validated tenant context (`organisationId` and optional `outletId`):
- API keys are permanently locked to a tenant organization upon issuance.
- OAuth consent binds authorization strictly to the gym franchise chosen by the authorizer.
- All database queries enforce tenant isolation in `where: { id: resourceId, organisationId: ctx.organisationId }`.
- Insecure Direct Object References (IDOR) are strictly rejected with HTTP 404 (preventing cross-tenant metadata enumeration).

## 2. Cryptographic Secret Management
- **One-Way Hashing**: API keys and OAuth client secrets are hashed using SHA-256 with high-entropy salt before persistence. Raw keys exist only in server memory for the duration of the generation HTTP response.
- **Timing-Attack Immunity**: Secret verification utilizes `crypto.timingSafeEqual()` across all token verifications, preventing CPU cache and branch prediction timing side-channel attacks.
- **Zero-Downtime Key Rotation**: Seamless key replacement allows partners to run new and old keys in parallel over a defined grace period (up to 7 days) without dropping traffic.

## 3. Privacy Boundaries & Quarantined Health Data
FitCore enforces strict separation of concerns between standard gym operational data and sensitive personal fitness data:
- Standard scopes (`members:read`, `classes:read`, etc.) explicitly strip PAR-Q (Physical Activity Readiness Questionnaire), injury histories, emergency contacts, and wearable biometric streams.
- The `health:read` scope is classified as `RESTRICTED`. It cannot be requested implicitly and requires mandatory explicit member consent and quarantined storage.

## 4. SSRF & Network Protections
Webhook delivery workers enforce strict network boundary checks:
- Webhooks targeting localhost (`127.0.0.1`, `::1`), RFC 1918 private subnets, or link-local addresses (`169.254.169.254`) are blocked at subscription time and rejected at dispatch time.
- All production deliveries require TLS 1.2+ HTTPS.
