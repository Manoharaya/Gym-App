# Enterprise Multi-Outlet Administration

## 1. Overview
Outlets represent physical facilities, gym locations, or digital fitness hubs. Enterprise administration extends outlet lifecycle management with brand association, regional classification, dedicated managers, and safe archival protocols.

## 2. Outlet Lifecycle Management
An enterprise outlet transitions through well-defined lifecycle states:
1. `COMING_SOON`: Facility under construction or pre-launch marketing.
2. `ACTIVE`: Fully operational location processing check-ins, memberships, and classes.
3. `MAINTENANCE`: Temporarily restricted or offline for equipment upgrades or renovations.
4. `DELETED` / `ARCHIVED`: Decommissioned location.

### Zero Data Loss Archival
Decommissioning an outlet sets `status = 'DELETED'` and populates `deletedAt = now()`. The system **strictly forbids hard DELETE SQL statements** on outlets, preserving:
* Historical financial ledger records and tax invoices
* Audit log trails and access entry records
* Member attendance statistics and class session logs

## 3. Brand Reassignment & Transfers
Enterprise administrators can transfer an outlet from one brand to another (`POST /api/v1/enterprise/outlets/:id/transfer`).
* Previous brand association is detached.
* New brand association is linked.
* The policy engine automatically invalidates cached configurations and recalculates effective policies based on the new brand hierarchy.
* All changes are recorded with audit logs capturing actor, timestamp, and transfer rationale.
