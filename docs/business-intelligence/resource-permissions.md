# Resource Intelligence Permissions & RBAC Defenses

## 1. Overview
Multi-tenant isolation and role-based access control (RBAC) are enforced by `ResourcePermissionService` at the application layer and backed by JWT authentication (`JwtAuthGuard`).

---

## 2. Role-to-Scope Matrix

| Role | Scope Resolved | Permissions Allowed | Restrictions & Defenses |
| :--- | :--- | :--- | :--- |
| `SUPERADMIN` | Platform-wide | Full access to all organisations and outlets | None |
| `ORGANISATION_OWNER` / `ADMIN` | Organisation-wide | Full access across all outlets of their organisation | Cannot access other organisation IDs |
| `OUTLET_MANAGER` | Single Outlet | Access constrained strictly to assigned `outletId` | Accessing other `outletId` returns `403 Forbidden` (IDOR Defense) |
| `TRAINER` | Single Trainer | Can query only their own trainer capacity (`/trainers`) | Blocked from `/overview`, `/comparison`, `/trends` (`403 Forbidden`) |
| `MEMBER` | None | **Zero access** | Blocked with `403 Forbidden` on all intelligence endpoints |

---

## 3. IDOR Defense Implementation
Every parameterized request (e.g. `/resources/:resourceId` or `/trainers?trainerId=...`) verifies resource tenancy against caller scope:
```typescript
async assertCanAccessResource(user: any, resourceId: string): Promise<any> {
  const scope = await this.resolveScope(user);
  const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
  
  if (!resource || resource.organisationId !== scope.organisationId) {
    throw new NotFoundException(`Resource ${resourceId} not found`);
  }
  
  if (scope.outletId && resource.outletId !== scope.outletId) {
    throw new ForbiddenException('Forbidden: Resource belongs to a different outlet');
  }
  
  return resource;
}
```
Attempting to access a resource from another organisation returns `404 Not Found`, while accessing an unauthorized outlet within the organisation returns `403 Forbidden`.
