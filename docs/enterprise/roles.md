# Enterprise Roles & Authority Matrix

## 1. Enterprise Role Hierarchy
Day 51 introduces 6 advanced enterprise roles integrated into the global security hierarchy:

| Role Name | Hierarchy Level | Target Authority & Scope |
| :--- | :---: | :--- |
| `SUPERADMIN` | 100 | Platform-wide root authority |
| `ENTERPRISE_ADMIN` | 90 | Full enterprise organisation administration across all brands and outlets |
| `ORGANISATION_OWNER` | 80 | Corporate business owner and legal signatory |
| `REGIONAL_MANAGER` | 75 | Governance over all outlets in a geographic region (state/territory) |
| `BRAND_MANAGER` | 70 | Brand governance, marketing, and visual identity oversight |
| `OPERATIONS_MANAGER` | 65 | Multi-outlet staffing, resource capacity, and logistics |
| `COMPLIANCE_MANAGER` | 65 | Security policies, data retention, access audit reviews |
| `ANALYTICS_MANAGER` | 65 | Cross-brand business intelligence, financial reporting, benchmarks |
| `OUTLET_MANAGER` | 60 | Day-to-day operations of a single specific outlet |
| `FINANCE` | 50 | Invoicing, payments, and accounting integrations |
| `RECEPTION` / `TRAINER` | 40 | Operational staff and personal trainers |
| `MEMBER` | 10 | End-user gym member |

## 2. Privilege Escalation Defenses
A critical invariant of the enterprise security engine:
* An actor can ONLY assign or revoke roles strictly below their own rank (`actorHighestLevel > targetLevel`).
* An `OUTLET_MANAGER` (Level 60) cannot assign `BRAND_MANAGER` (Level 70) or `REGIONAL_MANAGER` (Level 75).
* Cross-tenant assignment attempts immediately throw `ForbiddenException`.
