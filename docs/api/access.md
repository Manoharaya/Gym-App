# FitCore Physical Access & Check-In API Reference (Day 7)

## Base URL
`/api/v1/access`

## Standard Headers
- `Authorization`: `Bearer <jwt_token>`
- `x-organisation-id`: `<organisation_id>`

---

## 1. Access Evaluation & Status

### Check Access Rights
- **Endpoint**: `POST /access/check`
- **Roles**: All authenticated users (evaluates whether a member can access an outlet)
- **Request Body**:
```json
{
  "memberProfileId": "mp_abc123",
  "outletId": "outlet_perth_01",
  "accessPointId": "point_turnstile_01",
  "deviceId": "dev_turnstile_01",
  "credentialReference": "dynamic_token_or_rfid_code"
}
```
- **Response**: `200 OK`
```json
{
  "allowed": true,
  "reason": "ALLOWED",
  "memberProfileId": "mp_abc123",
  "outletId": "outlet_perth_01",
  "timestamp": "2026-09-07T10:00:00.000Z",
  "allowedByOverride": false
}
```

### Get Member Access Status
- **Endpoint**: `GET /access/status`
- **Roles**: Logged-in member (scopes to own `memberProfileId`) or staff specifying `?memberProfileId=...`
- **Response**: `200 OK`
```json
{
  "allowed": true,
  "reason": "ALLOWED",
  "message": "Access Granted: Active Membership",
  "memberProfileId": "mp_abc123",
  "activeMembershipId": "mm_abc123",
  "planName": "Second Wind Premium All-Access",
  "accessScope": "ALL_ORGANISATION_OUTLETS",
  "authorizedOutlets": [
    {
      "id": "outlet_perth_01",
      "name": "Second Wind Perth CBD",
      "code": "SW-PERTH-CBD",
      "city": "Perth",
      "canAccessNow": true
    }
  ],
  "activeVisit": null,
  "hasActiveOverride": false
}
```

---

## 2. Dynamic QR & Credentials

### Generate Dynamic QR Pass
- **Endpoint**: `POST /access/credentials/dynamic-qr`
- **Roles**: Logged-in member
- **Response**: `200 OK`
```json
{
  "credentialId": "cred_dynamic_123",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-09-07T10:01:00.000Z",
  "refreshIntervalSeconds": 60
}
```

### List Credentials
- **Endpoint**: `GET /access/credentials`
- **Roles**: Staff (all in org) or Member (own credentials)
- **Response**: `200 OK` list of credentials (sensitive hashes and secrets omitted)

### Revoke Credential
- **Endpoint**: `POST /access/credentials/:id/revoke`
- **Roles**: `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTION`
- **Response**: `200 OK`

---

## 3. Check-In & Check-Out Operations

### Physical Check-In
- **Endpoint**: `POST /access/check-in`
- **Roles**: Authenticated member or turnstile client
- **Request Body**:
```json
{
  "outletId": "outlet_perth_01",
  "accessPointId": "point_turnstile_01",
  "deviceId": "dev_turnstile_01",
  "method": "DYNAMIC_QR",
  "credentialReference": "dynamic_token_string",
  "deviceEventId": "evt_unique_12345"
}
```
- **Response**: `201 Created`
```json
{
  "allowed": true,
  "reason": "ALLOWED",
  "checkInId": "ci_123",
  "visit": {
    "id": "ci_123",
    "status": "ACTIVE",
    "checkInTime": "2026-09-07T10:00:00.000Z"
  }
}
```

### Physical Check-Out
- **Endpoint**: `POST /access/check-out`
- **Roles**: Authenticated member
- **Request Body**:
```json
{
  "outletId": "outlet_perth_01",
  "checkInId": "ci_123"
}
```
- **Response**: `200 OK` with completed visit and `durationMinutes`.

### Staff Manual Check-In
- **Endpoint**: `POST /access/manual-checkin`
- **Roles**: `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTION`
- **Request Body**:
```json
{
  "memberProfileId": "mp_abc123",
  "outletId": "outlet_perth_01",
  "notes": "Member forgot phone, checked in manually at reception"
}
```
- **Response**: `201 Created`

### Staff Manual Check-Out
- **Endpoint**: `POST /access/manual-checkout`
- **Roles**: `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTION`
- **Request Body**:
```json
{
  "checkInId": "ci_123"
}
```
- **Response**: `200 OK`

---

## 4. Visits & History

### Get Active Visit
- **Endpoint**: `GET /access/visits/active`
- **Roles**: Authenticated member (returns active visit in the organisation or null)

### Get Visit History
- **Endpoint**: `GET /access/visits`
- **Query Params**: `memberProfileId`, `outletId`, `skip`, `take`
- **Roles**: Member views own visits; Staff views facility or member visits.

---

## 5. Staff Access Overrides

### Create Access Override
- **Endpoint**: `POST /access/overrides`
- **Roles**: `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTION`
- **Request Body**:
```json
{
  "memberProfileId": "mp_abc123",
  "outletId": "outlet_perth_01",
  "reason": "MANAGER_APPROVAL",
  "durationHours": 4,
  "notes": "Guest pass approved by club manager"
}
```
- **Response**: `201 Created`

### List Overrides
- **Endpoint**: `GET /access/overrides`
- **Query Params**: `outletId`, `memberProfileId`
- **Roles**: `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTION`

---

## 6. Access Devices & Hardware Events

### Ingest Device Event (Webhook)
- **Endpoint**: `POST /access/devices/events`
- **Headers**: `x-device-token: <secret_device_token>`
- **Request Body**:
```json
{
  "deviceId": "dev_turnstile_01",
  "deviceEventId": "evt_reader_1001",
  "rawCredential": "dynamic_token_or_wiegand_rfid",
  "credentialType": "DYNAMIC_QR",
  "direction": "ENTRY",
  "timestamp": "2026-09-07T10:00:00.000Z"
}
```
- **Response**: `200 OK`
```json
{
  "allowed": true,
  "unlockSignal": true,
  "unlockDurationMs": 5000,
  "reason": "ALLOWED"
}
```
