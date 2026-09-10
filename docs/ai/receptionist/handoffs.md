# FitCore AI Receptionist — Staff Handoffs & Routing

## Overview
Staff handoffs transition conversations and calls from the AI Receptionist to human team members when customer requests require staff authority, policy exceptions, complex problem resolution, or direct personal assistance.

```text
Customer requests human / Safety trigger / Policy exception
                     ↓
             Handoff Created
                     ↓
             Context Summarized
                     ↓
          Staff Routing Evaluated
   (BY_ROLE, BY_OUTLET, ROUND_ROBIN)
                     ↓
             Staff Available?
              /            \
           YES              NO
           /                  \
    Live Transfer      Offer Callback /
   Staff Accepts      Follow-Up Task Created
           \                  /
            Outcome Recorded
```

---

## Handoff Priority & Reasons

Handoff priority is calculated deterministically via `HANDOFF_REASON_PRIORITY_MAP`:
- `HIGH`:
  - `COMPLAINT`: Customer dissatisfaction or facility issues.
  - `POLICY_EXCEPTION`: Membership pauses, contract cancellations, or waivers.
  - `PRICING_EXCEPTION`: Discount inquiries and custom quote requests.
  - `TECHNICAL_FAILURE`: Provider or tool execution errors.
  - `BOOKING_FAILURE`: Session capacity or eligibility denial.
- `NORMAL`:
  - `CUSTOMER_REQUESTED`: Explicit user request to talk to staff.
  - `SPECIAL_REQUEST`: Equipment or event requests.
  - `PAYMENT_QUESTION`: Billing questions.
  - `MEMBERSHIP_EXCEPTION`: Tier upgrades or transfers.
  - `COMPLEX_REQUEST`: Multi-step requests exceeding AI capabilities.
  - `IDENTITY_VERIFICATION`: Unverified caller requesting sensitive account records.
- `LOW`:
  - `LOW_CONFIDENCE`: Intent confidence below safety threshold.

---

## Staff Routing & Assignment Invariants

The `ReceptionistRoutingService` evaluates staff assignment according to configured routing rules:
1. **Multi-Tenant Boundary**: Staff must belong to the exact `organisationId`.
2. **Outlet Authorization**: Staff must have an active assignment (`StaffOutletAssignment`) for the target outlet.
3. **Active Employment Invariant**:
   - Only staff with `employmentStatus === 'ACTIVE'` are eligible.
   - **Terminated (`TERMINATED`) and suspended (`SUSPENDED`) staff are strictly prohibited from receiving assignments.**
4. **Role Mapping**:
   - `PRICING_EXCEPTION` / `PAYMENT_QUESTION` $\rightarrow$ `FINANCE`
   - `COMPLAINT` $\rightarrow$ `OUTLET_MANAGER`
   - `CUSTOMER_REQUESTED` / General $\rightarrow$ `RECEPTION`
5. **Round-Robin**: Balances load evenly among active candidates across identical shifts.

---

## Live Transfer & Graceful Fallback

- If live voice telephony transfer is available (`VoiceHandoffService`), the call is bridged directly to the designated staff line.
- If no staff line is configured, staff is unavailable, or live transfer fails:
  - State is recorded as `TRANSFER_FAILED`.
  - Fallback message is spoken/sent:
    > "I'm unable to connect you to a team member right now. Would you like me to take a message or arrange a callback?"
  - A structured `CallbackRequest` and `ReceptionistFollowUpTask` are immediately created.
