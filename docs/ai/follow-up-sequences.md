# Follow-Up Sequences & Lifecycle Management

## 1. Sequence Types & Use Cases

FitCore provides 6 canonical, version-controlled sequence templates out of the box, with full support for custom organization-level sequences:

| Sequence Type | Trigger Event | Primary Channel | Steps | Goal |
|---|---|---|---|---|
| `LEAD_FOLLOW_UP` | `LEAD_CAPTURED` | WhatsApp / SMS | Day 0 (0m), Day 1 (24h), Day 3 (72h), Day 7 (168h) | Qualify & schedule gym tour/trial |
| `MISSED_CALL` | `MISSED_CALL_LOGGED` | WhatsApp / SMS | Immediate (2m), Day 1 (24h) | Re-engage caller & answer questions |
| `TRIAL_FOLLOW_UP` | `TRIAL_ATTENDED` | WhatsApp / Email | Day 0 (+2h), Day 2 (48h) | Collect workout feedback & offer membership |
| `TOUR_FOLLOW_UP` | `TOUR_COMPLETED` | WhatsApp / SMS | Day 0 (+1h), Day 2 (48h) | Answer facility questions & secure sign-up |
| `QUALIFIED_LEAD` | `LEAD_QUALIFIED` | WhatsApp / Phone | Day 0 (+15m), Day 2 (48h) | Fast-track high-intent prospect to tour/trial |
| `OFFER_FOLLOW_UP` | `OFFER_SENT` | Email / WhatsApp | Day 1 (24h), Day 3 (72h) | Nudge offer decision before expiration |

---

## 2. Sequence Architecture & Versioning

Every sequence adheres to an immutable versioning architecture:

```
FollowUpSequence (Organisation / Outlet Scope)
    │
    ├── FollowUpSequenceVersion (v1, ACTIVE)
    │       ├── Step 1: Day 0 (0m, WHATSAPP, auto)
    │       ├── Step 2: Day 1 (1440m, SMS, auto)
    │       ├── Step 3: Day 3 (4320m, EMAIL, requires approval)
    │       └── Step 4: Day 7 (10080m, WHATSAPP, auto)
    │
    └── FollowUpSequenceVersion (v2, DRAFT)
            └── Modified steps / delays
```

### Version Immutability Rules
1. Once a sequence version has active enrollments (`ACTIVE`), its steps and delay configurations cannot be mutated in place.
2. Changes to an active sequence produce a new incremented version (`versionNumber + 1`).
3. Existing active enrollments continue on the version they were enrolled under to prevent inconsistent execution states.
4. New enrollments automatically bind to the latest `ACTIVE` version.

---

## 3. Step Execution Delays & Fallbacks

Delays are configured in integer minutes:
- **Immediate / Day 0**: `0` or `2` minutes (e.g. immediate missed-call or lead response)
- **Day 1**: `1440` minutes (24 hours)
- **Day 2**: `2880` minutes (48 hours)
- **Day 3**: `4320` minutes (72 hours)
- **Day 7**: `10080` minutes (7 days)

### Channel Fallback Rules
Each step can specify a `fallbackChannel` (e.g. `WHATSAPP` with fallback to `SMS`).
When executing through Day 28 `CommunicationOrchestratorService`:
- If the primary channel is suppressed (e.g. WhatsApp unconsented or phone unreachable), the engine evaluates consent for the fallback channel.
- If consented, the step dispatches via the fallback channel and records `channel: 'SMS'` with metadata indicating fallback dispatch.

---

## 4. Automatic Stop Conditions

Every sequence version configures deterministic stop rules:
- `stopOnReply: true`: An inbound prospect response stops the sequence immediately.
- `stopOnBooking: true`: A confirmed tour, trial, or class booking terminates the sequence.
- `stopOnConversion: true`: Lead transition to `CONVERTED` or opportunity `WON` stops the sequence.
- `stopOnStaffHandoff: true`: Any manual human staff intervention or takeover halts automation.

When stopped:
1. Enrollment status changes to `STOPPED`.
2. `stopReason` is recorded (`REPLY_RECEIVED`, `BOOKING_CONFIRMED`, `CONVERTED`, `STAFF_TAKEOVER`, `MANUAL_STOP`).
3. Pending scheduled steps are marked `CANCELLED`.
4. Audit event `FOLLOW_UP_ENROLLMENT_STOPPED` is permanently emitted.
