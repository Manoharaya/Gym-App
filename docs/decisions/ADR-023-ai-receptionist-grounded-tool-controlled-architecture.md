# ADR-023: AI Receptionist Grounded Tool-Controlled Architecture

## Status
Accepted

## Context
As FitCore expands its AI Workforce suite, fitness organisations require an automated, 24/7 receptionist capability to greet visitors, answer membership inquiries, explain class schedules, verify operating hours, and route escalations to front desk staff.

However, deploying an ungrounded LLM directly to customers presents significant operational risks:
1. **Hallucinations**: Inventing non-existent amenities (e.g., Olympic pools, sauna) or offering incorrect pricing discounts.
2. **Multi-Outlet Ambiguity**: For multi-branch organisations, answering location-specific questions without knowing the branch leads to misinformation.
3. **Unauthorized Actions**: Allowing LLMs to mutate bookings, cancel memberships, or issue refunds without human authorization.
4. **Adversarial Injections**: Malicious users attempting system prompt exfiltration or jailbreaks.
5. **Medical Liability**: Users seeking clinical injury diagnoses or pharmaceutical prescriptions.

## Decision
We implement a grounded, tool-controlled AI Receptionist architecture with the following core decisions:

1. **Dual Knowledge Layer**:
   - Structured Gym Data: Live database records for operating hours, active membership plans, class types, trainer rosters, and outlet directories.
   - Unstructured Knowledge Articles: Versioned articles with automated hashing (`ReceptionistKnowledgeSource` & `ReceptionistKnowledgeVersion`).
2. **Deterministic Clarification Triggers**:
   - If an organisation operates multiple outlets and a customer asks a location-specific question without specifying the outlet, the AI Receptionist sets `requiresClarification: true` and requests location disambiguation before answering.
3. **Strict Read-Only Tool Execution Boundaries**:
   - Day 31 prohibits all autonomous mutation tools. Booking, cancellation, and payment changes must be routed through human front desk staff or the standard self-service member app.
4. **Human Handoff & Knowledge Gap Escalation**:
   - Customer complaints and unknown facility questions automatically generate a `ReceptionistHandoff` ticket in the staff triage queue.
   - Unanswered questions record a `ReceptionistKnowledgeGap` entry to guide gym owners on missing content.
5. **Multi-Layered Safety Interceptor**:
   - Input filtering blocks prompt injections and attaches medical safety disclaimers where appropriate.
   - PII filtering strips payment card details and sensitive credentials.
6. **Multilingual First-Class Support**:
   - Full support for English and Nepali (`नमस्ते`), with automatic language detection and natural phrasing.

## Consequences

### Positive
- **High Trust & Grounding**: Every answer is backed by verifiable citations (`sourceType`, `title`, `snippet`).
- **Zero Risk of Unauthorized Mutations**: Strict read-only policy protects revenue and booking integrity.
- **Operational Visibility**: Staff console (`ReceptionistAdminScreen`) enables live conversation monitoring, gap triage, and handoff resolution.
- **Robust Multi-Tenancy**: Complete tenant data isolation across all database queries and knowledge retrieval pipelines.

### Negative / Trade-offs
- Customers cannot perform direct bookings or membership modifications through chat in Day 31 (requires human handoff or redirect to app).
- Voice telephony integrations (SIP/Twilio/Vapi) are deferred to subsequent workforce phases.
