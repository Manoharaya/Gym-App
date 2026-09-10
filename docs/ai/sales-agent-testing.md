# FitCore AI Sales Agent Testing & Verification Guide

## Overview
The FitCore AI Sales Agent Foundation is tested by an end-to-end integration test suite (`test/sales-agent.e2e-spec.ts`) running on Jest against a live PostgreSQL database.

---

## Running the Tests

```bash
# Run the complete Sales Agent integration test suite
pnpm --filter @fitcore/api test -- test/sales-agent.e2e-spec.ts
```

---

## Test Scenarios Matrix

| Test Suite Category | Scenario ID | Description | Key Assertions |
| :--- | :--- | :--- | :--- |
| **1. Profile Configuration** | — | Retrieve and update tenant sales agent personality | `salesStyle: 'PREMIUM'`, custom greeting, tone |
| **2. Lifecycle & Lead Reuse** | — | Attach existing lead or auto-register new lead | No duplicate lead, sets `source: 'AI_RECEPTIONIST'` |
| **3. Consultative Flow** | **Scenario 101** | Prospect expresses strength goal + 3 evenings/week | Identifies intent, extracts schedule, recommends Gold Strength plan |
| **3. Consultative Flow** | **Scenario 102** | Prospect requests trial session | `requestTrial` tool executes, updates lead to `TRIAL_INTEREST` |
| **4. Grounded Business Knowledge** | — | Plan comparison & Operating hours | Entitlements side-by-side comparison, exact hours from DB |
| **5. Pricing Integrity** | **Scenario 103** | Prospect asks for 50% discount | Guardrail refuses unauthorized discount, zero discount records created |
| **6. Medical Safety** | **Scenario 104** | Prospect mentions acute chest pain | Medical refusal, instructs doctor clearance, escalates HIGH priority handoff |
| **7. Human Escalation** | **Scenario 105** | Prospect explicitly asks for human staff | Creates `SalesHandoff` ticket, assigns specialist |
| **8. Receptionist Delegation** | **Scenario 106** | Customer requests immediate class booking | Delegates session to `RECEPTIONIST_BOOKING_ENGINE` |
| **9. Multilingual Support** | **Scenario 107** | Prospect converses in Nepali | Accurate Nepali response with `नमस्ते`, verified pricing, trial options |
| **10. Multi-Tenant Security** | **Security 101-103** | Cross-tenant IDOR attack attempts | Tenant isolation verified; Org B cannot access Org A conversations or plans |
| **11. Staff Dashboard** | — | Dashboard metrics & Unified lead summary | Active conversations count, lead discovered needs, recommended plan, next action |
| **12. Audit Trail** | — | Comprehensive audit trail logging | Logs all conversation, config, trial, and feedback actions |

---

## Regression Testing Commands
After any modifications, ensure zero regressions across related domains:

```bash
# Receptionist Workflow & Production Layer (Day 35)
pnpm --filter @fitcore/api test -- test/receptionist-workflow.e2e-spec.ts

# Voice Receptionist (Day 34)
pnpm --filter @fitcore/api test -- test/voice-receptionist.e2e-spec.ts

# Lead Capture & Qualification (Day 33)
pnpm --filter @fitcore/api test -- test/lead-capture.e2e-spec.ts

# Receptionist Booking (Day 32)
pnpm --filter @fitcore/api test -- test/receptionist-booking.e2e-spec.ts

# Receptionist Foundation (Day 31)
pnpm --filter @fitcore/api test -- test/receptionist.e2e-spec.ts
```
