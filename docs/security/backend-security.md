# FitCore Backend Security Architecture

## Authentication & Token Architecture

FitCore implements a stateless access token and stateful refresh token architecture designed according to OAuth 2.0 Security Best Current Practice (BCP / RFC 6819).

```mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile / Web Client
    participant API as FitCore API Gateway
    participant Auth as AuthService
    participant RL as RateLimiterService
    participant DB as PostgreSQL

    Client->>API: POST /api/v1/auth/login (email, password)
    API->>RL: Check rate limit for IP/email
    API->>Auth: validateUser() + bcrypt.compare()
    Auth->>DB: Create Session (tokenFamily: UUID)
    Auth->>DB: Store hashed refreshToken in RefreshToken table
    Auth-->>Client: Return Access Token (15m) + Refresh Token (7d)

    Note over Client,API: Token Rotation Flow
    Client->>API: POST /api/v1/auth/refresh (refreshToken)
    API->>Auth: Verify JWT & lookup tokenHash
    Auth->>DB: Check if isRevoked == true
    alt Token already revoked (REUSE DETECTED!)
        Auth->>DB: Invalidate entire Session (isValid = false)
        Auth-->>Client: 401 Unauthorized (Security violation: Token reuse detected)
    else Token is valid
        Auth->>DB: Mark old token isRevoked = true
        Auth->>DB: Insert new rotated hashed RefreshToken
        Auth-->>Client: Return new Access Token + new Refresh Token
    end
```

---

## 1. Refresh Token Rotation & Compromise Detection

- **Short-Lived Access Tokens**: Signed with `JWT_SECRET`, expiring in 15 minutes.
- **Single-Use Refresh Tokens**: Each refresh token is strictly valid for a single exchange.
- **Family Invalidation on Reuse**:
  - When a client presents a refresh token that has already been consumed (`isRevoked: true`), the server infers that the token was intercepted by a malicious third party.
  - The server immediately invalidates the entire `Session` (`isValid: false`) and rejects all subsequent requests from that session family, protecting the legitimate user from token theft.

---

## 2. Brute-Force Rate Limiting (`RateLimiterService`)

To safeguard authentication endpoints from credential-stuffing and password brute-force attacks:
- **Rate Limiting Window**: Tracks failed attempts within a 15-minute sliding window.
- **Threshold**: Accounts or IPs exceeding **5 consecutive failures** receive `429 Too Many Requests`.
- **Hybrid Storage**: Backed by Redis with seamless local in-memory fallback to ensure protection even if cache infrastructure experiences momentary interruption.
- **Success Reset**: Legitimate successful authentication clears failed counters immediately.

---

## 3. IDOR Defense & Tamper Prevention

FitCore eliminates Insecure Direct Object References through multi-level controls:
- **Relational Hierarchical Routing**: Endpoints like `/organisations/:orgId/outlets` enforce tenant boundary validation via `TenantGuard`.
- **Flat Route Ownership Inspection**: Endpoints like `GET /outlets/:id` or `GET /users/:userId` verify that the requested entity belongs to an organisation where the caller holds active authorization.
- **Immutability of Tenant Keys**: Client DTOs cannot supply or modify `organisationId` or `outletId` on updates.

---

## 4. Privilege Escalation Prevention

The `PermissionsService.validateRoleAssignment` layer enforces:
- **Strict Role Weight Hierarchy**: No user can grant or revoke a role whose rank is equal to or exceeds their own rank (`SUPERADMIN [100] > OWNER [80] > MANAGER [60] > STAFF [40] > MEMBER [10]`).
- **Tenant Confinement**: Administrators can only administer roles within their designated organization.
- **Target User Immunity**: Non-superadmin actors cannot alter the privileges of equal or higher-ranked users (e.g. managers cannot edit owners).

---

## 5. Structured Logging & PII Redaction

To maintain compliance with privacy regulations (Australian Privacy Principles / GDPR / HIPAA) and prevent credential leakage:

- **Automatic Field Sanitization**: The `StructuredLogger` intercepts all log messages and recursively redacts sensitive fields:
  - `password`, `passwordHash`
  - `token`, `refreshToken`, `accessToken`
  - `authorization` headers
  - `creditCard`, `cardNumber`, `cvv`
  - Sensitive member biometric/health records
- **Output Format**: All logs are emitted as single-line structured JSON records containing `timestamp`, `level`, `context`, `message`, and sanitized metadata.

---

## 6. Role-Based Access Control (RBAC) Matrix

| Role | Target Scope | Key Allowed Operations |
| :--- | :--- | :--- |
| **SUPERADMIN** | Platform (Global) | Manage all organisations, platform configs, global audits |
| **ORGANISATION_OWNER** | Organisation-wide | Manage all club outlets, view consolidated reports & audits |
| **OUTLET_MANAGER** | Assigned Outlet | Manage branch staff, branch attendance, operational schedules |
| **RECEPTION** | Assigned Outlet | Member check-in, turnstile access, desk inquiries |
| **TRAINER** | Assigned Clients | Client workout tracking, program assignment, appointment logs |
| **FINANCE** | Organisation-wide | View billing, invoices, revenue streams, Xero sync |
| **MEMBER** | Self | View personal profile, personal workout logs, book sessions |

*(For complete RBAC rules and privilege escalation validation logic, see `docs/security/rbac.md`.)*
