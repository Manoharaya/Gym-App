# AI Finance Assistant Verification & Testing Strategy

## Test Coverage Overview

The AI Finance Assistant is backed by a comprehensive end-to-end integration test suite (`test/finance-assistant.e2e-spec.ts`) validating 26+ test cases across 8 test suites:

---

## Test Suites

1. **Suite 1: Query Answering in English & Nepali**
   - Revenue query in English returns grounded gross and net revenue.
   - Nepali query ("यो महिना कति आम्दानी भयो?") correctly classifies intent and returns culturally appropriate, grounded facts.
   - Recurring billing collection rate query returns accurate dunning and active schedule counts.
   - Outstanding balances query returns correct debtor sums.

2. **Suite 2: Grounding Validator & Hallucination Prevention**
   - Validates that server-side validator flags and rejects fabricated monetary values.
   - Validates that verified numbers retain `isGrounded: true`.

3. **Suite 3: Safety Guardrails & Adversarial Defences**
   - Prompt injection attempts ("ignore instructions", "drop tables") are rejected with 200 OK safe responses.
   - Action mutations ("refund this invoice") are declined with read-only redirection.
   - Future forecasting queries ("how much will we make next quarter?") refuse speculative predictions.
   - Tax queries include mandatory statutory disclaimer.

4. **Suite 4: Role-Based Access Control & Tenant Isolation**
   - Trainers attempting access receive `403 Forbidden`.
   - Members querying organization finances receive `403 Forbidden`.
   - Outlet Managers querying unauthorized outlets receive `403 Forbidden`.
   - Cross-organization queries are blocked.

5. **Suite 5: Comparison Engine & Zero-Division Safety**
   - Compares metrics across two periods.
   - Baseline zero handled gracefully with `direction: 'NOT_COMPARABLE'` and `percentageDifference: null`.

6. **Suite 6: Conversation Session Management**
   - Creates conversation session.
   - Appends messages and verifies multi-turn retrieval.

7. **Suite 7: User Feedback & Audit Logging**
   - Submits 1–5 star rating and feedback tag.
   - Records AI audit events for compliance tracking.

8. **Suite 8: Regression Matrix**
   - Verifies 0 regressions across Day 43 (Accounting), Day 42 (Recurring Billing), Day 41 (Financial Intelligence), Day 40 (Sales Intelligence), and Day 6 (Payments).
