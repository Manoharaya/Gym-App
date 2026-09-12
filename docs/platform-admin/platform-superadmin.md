# Platform Superadmin & Platform Operations Control Plane

## Executive Overview
The FitCore Platform Superadmin layer serves as the authoritative operational control plane for authorized platform operators. It provides platform-wide observability, tenant lifecycle orchestration, capacity metering, AI gateway governance, support ticketing, feature toggling, and incident handling without compromising tenant isolation, data privacy, or security boundaries.

## Core Architectural Principle
```text
AUTHENTICATE
→ SUPERADMIN PERMISSION
→ PURPOSE / SCOPE
→ SECURITY POLICY
→ ACTION
→ DOMAIN SERVICE
→ AUDIT
→ VERIFY
```

The Superadmin is **never a backdoor around security, privacy, tenant isolation, or consent**. Direct database mutations are strictly prohibited; all mutations flow through domain services with full audit trails.

## Superadmin Role vs Explicit Platform Permissions
Merely having the role `SUPERADMIN` is not sufficient to perform arbitrary platform actions. The control plane enforces explicit platform permissions:

| Permission | Description |
|---|---|
| `platform.organisations.read` | View organisation directory, metadata, and aggregated summaries |
| `platform.organisations.manage` | Activate, suspend, reactivate, or archive organisations |
| `platform.users.read` | Inspect user accounts and platform administrative assignments |
| `platform.usage.read` | Query system-wide and tenant-specific capacity metrics |
| `platform.ai_usage.read` | Monitor AI agent invocations, token volume, and gateway costs |
| `platform.billing.read` | Access SaaS subscription status, limits, and overage visibility |
| `platform.support.manage` | Manage support tickets, SLA tracking, and internal technical notes |
| `platform.feature_flags.manage` | Configure platform-wide and scoped feature rollout flags |
| `platform.configuration.manage` | Update versioned platform settings and maintenance mode |
| `platform.health.read` | Inspect dependency health probes and declared incidents |
| `platform.integrations.read` | Monitor external connector status (Xero, Stripe, Wearables) |
| `platform.operations.execute` | Perform high-risk operations (incidents, support access) |
| `platform.audit.read` | Review platform audit logs with sanitized metadata |
| `platform.security.read` | Inspect security alert trends and risk scores |
| `platform.privacy.read` | Verify privacy compliance queues and processor registrations |
| `platform.announcements.manage` | Publish broadcast notices to organisations |

## Platform Administrative Scopes
- **GLOBAL**: Unrestricted across all platform tenants.
- **ORGANISATION**: Restricted to specific organisations.
- **OUTLET**: Scoped to specific physical facilities.
- **FUNCTIONAL**: Limited by operational domain (e.g. Support-only, Billing-only).
