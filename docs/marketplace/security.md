# Marketplace Security & Multi-Tenant Isolation

## 1. Multi-Tenant Boundary Enforcement
* All installation lifecycle mutations (`install`, `configure`, `pause`, `resume`, `upgrade`, `uninstall`) require an authenticated user with an explicit organisation context (`x-organisation-id` header or primary membership).
* Queries filter strictly by `organisationId`. Attempts to manipulate installations of another gym tenant throw HTTP 404 (IDOR defense).

## 2. Least-Privilege Permission Grants
* Applications cannot access resources outside of their granted permission set.
* The API gateway validates `MarketplacePermissionGrant` records before allowing third-party API invocations.

## 3. Audit Trail Integrity
All sensitive operations are logged in `MarketplaceAuditLog`:
* `APP_INSTALLED`, `APP_UNINSTALLED`, `PERMISSIONS_GRANTED`, `PERMISSIONS_REVOKED`, `HEALTH_PII_CONSENTED`.
* Includes user ID, IP address, user agent, timestamp, and before/after metadata snapshots.
