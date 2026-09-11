# Enterprise IP Restrictions & Policies

## Overview
Organisations can restrict access to selected sensitive surfaces by configuring IP allowlists or denylists using standard CIDR notations.

---

## Protected Surfaces
- `ADMIN_LOGIN`: Administrative sign-in portal.
- `ADMIN_PORTAL`: Central administration dashboard.
- `API`: Developer & Platform APIs.
- `DEVELOPER_PORTAL`: Third-party application management.
- `FINANCE`: Financial and billing configuration.
- `ENTERPRISE_SETTINGS`: Organisation policies and branding.

---

## Hierarchical Inheritance & Hard Ceilings
```text
ORGANISATION (Hard Ceilings Applied)
       ↓
     BRAND
       ↓
    OUTLET
```
- If an Organisation configures an IP DENYLIST rule (e.g. `198.51.100.0/24`), an Outlet **cannot** override this policy to permit traffic from that range.
- All rules are evaluated top-down; parent hard ceilings are immutable.

---

## Fail-Closed Administrative Protection
If IP restriction evaluation encounters an unknown state or error:
- On administrative surfaces (`ADMIN_LOGIN`, `ADMIN_PORTAL`, `FINANCE`, `ENTERPRISE_SETTINGS`): Evaluates to **DENY** (Fail-Closed).
- On normal member surfaces: Follows standard availability policies.
