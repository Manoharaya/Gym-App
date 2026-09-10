# FitCore AI Receptionist — Escalation Engine & Loop Protection

## Overview
The escalation engine provides deterministic safety guardrails preventing conversational loops, repeated tool execution failures, customer frustration, or unauthorized actions on sensitive membership accounts.

---

## Escalation Triggers

| Trigger | Condition | Default Action | Default Reason |
| :--- | :--- | :--- | :--- |
| `CUSTOMER_REQUEST` | Customer asks for human, agent, or staff | `STAFF_HANDOFF` | `CUSTOMER_REQUESTED` |
| `COMPLAINT` | Customer expresses dissatisfaction or service issues | `STAFF_HANDOFF` | `COMPLAINT` |
| `POLICY_EXCEPTION` | Member requests contract override or fee waiver | `STAFF_HANDOFF` | `POLICY_EXCEPTION` |
| `IDENTITY_FAILURE` | Unverified caller queries private account/billing | `STAFF_HANDOFF` | `IDENTITY_VERIFICATION` |
| `REPEATED_FAILURE` | Loop protection limit exceeded | `STAFF_HANDOFF` / `FOLLOW_UP_TASK` | `TECHNICAL_FAILURE` / `TOOL_FAILURE` |
| `LOW_AI_CONFIDENCE` | Intent confidence score $< 0.4$ | `SAFE_RESPONSE` | `LOW_CONFIDENCE` |

---

## Conversational Loop Protection Limits

To prevent infinite loops between the AI and external tools, hard thresholds are enforced:
1. **Consecutive Tool Failures**:
   - Limit: **3 consecutive failures** (`maxFailures: 3`).
   - If reached, halts automated retry attempts and immediately triggers `STAFF_HANDOFF` with reason `TECHNICAL_FAILURE`.
2. **Repeated Tool Invocations**:
   - Limit: **3 identical tool invocations** (`maxToolCalls: 3`).
   - Prevents recursive search or repeated availability queries; queues a `ReceptionistFollowUpTask`.
3. **Conversation Turn Limits**:
   - Limit: **20 total conversational turns** (`maxTurns: 20`).
   - Prevents open-ended circular conversations; gracefully transfers to human team with `COMPLEX_REQUEST`.

---

## Emergency Medical Boundary

The AI Receptionist is not a medical professional or emergency service:
- Any mention of acute injury, chest pain, difficulty breathing, or physical collapse triggers immediate escalation:
  > "If this is a medical emergency, please dial emergency services immediately. I am alerting our club staff now."
- No medical advice, diagnosis, or triage is ever provided.
