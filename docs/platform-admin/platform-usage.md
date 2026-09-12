# Platform Usage Metering & Analytics Projections

## Overview
The platform usage layer aggregates live capacity metrics across primary domain systems. Usage metrics are derived exclusively from authentic domain records and projected into periodic snapshots (`PlatformUsageSnapshot`) for analytical query efficiency.

## Metric Catalog
| Metric Key | Unit | Aggregation | Source Entity | Tenant Scope |
|---|---|---|---|---|
| `ACTIVE_MEMBERS` | COUNT | COUNT | `MemberProfile` (status: ACTIVE) | Organisation |
| `ACTIVE_OUTLETS` | COUNT | COUNT | `Outlet` (status: ACTIVE) | Platform |
| `STAFF_USERS` | COUNT | COUNT | `StaffProfile` (employmentStatus: ACTIVE) | Organisation |
| `BOOKINGS` | COUNT | COUNT | `Booking` | Outlet |
| `CHECK_INS` | COUNT | COUNT | `CheckIn` | Outlet |
| `WORKOUTS` | COUNT | COUNT | `Workout` | Organisation |
| `AI_REQUESTS` | REQUESTS | COUNT | `AIRequest` | Organisation |
| `AI_TOKENS` | TOKENS | SUM | `AIUsageRecord` (totalTokens) | Organisation |
| `VOICE_MINUTES` | MINUTES | SUM | `VoiceSession` (durationSeconds / 60) | Organisation |
| `SMS_MESSAGES` | MESSAGES | COUNT | `Communication` (channel: SMS) | Organisation |
| `WHATSAPP_MESSAGES` | MESSAGES | COUNT | `Communication` (channel: WHATSAPP) | Organisation |
| `EMAIL_MESSAGES` | MESSAGES | COUNT | `Communication` (channel: EMAIL) | Organisation |
| `PUSH_NOTIFICATIONS` | MESSAGES | COUNT | `Communication` (channel: PUSH) | Organisation |
| `WEBHOOK_DELIVERIES` | REQUESTS | COUNT | `WebhookDelivery` | Organisation |
| `INTEGRATIONS` | COUNT | COUNT | `IntegrationConnection` (status: CONNECTED) | Organisation |

## Analytics Snapshot Projection
- **Model**: `PlatformUsageSnapshot`
- **Fields**: `organisationId`, `outletId`, `metricKey`, `value`, `unit`, `periodStart`, `periodEnd`, `dataVersion`.
- **Invariance Rule**: Snapshots are read-projections and are never the authoritative transactional source of truth.
