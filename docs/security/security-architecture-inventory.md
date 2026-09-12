# FitCore — Security Architecture Inventory

## Overview
This document details the comprehensive security boundaries, trust domains, authorization perimeters, sensitive data topologies, and credential protection mechanisms for the FitCore platform across Days 1 through 59.

---

## 1. System Trust & Security Boundaries

```
[ Public Internet / Untrusted Client ]
               │
               ▼ (TLS 1.3 / HTTPS)
    ┌──────────────────────┐
    │  Edge Security Proxy │  ← Rate Limiting, DDoS, Strict Host Header
    └──────────┬───────────┘
               │
               ▼ (Defensive Headers: nosniff, DENY, HSTS, CSP)
    ┌────────────────────────────────────────────────────────┐
    │  FitCore NestJS API Layer                              │
    │  - RequestIdMiddleware & SecurityHeadersMiddleware     │
    │  - Global ValidationPipe (forbidNonWhitelisted: true)  │
    │  - Global JwtAuthGuard (Token Verification & Sessions) │
    │  - Global TenantGuard (Organisation & Outlet Scope)    │
    │  - Global RolesGuard & PermissionsGuard (RBAC/ABAC)    │
    └──────────┬──────────────────────┬──────────────────────┘
               │                      │
       ┌───────┴──────┐       ┌───────┴──────┐
       ▼              ▼       ▼              ▼
 ┌──────────┐   ┌──────────┐ ┌──────────┐ ┌──────────┐
 │PostgreSQL│   │  Redis   │ │ BullMQ   │ │ External │
 │ (Prisma) │   │ (Tokens, │ │ Workers  │ │ Providers│
 │ RLS/ACL  │   │ Sessions)│ │ (Jobs)   │ │(Stripe...)│
 └──────────┘   └──────────┘ └──────────┘ └──────────┘
```

### 1.1 Trust Boundaries
1. **Public vs. Authenticated Perimeter**:
   - Only explicitly annotated `@Public()` routes bypass `JwtAuthGuard` (e.g. `/api/v1/auth/login`, `/health`).
   - All other endpoints require a signed, unexpired JWT representing an active, non-revoked session.
2. **Tenant Boundary (Organisation Isolation)**:
   - Every request with an authenticated context resolves `effectiveOrgId`.
   - Any client attempt to inject an unauthorized `organisationId` via headers (`x-organisation-id`) or path/query parameters triggers an immediate `403 Forbidden` (`TenantGuard`).
3. **Outlet Boundary (Branch Scoping)**:
   - Non-headquarters staff (`RECEPTION`, `TRAINER`, `OUTLET_MANAGER`) are bound strictly to assigned `outletId` values. Cross-branch mutation without org-wide scope is blocked.
4. **Service-to-Service Boundary**:
   - Internal background workers (BullMQ) communicate with PostgreSQL via Prisma using isolated connection pooling.
   - Redis cluster operates in a dedicated private VPC subnet with TLS and password authentication.
5. **External Provider Boundary**:
   - Outbound requests to Stripe, SendGrid, Twilio, and LLM gateways use TLS 1.3 with validated URLs (`validateUrlSafe` SSRF protection).

---

## 2. Authentication & Authorization Perimeter

### 2.1 Authentication Boundaries
- **Primary Auth**: Argon2/Bcrypt password hashing (work factor 10+) with zero plain-text retention.
- **Session Issuance**: Dual-token pattern (`accessToken` 15m lifetime, cryptographically random `refreshToken` 7d lifetime).
- **Refresh Token Rotation**: Each refresh cycle consumes the active token and issues a new pair. Replaying an old refresh token instantly invalidates the entire token family and triggers a critical security event.
- **MFA Challenge Flow**:
  - Two-step progression: `PASSWORD VALIDATED → MFA_REQUIRED → MFA_VERIFIED → SESSION ISSUED`.
  - TOTP secrets encrypted in database with AES-256-GCM.
  - Recovery codes hashed with SHA-256 and atomically consumed (single-use).
- **Brute-Force & Lockout**: 5 consecutive failed login attempts lock the account for 15 minutes, returning constant-time generic responses to prevent user enumeration.

### 2.2 Role-Based Access Control (RBAC) Matrix
| Role | Platform Admin | Org Owner Scope | Outlet Scope | Financial Mutations | Health / PAR-Q Data |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SUPERADMIN** | Yes (Global) | All | All | Global Oversight | Authorized Audits |
| **ORGANISATION_OWNER** | No | Full Org | All Outlets in Org | Yes | Org Policy Governed |
| **OUTLET_MANAGER** | No | No | Assigned Outlet Only | Read-Only Summary | Operational Access |
| **RECEPTION** | No | No | Assigned Outlet Only | Point-of-Sale / Check-in | Emergency Only |
| **TRAINER** | No | No | Assigned Outlet Only | None | Assigned Members Only |
| **FINANCE** | No | Full Org | All Outlets in Org | Yes | No |
| **MEMBER** | No | Self Only | Permitted Outlets | Self Payment Only | Self Only |

---

## 3. Data Store & Sensitive Data Topologies

### 3.1 Data Stores
- **PostgreSQL 16 (Primary RDBMS)**:
  - Managed via Prisma ORM.
  - Foreign key constraints, cascade controls, unique indexes, soft-delete flags (`deletedAt`).
  - Strict parameterization on 100% of queries.
- **Redis 7 (In-Memory Data Store)**:
  - Session tokens, rate limit counters, lockouts, idempotency keys, and pub/sub message queues.
  - Key namespacing: `tenant:{orgId}:session:{sessionId}`, `rate:{ip}:{route}`.
- **Object Storage (AWS S3 / MinIO)**:
  - Private buckets by default (`BlockPublicAcls`, `IgnorePublicAcls`, `RestrictPublicBuckets`).
  - Ephemeral pre-signed URLs (maximum 15 minutes TTL) for authorized document retrieval.

### 3.2 Sensitive Data Locations & Redaction Rules
| Sensitive Data Item | Storage Location | Protection Strategy | Log Redaction Rule |
| :--- | :--- | :--- | :--- |
| User Passwords | `User.passwordHash` | Bcrypt hash | Sanitized / Never logged |
| Refresh Tokens | `Session.refreshTokenHash` | SHA-256 hash | Never logged |
| MFA TOTP Secret | `UserMfaMethod.secretKey` | AES-256-GCM encrypted | Redacted as `***` |
| MFA Recovery Codes | `MfaRecoveryCode.codeHash` | SHA-256 hash | Never logged |
| Payment Card Data | Stripe / External PCI Vault | Zero PAN stored on FitCore | Prohibited from entering FitCore |
| PAR-Q & Medical Info | `MemberMedicalRecord` | Encrypted / Restrictive RBAC | Redacted from standard analytics |
| Developer API Keys | `ApiKey.keyHash` | SHA-256 hash | Prefix shown only (`fc_live_...`) |
| Webhook Secrets | `WebhookSubscription.secret` | AES-256-GCM / SHA-256 | Returned once upon creation |

---

## 4. External Integrations & Boundary Controls

### 4.1 Payment Gateways (Stripe)
- Inbound webhooks validated via HMAC-SHA256 signature verification (`Stripe-Signature`).
- Replay protection via idempotency cache and event timestamp validation (tolerate <= 300s clock skew).
- State transitions: `UNKNOWN` or `PENDING` states never auto-resolve to `SUCCESS`.

### 4.2 Developer Platform & Webhook Dispatch
- All outbound webhook target URLs verified against SSRF via `DeveloperSecurityService.validateUrlSafe`.
- Rejects loopback (`127.0.0.1`, `localhost`), broadcast (`0.0.0.0`), private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Carrier-Grade NAT (`100.64.0.0/10`), decimal/hex IPs, IPv6 local/mapped, and cloud metadata (`169.254.169.254`, `metadata.google.internal`).

### 4.3 AI Subsystems (LLM Integrations)
- Strict boundary encapsulation via `AISafetyService`.
- Untrusted user input enclosed in boundary markers (`### BEGIN UNTRUSTED USER INPUT ###`).
- Prompt injection & jailbreak detection patterns block override attempts.
- Output sanitization redacts system instruction echo.
- **Zero raw SQL tools (`executeSQL`)**: AI features invoke strictly typed domain services with tenant validation.

---

## 5. Administrative Endpoints
- Base path: `/api/v1/platform-admin/*`
- Guarded by `JwtAuthGuard` + `RolesGuard(Role.SUPERADMIN)`.
- Includes:
  - `/api/v1/platform-admin/disaster-recovery/*`
  - `/api/v1/platform-admin/observability/*`
  - `/api/v1/platform-admin/tenants/*`
- All administrative invocations log immutable audit records into `SecurityEvent` and `AuditLog`.
