# FitCore Membership Security Architecture

## Overview

The FitCore Membership security model adheres to zero-trust multi-tenancy, granular Role-Based Access Control (RBAC), immutable commercial term audit trails, and strict Insecure Direct Object Reference (IDOR) prevention.

---

## 1. Locked Ownership Model Security

### Invariant Enforcement
The following 10 invariants are strictly enforced across security guards, service logic, and database constraints:

1. **A `MembershipPlan` belongs to exactly one `Organisation`**: Plans are partitioned by `organisationId`.
2. **A `MemberMembership` belongs to exactly one `Organisation`**: Subscriptions cannot span or float across tenants.
3. **A `MemberMembership` references a Member belonging to that `Organisation`**: When assigning a plan, `memberProfile.organisationId` must equal the active tenant's `organisationId`. Cross-tenant assignment attempts fail with `404 Not Found` or `400 Bad Request`.
4. **A `MemberMembership` references a `MembershipPlan` belonging to that `Organisation`**: Plan and subscription organisations must match.
5. **`MemberOutlet` does NOT authorize physical gym access**: Facility access is evaluated strictly against active memberships, entitlements, and access scopes.
6. **Membership access is determined by active membership + entitlements + access scope**: Evaluating turnstile entry checks `status === 'ACTIVE' || 'TRIAL'`, date validity (`startDate <= now <= endDate`), entitlement existence (`GYM_ACCESS`), and outlet inclusion.
7. **`originOutletId`, if present, is informational/commercial provenance, NOT ownership**: It records where a membership was sold or initiated, never restricting member rights or determining physical access.
8. **A membership can grant access to multiple outlets**: Authorized via `MULTI_OUTLET` access scope and the `MemberMembershipOutlet` join table.
9. **A membership can grant access to all outlets in an organisation**: Authorized via `ALL_ORGANISATION_OUTLETS` access scope.
10. **Membership history must remain auditable**: Commercial terms are frozen at purchase, and status transitions are append-only.

---

## 2. Insecure Direct Object Reference (IDOR) Protection

Members interact with their memberships via `/api/v1/members/me/memberships/*` endpoints:
- The server extracts `userId` directly from the verified JWT access token.
- The server looks up the corresponding `MemberProfile` for that user within the active tenant.
- If a member attempts to access or manipulate another member's membership ID, the server rejects the request with `403 Forbidden` (`You do not have permission to view this membership`).
- Direct URL tampering is prevented; members can never inspect or mutate other members' subscription states.

---

## 3. Zero-Trust Tenant Isolation

1. **Tenant Filtering**: The API middleware mandates that `organisationId` from the verified JWT context matches the resource's `organisationId`.
2. **Anti-Enumeration / 404 Behavior**: Requests attempting to access or manipulate plans or memberships belonging to a different tenant receive a `404 Not Found` response rather than a `403 Forbidden`. This prevents cross-tenant resource enumeration.
3. **Cross-Tenant Access Prohibited**: In the access policy engine (`check-access`), facility access requests immediately evaluate whether the outlet's organisation matches the membership's organisation. Cross-organisation access is denied (`ORGANISATION_MISMATCH`).

---

## 4. Granular RBAC Permissions

| Resource Scope | Permission | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `membership_plans` | `membership_plans:create` | `ORG_OWNER`, `OUTLET_MANAGER` | Create new plan templates |
| `membership_plans` | `membership_plans:read` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `MEMBER` | Read catalog plans |
| `membership_plans` | `membership_plans:update` | `ORG_OWNER`, `OUTLET_MANAGER` | Update plan details |
| `membership_plans` | `membership_plans:archive` | `ORG_OWNER`, `OUTLET_MANAGER` | Soft-delete / retire plans |
| `memberships` | `memberships:create` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Assign new memberships |
| `memberships` | `memberships:read` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `MEMBER` | View memberships |
| `memberships` | `memberships:update` | `ORG_OWNER`, `OUTLET_MANAGER` | Update membership parameters |
| `memberships` | `memberships:activate` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Activate membership |
| `memberships` | `memberships:pause` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Freeze a membership |
| `memberships` | `memberships:resume` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Unfreeze a membership |
| `memberships` | `memberships:suspend` | `ORG_OWNER`, `OUTLET_MANAGER` | Administrative suspension |
| `memberships` | `memberships:cancel` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Cancel a membership |
| `memberships` | `memberships:renew` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST` | Renew term |
| `memberships` | `memberships:check_access` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `STAFF` | Run access policy checks |
| `entitlements` | `entitlements:manage` | `ORG_OWNER`, `OUTLET_MANAGER` | Manage plan entitlements |
| `entitlements` | `entitlements:read` | `ORG_OWNER`, `OUTLET_MANAGER`, `RECEPTIONIST`, `MEMBER` | View entitlements |

---

## 5. Machine-Readable Access Reason Codes

The `MembershipAccessPolicy` emits standard machine-readable reason codes:
- `ACTIVE_MEMBERSHIP`: Authorized facility access.
- `NO_ACTIVE_MEMBERSHIP`: Member has no current active or trial membership in this organisation.
- `MEMBERSHIP_EXPIRED`: Active membership term has ended.
- `MEMBERSHIP_SUSPENDED`: Membership is on administrative suspension.
- `MEMBERSHIP_CANCELLED`: Membership has been terminated.
- `MEMBERSHIP_PAUSED`: Membership is currently on freeze.
- `MEMBERSHIP_PENDING`: Membership is awaiting initial activation.
- `OUTLET_NOT_INCLUDED`: Active membership access scope does not cover the requested outlet.
- `NO_GYM_ACCESS_ENTITLEMENT`: Active plan lacks the requested entitlement (e.g. `GYM_ACCESS`, `SAUNA`).
- `ORGANISATION_MISMATCH`: The requested outlet belongs to an organisation where the member holds no valid membership.
- `MEMBER_NOT_FOUND`: Member profile does not exist.
- `OUTLET_NOT_FOUND`: Requested facility does not exist or is inactive.
