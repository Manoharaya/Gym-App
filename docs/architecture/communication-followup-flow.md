# Communication & Follow-Up System Integration Flow

## 1. Architectural Relationship

The Follow-Up Module operates as an intelligent client of the Day 28 Communication Engine. It defines **when** and **what** to communicate based on sales sequence logic, while the Communication Engine strictly governs **how** messages are delivered, consented, formatted, and tracked.

```
┌─────────────────────────────────────────────────────────────┐
│                   FITCORE FOLLOW-UP ENGINE                  │
│                                                             │
│  [FollowUpSequenceService]       [FollowUpEligibilityService]│
│  [FollowUpContextService]        [FollowUpSuppressionService]│
│  [FollowUpAiService]             [FollowUpResponseService]   │
│                                                             │
│                 [FollowUpExecutionService]                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                      Requires Approval?
                      ├── YES ──> [Staff Approval Gate]
                      └── NO  ──┐
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│          DAY 28 COMMUNICATION ORCHESTRATOR SERVICE          │
│                                                             │
│  1. Multi-Tenant Recipient Verification                     │
│  2. Channel Consent & Preference Check (SMS/WhatsApp/Email) │
│  3. Template Sanitization & Variable Interpolation          │
│  4. Idempotency Key Validation                              │
│  5. Channel Fallback Evaluation                             │
│  6. Dispatch via Provider Adapter Interface                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      PROVIDER ADAPTERS                      │
│                                                             │
│   WhatsApp API      SMS Gateway      SendGrid Email         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                     Inbound Webhook / Reply
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              INBOUND RESPONSE & STOP HANDLING               │
│                                                             │
│  [FollowUpResponseService]                                  │
│  - Ingests prospect reply                                   │
│  - Evaluates sequence stop conditions                       │
│  - Halts active enrollment (status = STOPPED)               │
│  - Alerts staff / updates lead qualification                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Invariants of the Delivery Boundary

1. **Single Delivery Authority**:
   No code in the follow-up module may directly import or call external communication providers (e.g. Twilio, Meta Graph API, SendGrid). All dispatches must call `communicationOrchestratorService.submitCommunication()`.

2. **Source Reference Linkage**:
   Every submission specifies `sourceReferenceId: execution.id` and passes metadata `{ followUpExecutionId: execution.id }`.
   The returned `communication.id` is permanently linked on `FollowUpStepExecution.communicationId`.

3. **Consent-Gated Fallback**:
   When primary delivery fails or is blocked by channel preference, fallback delivery (e.g. `WHATSAPP` -> `SMS`) is permitted only if the fallback channel has active, verified recipient consent.

4. **Multi-Tenant Isolation**:
   Every request to create sequences, enroll prospects, execute steps, or view responses enforces the calling user's `organisationId` and denies cross-tenant access.
