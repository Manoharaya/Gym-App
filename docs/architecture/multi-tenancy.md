# FitCore Multi-Tenancy Architecture

## Core Philosophy

FitCore is designed from Day 1 as an enterprise multi-tenant software-as-a-service (SaaS) platform. No component, hook, service, or database query may assume the existence of a single gym or single outlet.

---

## The Tenant Hierarchy

```text
┌──────────────────────────────────────────────┐
│                   Platform                   │
│             (FitCore Global SaaS)            │
└──────────────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌──────────────┐                ┌──────────────┐
│ Organisation │                │ Organisation │
│ (e.g. Club A)│                │ (e.g. Club B)│
└──────┬───────┘                └──────┬───────┘
       │                               │
  ┌────┴────────┐                 ┌────┴────────┐
  ▼             ▼                 ▼             ▼
┌──────────┐ ┌──────────┐       ┌──────────┐ ┌──────────┐
│ Outlet 1 │ │ Outlet 2 │       │ Outlet 1 │ │ Outlet 2 │
│ (CBD)    │ │ (Suburbs)│       │ (North)  │ │ (South)  │
└────┬─────┘ └────┬─────┘       └────┬─────┘ └────┬─────┘
     │            │                  │            │
     ▼            ▼                  ▼            ▼
   Users        Users              Users        Users
 (Members,    (Members,          (Members,    (Members,
  Trainers,    Trainers,          Trainers,    Trainers,
  Managers)    Managers)          Managers)    Managers)
```

---

## Scoping Contracts

Every data operation must declare its multi-tenant scope:

```typescript
export interface TenantContext {
  organisationId: string;
  organisationName: string;
  outletId?: string;
  outletName?: string;
  userId: string;
  role: UserRole;
  isDevSeed?: boolean;
}
```

### Request Injection

All outbound HTTP requests from `@fitcore/api-client` automatically append tenant context headers:

- `x-organisation-id`: `org_xxx`
- `x-outlet-id`: `outlet_xxx` (when bound)
- `x-request-id`: `req_timestamp_entropy`

The backend middleware enforces tenant boundary checks before parsing request bodies, rejecting any cross-tenant data requests with `403 Forbidden` (`FORBIDDEN` / `TENANT_MISMATCH`).

---

## Role & Permission Model

### Roles

1. `SUPERADMIN`: Global platform administration.
2. `ORGANISATION_OWNER`: Full executive control over their organisation and all subordinate outlets.
3. `OUTLET_MANAGER`: Operational control over their specific branch/outlet.
4. `RECEPTION`: Front-desk operations (check-ins, walk-ins, retail POS).
5. `TRAINER`: Client training, session scheduling, program prescription for assigned members.
6. `FINANCE`: Invoicing, payment reconciliation, Xero ledger export.
7. `MEMBER`: Access to own profile, bookings, workouts, health records, and AI coach.

### Permission Dimensions

Permissions are evaluated across three dimensions:

- **Resource**: `members`, `payments`, `health_data`, `appointments`, `ai`, `reports`, `workouts`, etc.
- **Action**: `read`, `write`, `create`, `delete`, `manage`, `use`, `configure`, `export`.
- **Scope**:
  - `PLATFORM`: Across all organisations (Superadmin only).
  - `ORGANISATION`: Across all outlets within the active organisation.
  - `OUTLET`: Restricted strictly to authorized outlet(s).
  - `ASSIGNED_CLIENTS`: Restricted to members assigned to that trainer.
  - `SELF`: Restricted to the authenticated user's own data records.
