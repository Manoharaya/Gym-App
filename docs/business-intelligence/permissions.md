# Permissions, RBAC & Multi-Tenant Scoping

## Overview
Business Intelligence aggregates sensitive organizational revenue, member churn, and staffing metrics. Strict role-based access control (RBAC) and IDOR defenses are enforced server-side.

---

## Role Access Matrix

| Role | Scope Capability | Can View Org Level? | Can Filter by Outlet? | Can View Other Outlets? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Platform Wide | Yes (All Orgs) | Yes | Yes | Allowed |
| `ORGANISATION_OWNER` | Full Organisation | Yes | Yes | Yes (Within Org) | Allowed |
| `ORGANISATION_ADMIN` | Full Organisation | Yes | Yes | Yes (Within Org) | Allowed |
| `FINANCE_MANAGER` | Financial & KPIs | Yes | Yes | Yes (Within Org) | Allowed |
| `OUTLET_MANAGER` | Assigned Outlet Only | No (Forced to Outlet) | No (Locked) | **No (HTTP 403 IDOR)** | Restricted |
| `STAFF` | Assigned Outlet Only | No (Forced to Outlet) | No (Locked) | **No (HTTP 403 IDOR)** | Restricted |
| `TRAINER` | None | **No (HTTP 403)** | **No (HTTP 403)** | **No (HTTP 403)** | **Forbidden** |
| `MEMBER` | None | **No (HTTP 403)** | **No (HTTP 403)** | **No (HTTP 403)** | **Forbidden** |

---

## Scope Resolution (`BusinessIntelligencePermissions.resolveScope`)

The server-side resolver computes the effective data boundary:

```ts
export interface ResolvedBiScope {
  organisationId: string;
  outletId?: string;
  roleScope: 'PLATFORM' | 'ORGANISATION' | 'OUTLET';
  userRole: string;
  allowedOutlets: string[];
}
```

### Enforcement Rules:
1. **Members Forbidden**: If the user has only `MEMBER` role, an immediate `ForbiddenException(403)` is raised.
2. **Trainers Forbidden**: If the user has only `TRAINER` role, an immediate `ForbiddenException(403)` is raised.
3. **Outlet Managers Scoped**: If an `OUTLET_MANAGER` passes an `outletId` parameter for an outlet they do not manage, the server rejects the request with HTTP 403.
4. **Cross-Tenant Zero Leakage**: Database queries enforce `organisationId: scope.organisationId`. An authenticated user from Organization A cannot query metrics for Organization B under any circumstance.
