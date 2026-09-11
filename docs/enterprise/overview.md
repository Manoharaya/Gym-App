# FitCore Enterprise Administration — Architectural Overview

## 1. Executive Summary

FitCore Enterprise Administration (Day 51) provides a production-grade governance and multi-outlet management layer designed for large-scale fitness networks, franchise systems, multi-brand conglomerates, and regional operators.

The enterprise layer transforms FitCore from single-site operations into an enterprise-ready platform capable of governing hundreds of outlets across multiple brands and territories, while strictly preserving core domain boundaries (Authentication, RBAC, Tenancy, Memberships, Payments, Bookings, AI Platform, Communications, and Financial Ledgers).

---

## 2. Core Architecture Pillars

```
+-------------------------------------------------------------------------------+
|                       PLATFORM & SUPERADMIN GOVERNANCE                        |
+-------------------------------------------------------------------------------+
                                        |
+-------------------------------------------------------------------------------+
|                             ENTERPRISE ORGANISATION                           |
|  - Enterprise Admin, Compliance, Finance, Analytics Managers                  |
|  - Global Hard Security Ceilings (MFA, AI Safety, Data Retention, API Limits)  |
|  - Centralized Configurations, Custom Domains, Governance Health Score         |
+-------------------------------------------------------------------------------+
                   |                                           |
+-------------------------------------+     +-----------------------------------+
|        BRAND 1: FitCore Elite       |     |      BRAND 2: CorePulse Studio    |
|  - Brand Manager, Scoped Roles      |     |  - Brand Manager, Scoped Roles    |
|  - Brand Policies, Logos, Palettes  |     |  - Brand Policies, Visual Themes  |
+-------------------------------------+     +-----------------------------------+
          |                    |                            |
+-------------------+ +-------------------+        +-------------------+
| REGION: WA Outlets| | REGION: NSW Outlets|        | REGION: VIC Outlets|
| - Regional Manager| | - Regional Manager|        | - Regional Manager|
+-------------------+ +-------------------+        +-------------------+
          |                    |                            |
+-------------------+ +-------------------+        +-------------------+
| OUTLET: Perth CBD | | OUTLET: Fremantle |        | OUTLET: Sydney     |
| - Outlet Manager  | | - Outlet Manager  |        | - Outlet Manager  |
| - Local Overrides | | - Local Overrides |        | - Local Overrides |
+-------------------+ +-------------------+        +-------------------+
```

### Key Pillars:
1. **Multi-Brand Hierarchy**: Outlets grouped under distinct brands with isolated visual identities and marketing policies.
2. **Deterministic Policy Inheritance**: Cascading policy resolution (`ORGANISATION` -> `BRAND` -> `REGION` -> `OUTLET`) with immutable parent hard security ceilings.
3. **Scoped Role Delegation**: 6 enterprise roles with fine-grained spatial and organizational scopes (`PLATFORM`, `ORGANISATION`, `BRAND`, `REGION`, `OUTLET`).
4. **Privilege Escalation Defense**: Strict hierarchical rank verification preventing lower-tier administrators from creating or revoking higher-tier roles.
5. **Custom Domain Routing**: DNS challenge token generation (`_fitcore-challenge`), CNAME routing, and automatic SSL certificate status lifecycle tracking.
6. **Zero Data Loss Archival**: Outlets and brands are soft-deactivated with preserved ledger and audit history.
