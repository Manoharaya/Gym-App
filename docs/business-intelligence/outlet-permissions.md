# Multi-Outlet Intelligence Permissions & Scoping (RBAC & IDOR Defense)

## 1. Role-Based Access Control (RBAC) Matrix

Multi-outlet performance data includes sensitive financial totals, profit attribution, and cross-branch employee performance. FitCore enforces strict RBAC barriers:

| Role | Multi-Outlet Access | Scoping Enforcement | Prohibited Actions |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Full Global Access | Cross-organisation permitted | None |
| `OWNER` | Full Organisation Access | Bound to caller's `organisationId` | Accessing other organisations |
| `ADMIN` | Full Organisation Access | Bound to caller's `organisationId` | Accessing other organisations |
| `OUTLET_MANAGER` | Restricted to Assigned Outlet | Bound to `user.outletId` only | Querying cross-outlet comparative matrices, viewing peer outlets |
| `TRAINER` | **Forbidden (403)** | No access to multi-outlet BI | All access blocked |
| `MEMBER` | **Forbidden (403)** | No access to multi-outlet BI | All access blocked |

---

## 2. Insecure Direct Object Reference (IDOR) Defense

To prevent an Outlet Manager from viewing peer outlet data:
1. `OutletPermissionService.resolveScope(user, requestedOutletId)` validates whether `user.role === 'OUTLET_MANAGER'`.
2. If `user.outletId !== requestedOutletId`, the service immediately throws `ForbiddenException('Forbidden: Outlet Manager can only access their assigned outlet')`.
3. If an Outlet Manager attempts to query organisation-wide comparative or ranking endpoints without specifying an outlet, the request is restricted exclusively to their assigned outlet.
4. Tenant isolation is enforced at the database level by verifying that all requested `outletId` values belong to `user.organisationId`.
