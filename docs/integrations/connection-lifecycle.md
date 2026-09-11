# Integration Connection Lifecycle & Multi-Scope Architecture

## Overview

The FitCore Integrations Platform manages connections across four distinct operational scopes, supporting fine-grained tenant isolation and role-based permissions.

---

## 1. Connection Scopes

| Scope | Description | Typical Providers | Required Identifiers |
| :--- | :--- | :--- | :--- |
| **ORGANISATION** | Applies across the entire gym brand | Stripe, Xero, QuickBooks, primary email | `organisationId` |
| **OUTLET** | Hardware or phone numbers assigned to a specific physical branch | Door controllers, turnstiles, branch SMS | `organisationId`, `outletId` |
| **MEMBER** | Personal wearable devices owned by individual members | Fitbit, Apple Health, Health Connect | `organisationId`, `memberId` |
| **STAFF** | Work calendars and personal training booking slots | Google Calendar, Microsoft Outlook | `organisationId`, `staffId` |

---

## 2. Connection Status Lifecycle

```text
       [ CREATE ]
           ↓
       +---------+
       | PENDING | <---------------+
       +---------+                 |
           ↓                       |
    [ AUTHENTICATE ]               |
           ↓                       |
      +-----------+                |
      | CONNECTED | ---------------+
      +-----------+ [ DISCONNECT ] |
       |         ^                 |
[SYNC] |         | [RESOLVE]       |
       v         |                 |
   +---------+   |                 |
   | SYNCING |   |                 |
   +---------+   |                 |
       |         |                 |
 [ERR] v         |                 |
  +----------+   |                 |
  | DEGRADED |---+                 |
  +----------+                     |
       |                           |
[AUTH] v                           |
+-------------------------+        |
| AUTHENTICATION_REQUIRED |--------+
+-------------------------+
```

### Status Descriptions
- `PENDING`: Connection record created; awaiting API credentials or OAuth completion.
- `CONNECTING`: OAuth code exchange or API key verification in progress.
- `CONNECTED`: Valid encrypted credentials stored; health check passed; operational.
- `SYNCING`: Active synchronization job currently executing.
- `DEGRADED`: One or more recent operational requests failed (e.g. 500 error or network glitch).
- `AUTHENTICATION_REQUIRED`: Provider tokens expired or rejected with 401; user must reconnect.
- `DISCONNECTED`: Connection deactivated; credentials securely wiped from storage.
- `REVOKED`: External provider revoked OAuth grants.
- `SUSPENDED`: Administrative policy suspension.
