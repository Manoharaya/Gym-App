# Privacy Security Architecture

## 1. Zero Trust & Identity Invariants
- **Server-Side Authorization**: Client-provided IDs (`memberId`, `organisationId`) are never trusted. Identity is extracted exclusively from the authenticated session JWT.
- **Tenant Isolation**: Every privacy request, export artifact, deletion plan, and retention hold is strictly scoped by `organisationId`.
- **IDOR Defense**: All member endpoints verify that the target resource belongs to the current user's authenticated member profile.

## 2. Cryptographic Controls
- **Artifact Encryption**: All export archives are encrypted using AES-256-GCM.
- **Token Hashing**: Download tokens are hashed with SHA-256 in the database. Plaintext tokens are returned once to the client.
- **Expiring Links**: Export downloads expire in 24 hours and enforce an automatic download quota limit (3 max).
