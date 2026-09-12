# ADR: Day 59 — Full Security Hardening & Penetration QA

## Status
Accepted

## Context
Across Days 1 through 58, FitCore developed an enterprise multi-tenant gym SaaS platform comprising multi-branch management, physical access turnstiles, recurring billing, developer APIs, webhooks, marketplace extensions, AI fitness coaches, observability, and disaster recovery.

Day 59 acts as the decisive security hardening and penetration testing evaluation day prior to the Day 60 Release Candidate milestone. The objective is to attack, audit, remediate, and harden the system under real-world threat conditions without introducing duplicate auth, RBAC, or tenant isolation systems, and while strictly preserving server-side authority.

## Decisions

1. **SSRF Defensive Hardening (`DeveloperSecurityService`)**:
   - Upgraded `validateUrlSafe()` to strictly parse and reject all non-standard IP notations: pure decimal integers (`2130706433`), hexadecimal IPs, wildcard/broadcast binding (`0.0.0.0`, `0.0.0.0/8`), Carrier-Grade NAT (`100.64.0.0/10`), benchmarking ranges (`198.18.0.0/15`), IPv6 link-local/unique-local, and cloud metadata hostnames (`169.254.169.254`, `metadata.google.internal`).
   - Outbound developer webhooks and integration requests must pass this validation prior to connection initiation.

2. **Enterprise HTTP Security Headers (`SecurityHeadersMiddleware`)**:
   - Implemented and registered global NestJS middleware applying:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `X-XSS-Protection: 1; mode=block`
     - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none';`
     - Omission of `X-Powered-By`.

3. **Global BigInt Serialization Handling (`TransformInterceptor`)**:
   - Added recursive `serializeBigInts()` deep-traversal to `TransformInterceptor` and defined fallback `(BigInt.prototype).toJSON` to prevent 500 unhandled exceptions when serializing Prisma BigInt properties (such as database backup `sizeBytes`).

4. **Server-Side Authority & Multi-Tenant Boundaries**:
   - Reinforced the invariant: Client state is never authoritative. Client-supplied `organisationId`, `outletId`, `role`, or `isSuperAdmin` within request bodies or headers are strictly rejected or superseded by validated JWT token claims.
   - Cross-organisation access attempts unconditionally yield `403 Forbidden` or `404 Not Found`.

5. **AI Safety Boundaries**:
   - All AI features wrap untrusted user inputs with immutable boundary markers and enforce strict regex blocking for prompt injection and medical advice.
   - AI tools operate through strongly typed domain services; zero direct raw SQL tools (`executeSQL`) are exposed.

6. **Comprehensive Automated Penetration QA Regression Suite**:
   - Implemented `services/api/test/penetration-qa.e2e-spec.ts` executing 27 end-to-end attack scenarios across headers, SSRF, IDOR, RBAC, mass assignment, SQL/XSS injections, authentication, AI safety, sensitive data exposure, and SaaS billing.

## Consequences
- The platform achieves 100% pass rate across the Day 59 penetration QA test suite with zero open Critical or High findings.
- All HTTP responses carry defensive security headers.
- The platform is officially approved as **GO** for Day 60 Release Candidate.
