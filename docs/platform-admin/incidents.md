# Platform Operational Incidents & Linking

## Incident Lifecycle
```text
DETECTED → INVESTIGATING → IDENTIFIED → MITIGATING → MONITORING → RESOLVED → CLOSED
```

## Severities
- `LOW`: Minor performance degradation, negligible user impact.
- `MEDIUM`: Non-critical integration or secondary feature impacted.
- `HIGH`: Major feature outage affecting multiple organisations.
- `CRITICAL`: System-wide outage, database downtime, or security incident.

## Incident Linking
Incidents link directly to underlying operational artifacts:
- Support tickets submitted by affected tenants.
- Provider outages (e.g. Stripe, OpenAI).
- Failed worker jobs and queue backlogs.
- Health check probe alerts.
- Security events.
