# 22 — RBAC & Observability Access Boundaries

## Role-Based Access Matrix

| Role | Access Level | Permitted Endpoints |
|:---|:---|:---|
| **Public / Load Balancer** | Unauthenticated | `/health/live`, `/health/ready` |
| **Member / Trainer** | None | None (403 Forbidden) |
| **Gym Org Owner / Staff** | Tenant Scoped Status | Organisation operational summary only |
| **FitCore Support Operator** | Read-Only Observability | `/observability/health/*`, `/observability/incidents` (Read) |
| **FitCore Superadmin / SRE** | Full Control | Full access to alerts, incident declaration, metrics, SLO definitions, and deployments |

## Multi-Tenant Isolation Rule
Platform operators can view aggregated telemetry and filter by `tenantId`. Gym organisation owners cannot query internal metric endpoints, queue depths, or other organisations' health.
