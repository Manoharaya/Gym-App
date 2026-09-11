# Scoped Enterprise Access Control

## 1. Overview
In enterprise gym chains, staff often hold responsibilities bounded to specific brands, regions, or physical clubs. `EnterpriseRoleAssignment` decouples roles from rigid single-outlet constraints, introducing flexible spatial and organizational scoping.

## 2. Scope Types
1. `PLATFORM`: Applies across the entire SaaS infrastructure (Superadmin only).
2. `ORGANISATION`: Unbounded access across all brands, regions, and outlets within the enterprise.
3. `BRAND`: Access strictly bounded to outlets affiliated with a specific `brandId`.
4. `REGION`: Access bounded to outlets located within a geographic territory (e.g. State `WA`).
5. `OUTLET`: Access bounded to a singular physical location (`outletId`).

## 3. Temporal Validity & Lifecycle
Role assignments support time-bounded delegations:
* `validFrom`: Start timestamp for scheduled roles.
* `validTo`: Optional automatic expiration timestamp (e.g., temporary regional coverage).
* `status`: Transitions across `SCHEDULED` -> `ACTIVE` -> `EXPIRED` / `REVOKED`.

## 4. Automatic RBAC Compatibility
When an `EnterpriseRoleAssignment` is created, the system synchronizes a corresponding `UserRole` record to ensure existing auth guards (`JwtAuthGuard`, `RolesGuard`, `can()`) continue functioning with zero performance degradation.
