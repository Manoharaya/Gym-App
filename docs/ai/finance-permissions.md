# AI Finance Permissions & Role-Based Access Control

## Overview

The AI Finance Assistant enforces strict, server-side tenant isolation and role-based access control via `FinancePermissionService`. Under no circumstances are client-provided headers or prompt queries permitted to broaden a user's authoritative data boundary.

---

## Role-Based Access Matrix

| Role | Authorised Query Scope | Allowed Operations | Forbidden Operations |
|---|---|---|---|
| **SUPERADMIN** | Platform-wide (all organisations, all outlets) | Full financial Q&A across any tenant | Cross-tenant data leakage in prompt replies |
| **ORGANISATION_OWNER** | Full Organisation (all outlets belonging to their org) | Organisation-wide summaries, comparisons, sync health | Access to other organisations |
| **FINANCE** | Full Organisation | Comprehensive financial metrics, tax reports, reconciliation | Access to other organisations |
| **OUTLET_MANAGER** | Strictly assigned Outlet(s) | Outlet revenue, invoices, members assigned to their outlet | Org-wide aggregates, other outlets |
| **RECEPTION** | Limited Front-Desk (assigned outlet) | Daily invoice lookup, payment confirmation | High-level financial KPIs, accounting sync |
| **MEMBER** | Self Only (Personal Billing) | Personal invoices, upcoming membership renewals | ANY organizational financial intelligence |
| **TRAINER** | NONE | FORBIDDEN | Immediate 403 Forbidden rejection |

---

## Scope Resolution Logic

```typescript
// FinancePermissionService.resolveScope()
if (role === 'TRAINER') {
  throw new ForbiddenException('Trainers do not have access to organisation financial intelligence');
}

if (role === 'MEMBER' && (requestedOutletId || requestedOrganisationId)) {
  throw new ForbiddenException('Members are restricted to their own billing history');
}

if (role === 'OUTLET_MANAGER') {
  if (requestedOutletId && !userOutlets.includes(requestedOutletId)) {
    throw new ForbiddenException(`Outlet Manager is not authorized to query outlet ${requestedOutletId}`);
  }
}
```
