# Sales Pipeline Domain Events & Automation Integration

## 1. Domain Events Reference
The sales pipeline publishes domain events to the Day 30 `WorkflowEngineService` with idempotency guarantees (`sales-*-{id}-{version}`):

| Event Type | Trigger | Key Payload Attributes |
|---|---|---|
| `sales.opportunity.created` | New deal initialized | `opportunityId`, `leadId`, `pipelineId`, `title`, `estimatedValue` |
| `sales.opportunity.stage_changed` | Atomic stage transition | `opportunityId`, `leadId`, `fromStage`, `toStage`, `actorType`, `actorId`, `durationSeconds` |
| `sales.opportunity.converted` | Authoritative conversion verified | `opportunityId`, `leadId`, `estimatedValue` |
| `sales.opportunity.lost` | Deal marked as lost | `opportunityId`, `leadId`, `lossReason`, `lossReasonDetails` |
| `sales.activity.logged` | Interaction logged | `opportunityId`, `activityType`, `title`, `actorType` |
| `sales.task.created` | Task scheduled | `opportunityId`, `taskTitle`, `priority`, `dueAt` |

---

## 2. Day 30 Workflow Automation Triggers
Downstream workflows can trigger automated follow-up sequences:
- When stage moves to `TRIAL`: trigger welcome SMS with facility entry instructions.
- When stage moves to `OFFERED`: schedule task for staff to check in after 24 hours.
- When marked as `LOST` with reason `PRICE`: schedule 30-day reactivation campaign with promotional trial pass.
