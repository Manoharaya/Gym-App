# Enterprise Audit Trail & Governance Reporting

## 1. Overview
Enterprise operations must meet stringent compliance standards (SOC 2, ISO 27001, Privacy Act). Every administrative action in the enterprise layer produces structured, immutable audit log records.

## 2. Event Catalog
* `enterprise.brand.created`, `enterprise.brand.updated`, `enterprise.brand.archived`
* `enterprise.outlet.created`, `enterprise.outlet.updated`, `enterprise.outlet.transferred`, `enterprise.outlet.archived`
* `enterprise.role.assigned`, `enterprise.role.revoked`
* `enterprise.policy.created`, `enterprise.policy.updated`, `enterprise.policy.ceiling_enforced`
* `enterprise.domain.registered`, `enterprise.domain.verified`, `enterprise.domain.deleted`
* `enterprise.branding.configured`
* `enterprise.staff.assigned`, `enterprise.staff.transferred`

## 3. Governance Overview & Export
* `GET /api/v1/enterprise/governance`: Calculates enterprise health score, policy category coverage %, active hard ceilings, and custom domain SSL health.
* `GET /api/v1/enterprise/export`: Generates an audit-ready snapshot of all brands, outlets, policies with full version history, domains, and configurations.
