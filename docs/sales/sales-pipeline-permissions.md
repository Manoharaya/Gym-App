# Sales Pipeline Permissions & Security Architecture

## 1. Multi-Tenant Boundaries
Every sales pipeline, stage, opportunity, history record, task, and activity strictly enforces tenant isolation:
- All queries scope to `organisationId` and optional `outletId`.
- Cross-tenant requests (e.g. Org B querying Org A opportunity) immediately throw `NotFoundException` (IDOR defense).

---

## 2. Role-Based Access Control (RBAC)

| Role | Read Pipeline / Board | Create Opportunities | Transition Stages | Authoritatively Convert | Assign Staff | Configure Pipelines |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `SUPERADMIN` | Full Platform | Yes | Yes | Yes | Yes | Yes |
| `ORGANISATION_OWNER` | Full Org | Yes | Yes | Yes | Yes | Yes |
| `OUTLET_MANAGER` | Outlet Scope | Yes | Yes | Yes | Yes | Outlet Scope |
| `RECEPTION` | Outlet Scope | Yes | Up to `TRIAL` | No (Requires Proof) | Yes | No |
| `TRAINER` | Assigned Scope | No | No | No | No | No |
| `AI_AGENT` (System) | Controlled Tools | Yes | Up to `OFFERED` | **Prohibited** | No | No |

---

## 3. Optimistic Concurrency Invariants
- Every `SalesOpportunity` carries a sequential `version: Int`.
- State transitions must submit the known `version`.
- Any race condition where another actor altered the opportunity increments the version and rejects concurrent modification with `ConflictException` (HTTP 409).
