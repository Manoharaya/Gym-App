# Platform Support System & SLA Governance

## Model Hierarchy
- `SupportTicket`: Organization-scoped support request with priority, category, and target timestamps.
- `SupportTicketMessage`: Threaded conversation record with strict visibility tags.
- `SupportTicketAttachment`: Secure attachment reference (signed URLs only, AV scanned).

## Priority & Internal SLA Targets
| Priority | First Response Target | Resolution Target |
|---|---|---|
| `CRITICAL` | 1 Hour | 4 Hours |
| `URGENT` | 2 Hours | 8 Hours |
| `HIGH` | 4 Hours | 24 Hours |
| `MEDIUM` | 12 Hours | 48 Hours |
| `LOW` | 24 Hours | 72 Hours |

## SLA Status Evaluation
- **WITHIN_TARGET**: Current elapsed time is within target boundary.
- **AT_RISK**: Less than 25% of target SLA duration remains.
- **OVERDUE**: Elapsed time exceeds SLA target without resolution.

## Message Visibility & Isolation
1. **ORGANISATION**: Visible to both organisation administrators and platform staff.
2. **PLATFORM**: Operational communications between internal platform tiers.
3. **INTERNAL_ONLY**: Technical diagnostics, engineer notes, and escalation logs. **Strictly filtered out** server-side when returned to tenant users.
