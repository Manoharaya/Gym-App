# FitCore Membership API Specification

## Base URL
`/api/v1`

All responses follow the standard FitCore API envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "req_...", "timestamp": "2026-09-07T..." }
}
```

---

## 1. Membership Plans Endpoints

### `POST /api/v1/organisations/:orgId/membership-plans`
Creates a new membership plan template.
- **Permission**: `membership_plans:create`
- **Request Body**:
```json
{
  "name": "Second Wind Standard Monthly",
  "code": "SW-STD-MO",
  "description": "Full gym floor access at Second Wind South Melbourne",
  "membershipType": "STANDARD",
  "billingType": "RECURRING",
  "price": 65.00,
  "currency": "AUD",
  "durationValue": 1,
  "durationUnit": "MONTH",
  "defaultAccessScope": "SINGLE_OUTLET",
  "outletIds": ["uuid-south-melbourne"],
  "entitlements": [
    {
      "type": "FACILITY_ACCESS",
      "name": "General Gym Floor",
      "description": "Standard strength and cardio access"
    }
  ]
}
```
- **Response**: `201 Created`

### `GET /api/v1/organisations/:orgId/membership-plans`
Lists membership plans for the organisation.
- **Permission**: `membership_plans:read`
- **Query Parameters**:
  - `page`: default `1`
  - `limit`: default `20`
  - `membershipType`: e.g. `STANDARD`, `TRIAL`
  - `isActive`: `true` / `false`
  - `isPublic`: `true` / `false`
  - `includeArchived`: `true` / `false`

### `GET /api/v1/organisations/:orgId/membership-plans/:planId`
Retrieves a specific plan with entitlements and outlet mappings.
- **Permission**: `membership_plans:read`

### `PATCH /api/v1/organisations/:orgId/membership-plans/:planId`
Updates plan parameters. (Historical member memberships are unaffected due to snapshotting).
- **Permission**: `membership_plans:update`

### `POST /api/v1/organisations/:orgId/membership-plans/:planId/archive`
Soft-deletes / archives a plan so it cannot be assigned to new members.
- **Permission**: `membership_plans:archive`

### `GET /api/v1/organisations/:orgId/membership-plans/public`
Public catalog endpoint for consumer mobile app browsing.
- **Permission**: Authenticated member (or public if unauthenticated browsing enabled).

---

## 2. Member Memberships Endpoints

### `POST /api/v1/organisations/:orgId/memberships`
Staff assigns a membership plan to a member profile.
- **Permission**: `memberships:assign`
- **Request Body**:
```json
{
  "memberProfileId": "uuid-member-profile",
  "membershipPlanId": "uuid-plan",
  "startDate": "2026-09-07T00:00:00Z",
  "accessScope": "SINGLE_OUTLET",
  "outletIds": ["uuid-south-melbourne"],
  "autoRenew": true
}
```

### `GET /api/v1/organisations/:orgId/memberships`
Lists memberships within an organisation with filters.
- **Permission**: `memberships:read`
- **Query Parameters**: `memberProfileId`, `status`, `page`, `limit`

### `GET /api/v1/organisations/:orgId/memberships/:id`
Retrieves a single membership record with outlets, history, and entitlements.
- **Permission**: `memberships:read`

---

## 3. Member Self-Service Endpoints

### `GET /api/v1/memberships/me/active`
Retrieves the currently authenticated member's active or trial membership.
- **Permission**: `MEMBER` role (scoped to self)
- **Response**:
```json
{
  "id": "uuid-membership",
  "status": "ACTIVE",
  "startDate": "2026-09-01T00:00:00.000Z",
  "endDate": "2026-10-01T00:00:00.000Z",
  "autoRenew": true,
  "accessScope": "ALL_ORGANISATION_OUTLETS",
  "planNameAtPurchase": "Second Wind Premium All-Access",
  "priceAtPurchase": 85.00,
  "currencyAtPurchase": "AUD",
  "billingTypeAtPurchase": "RECURRING",
  "plan": {
    "name": "Second Wind Premium All-Access",
    "entitlements": [
      { "type": "FACILITY_ACCESS", "name": "Multi-Facility Access" },
      { "type": "SAUNA", "name": "Infrared Sauna Access" }
    ]
  }
}
```

### `GET /api/v1/memberships/me/history`
Returns historical memberships and lifecycle transition audit logs for the authenticated member.
- **Permission**: `MEMBER` role (scoped to self)

---

## 4. Lifecycle Actions

### `POST /api/v1/organisations/:orgId/memberships/:id/pause`
Freezes a membership temporarily.
- **Permission**: `memberships:pause`
- **Request Body**: `{ "resumesAt": "2026-10-01T00:00:00Z", "reason": "Medical recovery" }`

### `POST /api/v1/organisations/:orgId/memberships/:id/resume`
Unfreezes a paused membership immediately.
- **Permission**: `memberships:resume`

### `POST /api/v1/organisations/:orgId/memberships/:id/cancel`
Terminates a membership.
- **Permission**: `memberships:cancel`
- **Request Body**: `{ "reason": "Relocated out of state" }`

### `POST /api/v1/organisations/:orgId/memberships/:id/renew`
Executes an explicit subscription renewal.
- **Permission**: `memberships:renew`

---

## 5. Facility Access Evaluation

### `POST /api/v1/memberships/check-access`
Evaluates whether a member is authorized to access a specific facility outlet right now.
- **Permission**: `memberships:check_access` (or authenticated staff / turnstile controller)
- **Request Body**:
```json
{
  "memberProfileId": "uuid-member-profile",
  "outletId": "uuid-outlet"
}
```
- **Response Allowed**:
```json
{
  "allowed": true,
  "reason": "Single outlet access granted",
  "membershipId": "uuid-membership",
  "accessScope": "SINGLE_OUTLET"
}
```
- **Response Denied**:
```json
{
  "allowed": false,
  "reason": "Outlet not authorized for this membership",
  "membershipId": "uuid-membership",
  "accessScope": "SINGLE_OUTLET"
}
```
