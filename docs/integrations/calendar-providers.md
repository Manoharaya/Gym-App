# Calendar Integration Architecture

## Overview
FitCore integrates with external calendar services to bridge gym scheduling with staff and trainer external schedules, establishing the foundation for two-way calendar sync.

---

## Supported Scopes

Calendar integrations can be provisioned at multiple scopes:
* **STAFF Scope**: Personal trainer or coach connects their Google Calendar or Microsoft Outlook Calendar. Personal appointments are read as busy slots to avoid double-booking in FitCore.
* **OUTLET Scope**: Outlet connects a shared room/studio resource calendar.

---

## Supported Providers

| Provider | Scope | Auth Mechanism | Capabilities |
|----------|-------|----------------|--------------|
| **Google Calendar** | STAFF / OUTLET | OAuth 2.0 PKCE | Event Creation, Busy Overlay, Free/Busy Query |
| **Microsoft Outlook Calendar** | STAFF / OUTLET | OAuth 2.0 (Graph API) | Calendar Sync, Schedule Discovery, Meeting Invites |

---

## Conflict & Busy Time Synchronization

1. **Outbound Sync**:
   When a member books a Personal Training session or class in FitCore, the integration service creates an event on the trainer's external calendar with gym address, member details, and room location.
2. **Inbound Busy Query**:
   When computing trainer availability (Day 47), the Resource & Capacity Intelligence engine queries the calendar adapter to superimpose external busy intervals onto gym working hours.
