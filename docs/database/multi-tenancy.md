# FitCore Multi-Tenancy Architecture & Security Model

## Zero-Trust Multi-Tenancy Design

FitCore is designed from Day 1 as a **multi-tenant enterprise fitness SaaS**. Zero-trust isolation dictates that no tenant can ever view, modify, or infer data belonging to another tenant under any circumstance.

```text
FITCORE PLATFORM
│
├── Platform (FitCore Global SuperAdmin)
│
├── Organisation A (Second Wind Athletic Club)
│   ├── Perth CBD Outlet
│   └── Fremantle Outlet
│
└── Organisation B (Apex Strength Co)
    └── Sydney CBD Outlet
```

---

## 1. Application-Layer Enforcement (Current Active Implementation)

Every request to the FitCore API is subject to runtime tenant boundary verification:

1. **Identity Extraction**:
   - The user's authenticated identity is decoded from their JWT access token.
   - User roles and organizational memberships are loaded from `user_roles`.
2. **Tenant Parameter Verification**:
   - If a request specifies an organization via route parameters (`/api/v1/organisations/:organisationId`) or custom headers (`x-organisation-id`):
     - The `TenantGuard` executes before controller handler invocation.
     - If the user's role assignments do NOT include the requested organization, the request is rejected immediately with **`403 FORBIDDEN`**:
       `Cross-tenant access forbidden: User cannot access organisation <id>`
3. **Outlet Scoping**:
   - If a user has branch-specific roles (e.g. `OUTLET_MANAGER`, `RECEPTION`, `TRAINER`, `MEMBER`), access to other outlets within the same organization is denied with **`403 FORBIDDEN`** unless the user possesses an organization-wide administrative role (`ORGANISATION_OWNER`, `FINANCE`).
4. **Platform SuperAdmin Exception**:
   - Platform superadministrators (`role: SUPERADMIN`, `scope: PLATFORM`) are permitted to query across all organizations for administrative oversight, maintenance, and platform reporting.

---

## 2. PostgreSQL Row-Level Security (RLS) Migration Strategy

For defense-in-depth, FitCore's PostgreSQL database schema is architected to support **native PostgreSQL Row-Level Security (RLS)**.

### How RLS Integrates with Prisma:
Prisma runs queries against a shared connection pool. To enforce database-level RLS:
1. When executing a tenant-scoped transaction, the application sets a local PostgreSQL session setting:
   ```sql
   SET LOCAL app.current_tenant_id = 'org_dev_secondwind_001';
   ```
2. PostgreSQL evaluates the table RLS policy on every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` statement.

### Production RLS Policy Definition (SQL Blueprint):
```sql
-- Enable RLS on tenant-partitioned tables
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Define RLS Isolation Policy
CREATE POLICY tenant_isolation_outlets ON outlets
  FOR ALL
  USING (
    organisation_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY tenant_isolation_audit ON audit_logs
  FOR ALL
  USING (
    organisation_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_superadmin', true) = 'true'
  );
```

> [!NOTE]
> Application-layer tenant isolation is actively validated by automated tests (`tenant-isolation.e2e-spec.ts`). Database-level RLS policies are scheduled for activation during the production database hardening milestone.
