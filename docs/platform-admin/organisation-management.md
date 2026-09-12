# Organisation Management & Lifecycle Governance

## Lifecycle State Machine
Organisations transition through controlled lifecycle states:
```text
PENDING → TRIAL → ACTIVE ⇄ PAST_DUE
                      ↓          ↓
                  SUSPENDED ←────┘
                      ↓
                  ARCHIVED
```

- **PENDING**: Registered tenant awaiting activation or verification.
- **TRIAL**: Fully functional trial period with defined duration.
- **ACTIVE**: Operational in good standing.
- **PAST_DUE**: Delinquent payment state with ongoing grace period.
- **SUSPENDED**: Operationally frozen. Login blocked; developer APIs and external sync halted. Data preserved.
- **ARCHIVED**: Decommissioned organisation retained for legal compliance periods.

## Pre-Suspension Impact Preview
Before an organisation can be suspended, the control plane compiles an impact preview detailing:
1. Active enrolled members whose member portal access will be paused.
2. Operational physical outlets.
3. Employed staff and personal trainers.
4. Upcoming class and personal training reservations.
5. Current billing and dunning status.
6. Active third-party integrations (Xero, Stripe, Wearables).
7. Registered developer applications and OAuth authorizations.
8. Active marketplace extensions.
9. Outbound automated communication workflows.

## Suspension Policy
Suspension is never destructive:
- Member and staff login attempts are rejected with an account suspension notice.
- Third-party webhook deliveries and API keys are temporarily paused.
- Direct database records, member profiles, and historical financial invoices are **never deleted**.
- Requires high-risk step-up challenge verification and produces a `HIGH` severity `SecurityEvent`.
