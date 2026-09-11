# Enterprise Security Architecture

## 1. Multi-Tenant Isolation
FitCore enforces strict multi-tenant boundary isolation at the database, service, and controller layers:
* Every enterprise entity maintains an immutable `organisationId`.
* All queries filter by `organisationId`.
* API controllers enforce tenant context extraction from JWT claims and `x-organisation-id` request headers.

## 2. Security Invariants
1. **Hard Ceiling Immutability**: Child scopes cannot loosen security thresholds defined by parent scopes marked `isHardCeiling: true`.
2. **Strict Rank Authority**: Role assignments require `actorHighestLevel > targetLevel`. Self-elevation and lateral elevation are blocked.
3. **Audit Immutability**: Administrative changes trigger structured audit events stored in `audit_logs`.
4. **Preserved Ledger Integrity**: Outlet and brand decommissioning uses soft archival (`status: 'DELETED' | 'ARCHIVED'`, `deletedAt`), strictly preventing destructive SQL deletes.
