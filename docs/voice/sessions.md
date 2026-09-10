# Voice Session & Lifecycle State Machine — Day 34

## Call Lifecycle State Machine

A voice call transitions through deterministic lifecycle states:

```text
[RINGING]
   ↓ (Call Answered)
[CONNECTED]
   ↓ (Greeting Spoken)
[ACTIVE] ⇄ [ON_HOLD]
   ├──→ [TRANSFERRING] → [TRANSFERRED] → [COMPLETED]
   ├──→ [ABANDONED] (Caller Hangup Before Resolution)
   ├──→ [FAILED] (Network or Provider Fault)
   └──→ [COMPLETED] (Normal Call Termination)
```

## Turn State Machine

Within an active call, each speech exchange manages turn states:

```text
[WAITING] → [LISTENING] → [THINKING] → [TOOL_EXECUTION] → [SPEAKING] → [WAITING]
                                                               ↓ (Caller Speaks)
                                                          [INTERRUPTED] (Barge-in)
```

## Call Outcomes

Authoritative outcomes assigned upon call completion:
- `INFORMATION_PROVIDED`
- `BOOKING_CREATED`
- `BOOKING_CANCELLED`
- `BOOKING_RESCHEDULED`
- `WAITLIST_JOINED`
- `LEAD_CREATED`
- `LEAD_UPDATED`
- `STAFF_HANDOFF`
- `CALLBACK_REQUESTED`
- `NO_ACTION`
- `FAILED`
- `ABANDONED`
