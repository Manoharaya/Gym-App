# Financial Intelligence API Reference

All endpoints are hosted under `/api/v1/financial-intelligence/*` and require standard JWT authentication, tenant headers, and permission guards.

---

## Authentication & Authorization

| Endpoint | Method | Allowed Roles / Scope | Description |
| :--- | :--- | :--- | :--- |
| `/overview` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER`, `MEMBER` (Self-only) | High-level gross, net, refund, outstanding, and currency breakdowns |
| `/trends` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER`, `MEMBER` (Self-only) | Daily/monthly trend data points over selected time range |
| `/outlets` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER` (Current outlet only) | Breakdown of financial performance by outlet |
| `/plans` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER` | Breakdown of revenue contribution by membership plan |
| `/invoices` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER`, `MEMBER` (Self-only) | Invoice counts, paid amounts, and outstanding balances |
| `/refunds` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER` | Refund metrics, rates, and recent refund transactions |
| `/drill-down` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER`, `MEMBER` (Self-only) | Paginated list of detailed financial transactions |
| `/definitions` | `GET` | Authenticated | Canonical definitions and formulas for all metrics |
| `/reconciliation` | `GET` | `SUPERADMIN`, `ORG_OWNER` | Discrepancy detection report between projection and source |
| `/reconciliation/sync` | `POST` | `SUPERADMIN`, `ORG_OWNER` | Idempotent backfill and projection synchronization trigger |
| `/data-quality` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER` | Automated anomaly checks and health score |
| `/context` | `GET` | `SUPERADMIN`, `ORG_OWNER`, `OUTLET_MANAGER` | Structured grounding context for Day 44 AI Assistant |
| `/export` | `GET` | `SUPERADMIN`, `ORG_OWNER` | RFC 4180 compliant CSV export with PII masking |
| `/member/my-finances` | `GET` | `MEMBER`, Authenticated | Member-isolated personal payment history and spending |

---

## Role-Based Scoping & IDOR Defense

- **`TRAINER` Role**: Explicitly rejected with HTTP 403 Forbidden for all organization-wide financial intelligence endpoints.
- **`MEMBER` Role**: Restricted exclusively to personal financial records (`memberId = user.id`). Attempting to query another member's or organization's analytics yields 403 or empty self-scope.
- **`OUTLET_MANAGER` Role**: Strict tenant scoping to the manager's assigned outlet. Query parameters for other outlets are overridden or rejected.
- **`ORGANISATION_OWNER` Role**: Unrestricted visibility across all outlets belonging to their organization. Cross-organization access is blocked by `tenantId` mismatch.
