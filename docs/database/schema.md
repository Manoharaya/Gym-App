# FitCore Database Schema & ER Design

## Entity-Relationship Diagram

```mermaid
erDiagram
    ORGANISATIONS ||--o{ OUTLETS : "has many"
    ORGANISATIONS ||--o{ USER_ROLES : "scopes"
    ORGANISATIONS ||--o{ INVITATIONS : "issues"
    ORGANISATIONS ||--o{ AUDIT_LOGS : "tracks"
    
    OUTLETS ||--o{ USER_ROLES : "scopes"
    OUTLETS ||--o{ USER_OUTLETS : "assigns"
    OUTLETS ||--o{ INVITATIONS : "scopes"
    OUTLETS ||--o{ AUDIT_LOGS : "tracks"
    
    USERS ||--o{ USER_ROLES : "holds"
    USERS ||--o{ USER_OUTLETS : "assigned to"
    USERS ||--o{ SESSIONS : "owns"
    USERS ||--o{ INVITATIONS : "invited / inviter"
    USERS ||--o{ AUDIT_LOGS : "initiates"
    
    ROLES ||--o{ USER_ROLES : "granted to"
    ROLES ||--o{ ROLE_PERMISSIONS : "contains"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "grouped in"
    
    SESSIONS ||--o{ REFRESH_TOKENS : "issues"

    ORGANISATIONS {
        string id PK
        string name
        string slug UK
        string status
        string timezone
        string currency
        string country
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    OUTLETS {
        string id PK
        string organisationId FK
        string name
        string slug
        string code
        string status
        string timezone
        string address
        string city
        string state
        string country
        string postalCode
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    USERS {
        string id PK
        string email UK
        string phone
        string passwordHash
        string firstName
        string lastName
        string displayName
        string status
        datetime emailVerifiedAt
        datetime lastLoginAt
        datetime createdAt
        datetime updatedAt
    }

    ROLES {
        string id PK
        string name UK
        string description
        boolean isSystemRole
        datetime createdAt
        datetime updatedAt
    }

    PERMISSIONS {
        string id PK
        string resource
        string action
        string scope
        string description
    }

    ROLE_PERMISSIONS {
        string id PK
        string roleId FK
        string permissionId FK
    }

    USER_ROLES {
        string id PK
        string userId FK
        string roleId FK
        string organisationId FK
        string outletId FK
        datetime createdAt
    }

    USER_OUTLETS {
        string id PK
        string userId FK
        string outletId FK
        datetime createdAt
    }

    INVITATIONS {
        string id PK
        string organisationId FK
        string outletId FK
        string email
        string role
        string tokenHash UK
        string status
        string invitedByUserId FK
        datetime expiresAt
        datetime acceptedAt
        datetime createdAt
        datetime updatedAt
    }

    SESSIONS {
        string id PK
        string userId FK
        string tokenFamily
        boolean isValid
        string userAgent
        string ipAddress
        datetime expiresAt
        datetime lastUsedAt
        datetime revokedAt
        datetime createdAt
        datetime updatedAt
    }

    REFRESH_TOKENS {
        string id PK
        string sessionId FK
        string tokenHash UK
        boolean isRevoked
        datetime expiresAt
        datetime createdAt
    }

    AUDIT_LOGS {
        string id PK
        string userId FK
        string organisationId FK
        string outletId FK
        string action
        string resource
        string resourceId
        json metadata
        string ipAddress
        string userAgent
        string requestId
        datetime createdAt
    }
```

---

## Core Tables & Indexing Strategy

1. **`organisations`**:
   - Primary key: `id` (cuid).
   - Unique: `slug` (for subdomain / custom slug resolution).
   - Indexes: `[slug]`, `[status]` for fast lookup during tenant resolution.
   - Soft Delete: `deletedAt` for compliant record preservation.
2. **`outlets`**:
   - Composite unique constraints: `[organisationId, slug]`, `[organisationId, code]`.
   - Foreign key: `organisationId` references `organisations(id)` with cascade deletion.
   - Indexes: `[organisationId]`, `[status]`, `[deletedAt]` ensures queries like "find all active outlets for Org A" run in sub-millisecond time.
3. **`users`**:
   - Unique: `email` (case-insensitive indexed).
   - Indexes: `[email]`, `[phone]`, `[status]`.
4. **`roles` & `permissions`**:
   - System-defined roles: `SUPERADMIN`, `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTION`, `TRAINER`, `FINANCE`, `MEMBER`.
   - Permissions composite unique key: `[resource, action, scope]` ensures deterministic RBAC policies without duplicates.
5. **`user_roles`**:
   - Scopes role assignments to an `organisationId` and optionally an `outletId`.
   - Indexes: `[userId]`, `[organisationId]`, `[outletId]`.
6. **`invitations`**:
   - Stores pending and accepted staff invitations.
   - Security: `tokenHash` (SHA-256) is uniquely indexed; raw tokens are never persisted.
   - Scoped to `organisationId` and optionally `outletId`.
   - Indexes: `[tokenHash]`, `[organisationId]`, `[email]`, `[status]`.
7. **`sessions` & `refresh_tokens`**:
   - `sessions.tokenFamily`: Tracks rotated token generations for compromise detection.
   - `sessions.lastUsedAt`: Audits recency of device access.
   - `refresh_tokens.tokenHash`: SHA-256 hash indexed uniquely.
8. **`audit_logs`**:
   - Indexes: `[userId]`, `[organisationId]`, `[outletId]`, `[createdAt]`.
   - Read-heavy audit queries filter by tenant and time window efficiently.
