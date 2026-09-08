# Engagement Automation Security & Safeguards

This document defines the security architecture, multi-tenant boundaries, and automated safeguards governing the FitCore engagement engine.

---

## 1. Multi-Tenant Boundary Enforcement

All automated workflows, versions, instances, and audit logs are strictly isolated by `organisationId`:
- Cross-tenant queries are blocked at both the database and gateway levels.
- Incoming domain trigger events for Organisation B cannot trigger workflows configured under Organisation A.
- Outlet scoping enforces location-specific targeting when `outletId` is configured on the workflow.

---

## 2. Strictly Prohibited Actions (Zero Autonomous Mutations)

To prevent financial loss, operational disruption, and member distress, the workflow engine enforces hard-coded prohibitions:

> [!CAUTION]
> The following actions and parameters are **STRICTLY PROHIBITED** from autonomous workflow execution:
> - `CANCEL_MEMBERSHIP`: Membership terminations must be performed manually by authorized staff.
> - `MODIFY_PRICE`: Pricing cannot be altered by automation.
> - `APPLY_DISCOUNT`: Financial discounts cannot be automatically issued without explicit staff review.
> - `UPDATE_PAYMENT_METHOD`: Payment credentials cannot be manipulated by workflows.
> - `REVOKE_GATE_ACCESS`: Access control overrides cannot be issued or revoked automatically.

Attempting to register any workflow with these actions or parameters immediately throws a `400 Bad Request` validation exception.

---

## 3. Human-in-the-Loop (HITL) Governance

For high-sensitivity workflows, gyms can configure:
- `approvalMode: ALWAYS_REQUIRED`: Every action step in the workflow pauses for human review.
- Action-level `requireApproval: true`: Specific steps (e.g. outreach SMS) pause for staff sign-off.

### Review Workflow:
1. Step enters `AWAITING_APPROVAL`.
2. Appears on mobile staff dashboard under **Approval Queue**.
3. Authorized staff reviews draft message, timing, and member profile.
4. Staff can **Approve** (resumes delivery) or **Reject** with mandatory reason (cancels instance).

---

## 4. Anti-Shaming Brand Protection

Communication actions are scanned for guilt-inducing, degrading, or aggressive language:
- Prohibited terms: `lazy`, `fat`, `failure`, `disappointing`, `shame`, `guilt`, `slacker`, `worthless`, `pathetic`, `disgrace`.
- The system enforces supportive, empathetic, and encouraging language:
  - English: *"We missed you at the gym! Need any help getting back into your routine?"*
  - Nepali: *"नमस्ते Aarav, बितेका दुई हप्तामा तपाईंलाई जिममा देख्न पाइएन! आफ्नो दिनचर्या पुनः सुरु गर्न कुनै मद्दत चाहिन्छ?"*

---

## 5. Rate Limits, Cooldowns & Quiet Hours

1. **Cooldown Scopes**:
   - `MEMBER_AND_WORKFLOW`: Prevents repetitive alerts for the same workflow (e.g. 7-day cooldown on 14-day inactivity).
   - `MEMBER`: Prevents a member from receiving multiple automated sequences simultaneously.
2. **Frequency Caps**:
   - Maximum daily executions per workflow (default 500).
   - Maximum lifetime executions per member for specific flows (e.g., milestone celebration triggers once per milestone).
3. **Quiet Hours Protection**:
   - Nighttime communications are blocked between `22:00` and `07:00` (in the gym's configured timezone).
   - Deferred instances are automatically scheduled to resume at `07:05` the following morning.
