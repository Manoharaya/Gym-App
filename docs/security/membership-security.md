# FitCore Membership Domain Security Architecture

## Overview

The FitCore Membership security model adheres to zero-trust multi-tenancy, granular Role-Based Access Control (RBAC), immutable commercial term audit trails, and strict Insecure Direct Object Reference (IDOR) prevention.

---

## 1. Multi-Tenant Boundary Isolation

### Zero-Trust Tenancy
Every `MembershipPlan` and `MemberMembership` record is strictly partitioned by `organisationId`.
1. **Tenant Filtering**: The API middleware and Prisma query filters mandate that `organisationId` from the verified JWT context matches the resource's `organisationId`.
2. **Anti-Enumeration / 404 Behavior**: Requests attempting to access or manipulate plans or memberships belonging to a different tenant receive a `404 Not Found` response rather than a `403 Forbidden`. This prevents cross-tenant resource enumeration.
3. **Cross-Tenant Access Prohibited**: In the access policy engine (`check-access`), facility access requests immediately evaluate whether the outlet's organisation matches the membership's organisation. Cross-organisation access is denied without evaluating secondary rules.

---

## 2. Insecure Direct Object Reference (IDOR) Protection

Members interact with their memberships via `/api/v1/memberships/me/*` endpoints:
- The server extracts `userId` directly from the authenticated JWT session.
- The server looks up the corresponding `MemberProfile` for that user within the active tenant.
- If a member attempts to pass another member's profile ID or access another member's membership details, the server rejects the request with `403 Forbidden` or `404 Not Found`.

---

## 3. Granular RBAC Permissions

Day 5 introduces 15 discrete permissions across 3 resource scopes:

| Resource Scope | Permission | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `membership_plans` | `membership_plans:create` | `ORG_OWNER`, `OUTLET_MANAGER` | Create new plan templates |
| `membership_plans` | `membership_plans:read` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `MEMBER` | Read catalog plans |
| `membership_plans` | `membership_plans:update` | `ORG_OWNER`, `OUTLET_MANAGER` | Update plan details |
| `membership_plans` | `membership_plans:delete` | `ORG_OWNER` | Delete unassigned plans |
| `membership_plans` | `membership_plans:archive` | `ORG_OWNER`, `OUTLET_MANAGER` | Soft-delete / retire plans |
| `memberships` | `memberships:create` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Assign new memberships |
| `memberships` | `memberships:read` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `MEMBER` | View memberships |
| `memberships` | `memberships:update` | `ORG_OWNER`, `OUTLET_MANAGER` | Update membership parameters |
| `memberships` | `memberships:cancel` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Cancel a membership |
| `memberships` | `memberships:pause` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Freeze a membership |
| `memberships` | `memberships:resume` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Unfreeze a membership |
| `memberships` | `memberships:renew` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Renew term |
| `memberships` | `memberships:check_access` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `STAFF` | Run access policy checks |
| `entitlements` | `entitlements:manage` | `ORG_OWNER`, `OUTLET_MANAGER` | Manage plan entitlements |
| `entitlements` | `entitlements:read` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `MEMBER` | View entitlements |

---

## 4. Immutable Commercial Snapshotting

To guard against unauthorized price modifications or retroactive billing disputes:
- When a `MemberMembership` is instantiated, the server copies:
  - `planNameAtPurchase`
  - `priceAtPurchase`
  - `currencyAtPurchase`
  - `billingTypeAtPurchase`
  - `durationValueAtPurchase`
  - `durationUnitAtPurchase`
- Subsequent changes made by club managers to the catalog plan (e.g. raising the monthly fee from $65 to $75) will **never** alter existing active member subscriptions.

---

## 5. Auditable State Machine & History

1. **Strict State Transitions**: Transitions outside the verified state diagram (e.g. transitioning directly from `CANCELLED` back to `ACTIVE`) are rejected by `MembershipLifecycleService` with `BadRequestException`.
2. **Immutable History Log**: Every status change writes an entry to `MemberMembershipHistory` capturing:
   - `fromStatus`
   - `toStatus`
   - `reason`
   - `changedById`
   - `metadata`
   - `createdAt`
3. **Audit Log Integration**: High-impact lifecycle events (pause, resume, cancel, renew) emit FitCore structured `AuditEvent` records with user identity, client IP, user agent, and request ID.
